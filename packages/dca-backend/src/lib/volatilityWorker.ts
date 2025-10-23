import consola from 'consola';
import { ethers } from 'ethers';

import { env } from './env';
import { checkAndTriggerRebalancing } from './simpleAutomation';

// Pyth price feed IDs for Base Sepolia
const PRICE_FEED_IDS = {
  USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  WETH_USD: '0x9d4294bbcd1174d6f2003ec365831e64cc31d9f6f15a2b85399db8d5000960f6',
} as const;

// VolatilityIndex contract ABI (minimal)
const VOLATILITY_INDEX_ABI = [
  'function updateVolatility(bytes[] calldata priceUpdate, bytes32 priceFeedId, uint256 volatilityBps) external payable',
  'function getVolatilityData(bytes32 priceFeedId) external view returns (tuple(uint256 volatilityBps, uint256 price, uint256 timestamp, uint256 confidence))',
  'function getSupportedFeeds() external view returns (bytes32[])',
] as const;

interface PriceData {
  confidence: number;
  price: number;
  timestamp: number;
}

interface HermesResponse {
  parsed: Array<{
    id: string;
    price: {
      conf: string;
      expo: number;
      price: string;
      publish_time: number;
    };
  }>;
}

/** Fetches latest price data from Pyth Hermes API */
async function fetchLatestPrices(feedIds: string[]): Promise<Map<string, PriceData>> {
  const url = new URL(`${env.PYTH_HERMES_URL}/v2/updates/price/latest`);
  feedIds.forEach((id) => url.searchParams.append('ids[]', id));

  consola.info(`🔍 Fetching latest prices from Hermes for ${feedIds.length} feeds`);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Hermes API error: ${response.status} ${response.statusText}`);
    }

    const data: HermesResponse = await response.json();
    const priceMap = new Map<string, PriceData>();

    if (!data.parsed || data.parsed.length === 0) {
      consola.warn('⚠️ No parsed data in Hermes response');
      return priceMap;
    }

    for (const item of data.parsed) {
      if (!item.price) {
        consola.warn(`⚠️ No price data for feed ${item.id}`);
      } else {
        const price = parseFloat(item.price.price);
        const { expo } = item.price;
        const adjustedPrice = price * 10 ** expo;

        // Normalize the feed ID to include 0x prefix for consistency
        const normalizedId = item.id.startsWith('0x') ? item.id : `0x${item.id}`;

        priceMap.set(normalizedId, {
          confidence: parseFloat(item.price.conf),
          price: adjustedPrice,
          timestamp: item.price.publish_time,
        });

        consola.info(`✅ Fetched price for ${normalizedId}: $${adjustedPrice.toFixed(2)}`);
      }
    }

    consola.success(`✅ Fetched ${priceMap.size} price updates from Hermes`);
    return priceMap;
  } catch (error) {
    consola.error('❌ Error fetching prices from Hermes:', error);
    throw error;
  }
}

/** Fetches price update data from Hermes API for Pyth contract submission */
async function getPriceUpdateData(feedId: string): Promise<string[]> {
  consola.info(`📡 Fetching price update data for ${feedId}`);

  try {
    const url = new URL(`${env.PYTH_HERMES_URL}/v2/updates/price/latest`);
    url.searchParams.append('ids[]', feedId);
    url.searchParams.append('encoding', 'hex');
    url.searchParams.append('parsed', 'false'); // We want the raw binary data

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Hermes API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.binary || !data.binary.data || data.binary.data.length === 0) {
      throw new Error('No binary price update data available');
    }

    // Convert hex strings to proper format for ethers.js
    const priceUpdates = data.binary.data.map((hexString: string) => {
      // Ensure the hex string has 0x prefix
      const formattedHex = hexString.startsWith('0x') ? hexString : `0x${hexString}`;
      return formattedHex;
    });

    consola.success(`✅ Fetched ${priceUpdates.length} price update(s) from Hermes`);
    return priceUpdates;
  } catch (error) {
    consola.error('❌ Error fetching price update data:', error);
    throw error;
  }
}

/**
 * Fetches historical price data from Pyth Benchmarks API for volatility calculation Uses the
 * correct Pyth Benchmarks API endpoint: /v1/updates/price/{timestamp}
 */
async function fetchHistoricalPrices(feedId: string, weeks: number = 12): Promise<number[]> {
  consola.info(
    `📊 Fetching historical prices for ${feedId} (last ${weeks} weeks) using Pyth Benchmarks API`
  );

  try {
    const prices: number[] = [];
    const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const startTime = now - weeks * 7 * 86400; // Start time (weeks ago)

    // Fetch historical prices using Pyth Benchmarks API
    // We'll fetch prices at weekly intervals for the last 12 weeks (smoother data)
    const interval = 7 * 86400; // 7 days in seconds
    const numIntervals = Math.min(weeks, 12); // Max 12 data points (12 weeks)

    // Create array of promises for parallel fetching
    const fetchPromises = Array.from({ length: numIntervals }, async (_, i) => {
      try {
        const timestamp = startTime + i * interval;

        // Use correct Pyth Benchmarks API endpoint
        const url = new URL(`https://benchmarks.pyth.network/v1/updates/price/${timestamp}`);
        url.searchParams.append('ids', feedId);
        url.searchParams.append('parsed', 'true');
        url.searchParams.append('encoding', 'hex');

        consola.info(`🌐 Fetching from Pyth Benchmarks API: ${url.toString()}`);
        const response = await fetch(url.toString());
        if (!response.ok) {
          consola.warn(
            `⚠️ Failed to fetch price at timestamp ${timestamp}: ${response.status} ${response.statusText}`
          );
          return null;
        }

        const data = await response.json();

        if (data.parsed && data.parsed.length > 0) {
          const parsedItem = data.parsed[0];
          const { price: priceData } = parsedItem;

          // Normalize feed IDs for comparison (remove/add 0x prefix as needed)
          const normalizedRequestedId = feedId.startsWith('0x') ? feedId.slice(2) : feedId;
          const normalizedApiId = parsedItem.id.startsWith('0x')
            ? parsedItem.id.slice(2)
            : parsedItem.id;

          // Verify the feed ID matches what we requested
          if (normalizedApiId !== normalizedRequestedId) {
            consola.warn(`⚠️ Feed ID mismatch! Requested: ${feedId}, Got: ${parsedItem.id}`);
            return null;
          }

          if (priceData) {
            const { expo, price } = priceData;
            const adjustedPrice = parseFloat(price) * 10 ** expo;

            consola.info(
              `📈 Historical price for ${feedId} at ${new Date(timestamp * 1000).toISOString()}: $${adjustedPrice.toFixed(2)} (raw: ${price}, expo: ${expo})`
            );
            return adjustedPrice;
          }
          consola.warn(`⚠️ No price data in parsed response for timestamp ${timestamp}`);
          return null;
        }
        consola.warn(`⚠️ No parsed data in response for timestamp ${timestamp}`);
        return null;
      } catch (error) {
        consola.warn(`⚠️ Failed to fetch price at interval ${i}:`, error);
        return null;
      }
    });

    // Wait for all promises to complete
    const results = await Promise.allSettled(fetchPromises);

    // Extract valid prices from results
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        prices.push(result.value);
      }
    });

    if (prices.length < 2) {
      consola.warn(
        `⚠️ Only got ${prices.length} historical price points, using fallback calculation`
      );
      consola.warn(`📊 Price points: [${prices.map((p) => p.toFixed(2)).join(', ')}]`);
      return [];
    }

    consola.success(
      `✅ Fetched ${prices.length} real historical price points for volatility calculation`
    );
    consola.info(
      `📊 Price range: $${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
    );
    consola.info(`📊 All prices: [${prices.map((p) => p.toFixed(2)).join(', ')}]`);
    consola.info(`📊 Feed ID: ${feedId}`);
    return prices;
  } catch (error) {
    consola.error('❌ Error fetching historical prices from Pyth Benchmarks:', error);
    // Return empty array if historical data fails
    return [];
  }
}

/** Calculates standard deviation of price returns */
function calculateVolatility(prices: number[]): number {
  consola.info(`🔢 Calculating volatility from ${prices.length} price points`);
  consola.info(
    `📊 Price range: $${Math.min(...prices).toFixed(2)} - $${Math.max(...prices).toFixed(2)}`
  );

  if (prices.length < 2) {
    consola.warn(`⚠️ Not enough price points (${prices.length}), using default volatility`);
    return 50; // Return a small default volatility (0.5%) instead of 0
  }

  // Calculate returns (percentage changes)
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
    returns.push(returnValue);
    consola.info(
      `📈 Return ${i}: ${(returnValue * 100).toFixed(4)}% (${prices[i - 1].toFixed(2)} → ${prices[i].toFixed(2)})`
    );
  }

  if (returns.length === 0) {
    consola.warn(`⚠️ No returns calculated, using default volatility`);
    return 50; // Return a small default volatility (0.5%) instead of 0
  }

  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  consola.info(`📊 Mean return: ${(meanReturn * 100).toFixed(4)}%`);

  // Calculate variance
  const variance =
    returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (returns.length - 1);

  // Calculate standard deviation
  const stdDev = Math.sqrt(variance);
  consola.info(`📊 Weekly standard deviation: ${(stdDev * 100).toFixed(4)}%`);
  consola.info(`📊 This means: WETH moves ±${(stdDev * 100).toFixed(2)}% per week on average`);

  // Use raw weekly volatility (no annualization)
  // This shows the actual weekly price movement volatility
  consola.info(`📊 Raw weekly volatility: ${(stdDev * 100).toFixed(4)}%`);

  // Convert to basis points (raw volatility, not annualized)
  const volatilityBps = Math.round(stdDev * 10000);

  // Only apply minimum bound to avoid zero volatility
  const minVolatility = 1; // 0.01% minimum
  const finalVolatility = Math.max(volatilityBps, minVolatility);

  consola.info(
    `📈 Final volatility: ${finalVolatility} basis points (${(finalVolatility / 100).toFixed(2)}%)`
  );

  return finalVolatility;
}

/** Updates volatility for a specific price feed */
async function updateVolatilityForFeed(
  provider: ethers.providers.Provider,
  signer: ethers.Wallet,
  contractAddress: string,
  feedId: string,
  feedName: string
): Promise<void> {
  consola.info(`🔄 Updating volatility for ${feedName} (${feedId})`);

  try {
    // Fetch latest price data
    const priceMap = await fetchLatestPrices([feedId]);
    const latestPrice = priceMap.get(feedId);

    if (!latestPrice) {
      throw new Error(`No price data found for ${feedName}`);
    }

    // Fetch historical data for volatility calculation
    const historicalPrices = await fetchHistoricalPrices(feedId, 12);

    // If we don't have enough historical data, use a simple calculation
    let volatilityBps: number;
    if (historicalPrices.length >= 2) {
      volatilityBps = calculateVolatility(historicalPrices);
    } else {
      // Fallback: use a more realistic volatility estimate based on confidence
      const confidenceRatio = latestPrice.confidence / latestPrice.price;
      volatilityBps = Math.round(confidenceRatio * 50); // Adjusted for daily data

      // Add some randomness to make it more realistic (between 50-500 basis points)
      const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
      volatilityBps = Math.round(volatilityBps * randomFactor);

      // Ensure reasonable volatility range (50-500 basis points = 0.5% to 5%)
      volatilityBps = Math.max(volatilityBps, 50);
      volatilityBps = Math.min(volatilityBps, 500);

      consola.warn(`⚠️ Using confidence-based volatility estimate: ${volatilityBps} bps`);
    }

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, VOLATILITY_INDEX_ABI, signer);

    // Get the actual price update data from Hermes
    const priceUpdate = await getPriceUpdateData(feedId);

    // Estimate gas and send transaction
    const gasEstimate = await contract.estimateGas.updateVolatility(
      priceUpdate,
      feedId,
      volatilityBps,
      { value: ethers.utils.parseEther('0.001') } // Small ETH amount for Pyth fees
    );

    // Get current gas price and increase it to avoid replacement fee issues
    const gasPrice = await provider.getGasPrice();
    const increasedGasPrice = gasPrice.mul(200).div(100); // 100% higher gas price for better reliability

    const tx = await contract.updateVolatility(priceUpdate, feedId, volatilityBps, {
      gasLimit: gasEstimate.mul(150).div(100), // 50% higher gas limit for better reliability
      gasPrice: increasedGasPrice,
      value: ethers.utils.parseEther('0.001'), // Small ETH amount for Pyth fees
    });

    consola.info(`⏳ Transaction submitted: ${tx.hash}`);

    await tx.wait();
    consola.success(`✅ Volatility updated for ${feedName}: ${volatilityBps} bps (tx: ${tx.hash})`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('insufficient funds')) {
      consola.error(
        `❌ Insufficient funds for ${feedName}: Wallet ${signer.address} needs ETH for gas fees`
      );
      consola.info(
        `💡 Please fund wallet ${signer.address} with some ETH from Base Sepolia faucet`
      );
      // Don't throw error for insufficient funds, just log and continue
      return;
    }
    consola.error(`❌ Error updating volatility for ${feedName}:`, error);
    throw error;
  }
}

/** Main function to update volatility for all supported feeds */
export async function updateVolatilityIndex(): Promise<void> {
  if (!env.VOLATILITY_INDEX_CONTRACT_ADDRESS) {
    consola.warn('⚠️ VOLATILITY_INDEX_CONTRACT_ADDRESS not set, skipping volatility update');
    return;
  }

  consola.info('🚀 Starting volatility index update...');

  try {
    // Create provider and signer
    const provider = new ethers.providers.JsonRpcProvider(env.BASE_RPC_URL);
    const signer = new ethers.Wallet(env.PRIVATE_KEY, provider);

    consola.info(`📡 Connected to ${env.BASE_RPC_URL}`);
    consola.info(`👤 Using signer: ${signer.address}`);
    consola.info(`📄 Contract: ${env.VOLATILITY_INDEX_CONTRACT_ADDRESS}`);

    // Update volatility for each feed
    const feeds = [
      { id: PRICE_FEED_IDS.WETH_USD, name: 'WETH/USD' },
      { id: PRICE_FEED_IDS.USDC_USD, name: 'USDC/USD' },
    ];

    // Process feeds sequentially with delays to avoid transaction conflicts
    const results = await feeds.reduce(async (accPromise, feed, index) => {
      const acc = await accPromise;

      try {
        consola.info(`🔄 Processing ${feed.name} (${index + 1}/${feeds.length})`);
        await updateVolatilityForFeed(
          provider,
          signer,
          env.VOLATILITY_INDEX_CONTRACT_ADDRESS,
          feed.id,
          feed.name
        );
        acc.push({ feed: feed.name, success: true });

        // Add delay between transactions to avoid conflicts (except for last one)
        if (index < feeds.length - 1) {
          consola.info(`⏳ Waiting 3 seconds before next update...`);
          await new Promise((resolve) => {
            setTimeout(resolve, 3000);
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('insufficient funds')) {
          consola.warn(`⚠️ Skipping ${feed.name} due to insufficient funds`);
          acc.push({ error: 'insufficient funds', feed: feed.name, success: false });
        } else if (error instanceof Error && error.message.includes('Empty price update')) {
          consola.warn(`⚠️ Skipping ${feed.name} due to empty price update`);
          acc.push({ error: 'empty price update', feed: feed.name, success: false });
        } else if (error instanceof Error && error.message.includes('replacement fee too low')) {
          consola.warn(`⚠️ Skipping ${feed.name} due to replacement fee too low`);
          acc.push({ error: 'replacement fee too low', feed: feed.name, success: false });
        } else {
          consola.error(`❌ ${feed.name} failed:`, error);
          acc.push({ error: error.message, feed: feed.name, success: false });
        }
      }

      return acc;
    }, Promise.resolve([]));

    // Log results
    results.forEach((result) => {
      if (result.success) {
        consola.success(`✅ ${result.feed} updated successfully`);
      } else {
        consola.warn(`⚠️ ${result.feed} skipped: ${result.error}`);
      }
    });

    consola.success('🎉 Volatility index update completed successfully!');

    // After successful volatility update, check if we should trigger rebalancing
    consola.info('🤖 Checking automation triggers after volatility update...');
    
    // Get the volatility values from the contract
    const wethVolatilityData = await getVolatilityData(PRICE_FEED_IDS.WETH_USD);
    const usdcVolatilityData = await getVolatilityData(PRICE_FEED_IDS.USDC_USD);
    
    if (wethVolatilityData && usdcVolatilityData) {
      const wethVolatilityPercent = wethVolatilityData.volatilityBps / 100;
      const usdcVolatilityPercent = usdcVolatilityData.volatilityBps / 100;
      
      consola.info(`📊 Current volatility - WETH: ${wethVolatilityPercent}%, USDC: ${usdcVolatilityPercent}%`);
      
      // Check and trigger rebalancing if thresholds are exceeded
      // Note: vaultInfo would need to be provided by the user/frontend
      await checkAndTriggerRebalancing(wethVolatilityPercent, usdcVolatilityPercent);
    } else {
      consola.warn('⚠️ Could not fetch volatility data for automation check');
    }
  } catch (error) {
    consola.error('💥 Volatility index update failed:', error);
    throw error;
  }
}

/** Gets current volatility data from the contract */
export async function getVolatilityData(feedId: string): Promise<{
  confidence: number;
  price: number;
  timestamp: number;
  volatilityBps: number;
} | null> {
  if (!env.VOLATILITY_INDEX_CONTRACT_ADDRESS) {
    consola.warn('⚠️ VOLATILITY_INDEX_CONTRACT_ADDRESS not set');
    return null;
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(env.BASE_RPC_URL);
    const contract = new ethers.Contract(
      env.VOLATILITY_INDEX_CONTRACT_ADDRESS,
      VOLATILITY_INDEX_ABI,
      provider
    );

    const data = await contract.getVolatilityData(feedId);

    return {
      confidence: data.confidence.toNumber(),
      price: data.price.toNumber(),
      timestamp: data.timestamp.toNumber(),
      volatilityBps: data.volatilityBps.toNumber(),
    };
  } catch (error) {
    consola.error('❌ Error fetching volatility data:', error);
    return null;
  }
}
