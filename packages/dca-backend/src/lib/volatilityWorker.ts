import consola from 'consola';
import { ethers } from 'ethers';

import { env } from './env';

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
        const {expo} = item.price;
        const adjustedPrice = price * 10**expo;

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
 * Fetches historical price data from Pyth Hermes API for volatility calculation Note: This is a
 * simplified implementation. In production, you might want to use the streaming API or a more
 * sophisticated historical data endpoint.
 */
async function fetchHistoricalPrices(feedId: string, hours: number = 24): Promise<number[]> {
  consola.info(`📊 Fetching historical prices for ${feedId} (last ${hours} hours)`);

  // For now, we'll simulate historical data by fetching multiple recent updates
  // In a real implementation, you'd use Hermes historical endpoints or streaming data
  const prices: number[] = [];

  try {
    // Fetch latest price multiple times to simulate historical data
    // In production, use proper historical data endpoints
    const promises = Array.from({ length: Math.min(hours, 10) }, async () => {
      const priceMap = await fetchLatestPrices([feedId]);
      const priceData = priceMap.get(feedId);
      if (priceData) {
        return priceData.price;
      }
      return null;
    });

    const results = await Promise.all(promises);
    const validPrices = results.filter((price): price is number => price !== null);
    prices.push(...validPrices);

    consola.success(`✅ Collected ${prices.length} historical price points`);
    return prices;
  } catch (error) {
    consola.error('❌ Error fetching historical prices:', error);
    // Return empty array if historical data fails
    return [];
  }
}

/** Calculates standard deviation of price returns */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) {
    return 0;
  }

  // Calculate returns (percentage changes)
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const returnValue = (prices[i] - prices[i - 1]) / prices[i - 1];
    returns.push(returnValue);
  }

  if (returns.length === 0) {
    return 0;
  }

  // Calculate mean return
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate variance
  const variance =
    returns.reduce((sum, r) => sum + (r - meanReturn)**2, 0) / (returns.length - 1);

  // Calculate standard deviation
  const stdDev = Math.sqrt(variance);

  // Annualize volatility (assuming hourly data)
  const annualizedVolatility = stdDev * Math.sqrt(365 * 24);

  // Convert to basis points
  const volatilityBps = Math.round(annualizedVolatility * 10000);

  consola.info(
    `📈 Calculated volatility: ${volatilityBps} basis points (${(volatilityBps / 100).toFixed(2)}%)`
  );

  return volatilityBps;
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
    const historicalPrices = await fetchHistoricalPrices(feedId, 24);

    // If we don't have enough historical data, use a simple calculation
    let volatilityBps: number;
    if (historicalPrices.length >= 2) {
      volatilityBps = calculateVolatility(historicalPrices);
    } else {
      // Fallback: use a simple volatility estimate based on confidence
      const confidenceRatio = latestPrice.confidence / latestPrice.price;
      volatilityBps = Math.round(confidenceRatio * 10000); // Convert to basis points
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

    const tx = await contract.updateVolatility(priceUpdate, feedId, volatilityBps, {
      gasLimit: gasEstimate.mul(120).div(100),
      value: ethers.utils.parseEther('0.001'), // Add 20% buffer
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

    const updatePromises = feeds.map(async (feed) => {
      try {
        await updateVolatilityForFeed(
          provider,
          signer,
          env.VOLATILITY_INDEX_CONTRACT_ADDRESS,
          feed.id,
          feed.name
        );
        return { feed: feed.name, success: true };
      } catch (error) {
        if (error instanceof Error && error.message.includes('insufficient funds')) {
          consola.warn(`⚠️ Skipping ${feed.name} due to insufficient funds`);
          return { error: 'insufficient funds', feed: feed.name, success: false };
        }
        if (error instanceof Error && error.message.includes('Empty price update')) {
          consola.warn(`⚠️ Skipping ${feed.name} due to empty price update`);
          return { error: 'empty price update', feed: feed.name, success: false };
        }
        throw error;
      }
    });

    const results = await Promise.allSettled(updatePromises);

    // Log results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          consola.success(`✅ ${result.value.feed} updated successfully`);
        } else {
          consola.warn(`⚠️ ${result.value.feed} skipped: ${result.value.error}`);
        }
      } else {
        consola.error(`❌ ${feeds[index].name} failed:`, result.reason);
      }
    });

    consola.success('🎉 Volatility index update completed successfully!');
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
