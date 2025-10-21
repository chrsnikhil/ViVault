import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { getSignedUniswapQuote } from '@lit-protocol/vincent-ability-uniswap-swap';
import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';
import { bundledVincentAbility } from '@lit-protocol/vincent-ability-uniswap-swap';
import { ethers } from 'ethers';
import { env } from '../config/env';

export interface SwapQuote {
  quote: unknown; // UniswapQuote type
  signature: string;
  dataSigned: string;
  signerPublicKey: string;
  signerEthAddress: string;
}

export interface SwapParams {
  tokenInAddress: string;
  tokenInAmount: string; // Amount in human-readable format (e.g., "0.001" for 0.001 tokens)
  tokenOutAddress: string;
  recipient: string;
  slippageTolerance?: number; // in basis points (50 = 0.5%, 100 = 1%)
}

export interface SwapResult {
  swapTxHash: string;
  spendTxHash?: string;
}

export interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  token0Symbol?: string;
  token1Symbol?: string;
  token0Decimals?: number;
  token1Decimals?: number;
}

export interface SwapRoute {
  pools: PoolInfo[];
  path: string[];
  expectedOutput: string;
  priceImpact: number;
  gasEstimate: string;
  routeType: 'direct' | 'multi-hop';
}

export class VincentUniswapSwapService {
  private litNodeClient: LitNodeClient;
  private delegateeSigner: ethers.Wallet;
  private rpcUrl: string;
  private provider: ethers.providers.JsonRpcProvider;

  // Base Sepolia Uniswap V3 contract addresses
  private readonly UNISWAP_FACTORY = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24';
  private readonly UNISWAP_ROUTER = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';

  // Uniswap V3 Pool ABI for route discovery
  private readonly POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  ];

  // ERC20 ABI for token info
  private readonly ERC20_ABI = [
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)',
  ];

  constructor(
    rpcUrl: string = 'https://base-sepolia.public.blastapi.io', // Base Sepolia for Uniswap V3
    delegateePrivateKey: string = env.VITE_DELEGATEE_PRIVATE_KEY
  ) {
    this.rpcUrl = rpcUrl;
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.delegateeSigner = new ethers.Wallet(delegateePrivateKey, this.provider);

    // Initialize Lit Node Client exactly as shown in docs
    this.litNodeClient = new LitNodeClient({
      litNetwork: 'datil',
      debug: true,
    });
  }

  /** Initialize the Lit Node Client connection */
  async initialize(): Promise<void> {
    try {
      console.log('🔍 Connecting to Lit Node Client...');
      await this.litNodeClient.connect();
      console.log('✅ Lit Node Client connected successfully');
    } catch (error) {
      console.error('❌ Error connecting to Lit Node Client:', error);
      throw new Error(
        `Failed to connect to Lit Node Client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate a signed Uniswap quote for token swapping Strictly following the documentation
   * implementation
   */
  async getSignedQuote(params: SwapParams): Promise<SwapQuote> {
    await this.initialize();

    console.log('🔍 ===== GENERATING UNISWAP QUOTE =====');
    console.log('🔍 Token In:', params.tokenInAddress);
    console.log('🔍 Amount:', params.tokenInAmount);
    console.log('🔍 Token Out:', params.tokenOutAddress);
    console.log('🔍 Recipient:', params.recipient);
    console.log('🔍 Slippage:', params.slippageTolerance || 50, 'basis points');
    console.log('🔍 RPC URL:', this.rpcUrl);
    console.log('🔍 Uniswap Factory:', this.UNISWAP_FACTORY);
    console.log('🔍 Uniswap Router:', this.UNISWAP_ROUTER);
    console.log('🔍 =====================================');

    try {
      // Generate the signed quote exactly as shown in docs
      // Note: tokenInAmount should be in human-readable format (e.g., "0.001")
      const signedQuote = await getSignedUniswapQuote({
        quoteParams: {
          rpcUrl: this.rpcUrl,
          tokenInAddress: params.tokenInAddress,
          tokenInAmount: params.tokenInAmount, // Already in human-readable format
          tokenOutAddress: params.tokenOutAddress,
          recipient: params.recipient,
          slippageTolerance: params.slippageTolerance || 50, // Default 0.5%
        },
        ethersSigner: this.delegateeSigner,
        litNodeClient: this.litNodeClient as never,
      });

      console.log('✅ Signed quote generated successfully');
      console.log('🔍 Quote signature:', signedQuote.signature);
      console.log('🔍 Signer address:', signedQuote.signerEthAddress);
      return signedQuote;
    } catch (error) {
      console.error('❌ Error generating signed quote:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      throw new Error(
        `Failed to generate Uniswap quote: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Precheck the swap to validate prerequisites Strictly following the documentation implementation */
  async precheckSwap(signedQuote: SwapQuote, delegatorPkpEthAddress: string): Promise<boolean> {
    await this.initialize();

    console.log('🔍 ===== UNISWAP SWAP PRECHECK =====');
    console.log('🔍 Delegator PKP Address:', delegatorPkpEthAddress);
    console.log('🔍 RPC URL for Uniswap:', this.rpcUrl);
    console.log('🔍 Uniswap Factory:', this.UNISWAP_FACTORY);
    console.log('🔍 Uniswap Router:', this.UNISWAP_ROUTER);
    console.log('🔍 =================================');

    try {
      // Create ability client exactly as shown in docs
      const abilityClient = getVincentAbilityClient({
        bundledVincentAbility,
        ethersSigner: this.delegateeSigner,
      });

      // Run precheck exactly as shown in docs
      const precheckResult = await abilityClient.precheck(
        {
          alchemyGasSponsor: false,
          action: 'swap',
          rpcUrlForUniswap: this.rpcUrl,
          signedUniswapQuote: {
            quote: signedQuote.quote as never,
            signature: signedQuote.signature,
          },
        },
        {
          delegatorPkpEthAddress,
        }
      );

      if (precheckResult.success) {
        console.log('✅ Swap precheck passed, ready to execute');
        return true;
      } else {
        // Handle different types of failures exactly as shown in docs
        if (precheckResult.runtimeError) {
          console.error('❌ Runtime error:', precheckResult.runtimeError);
        }
        if (precheckResult.schemaValidationError) {
          console.error('❌ Schema validation error:', precheckResult.schemaValidationError);
        }
        if (precheckResult.result) {
          console.error('❌ Swap precheck failed:', precheckResult.result.reason);
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Error during precheck:', error);
      console.error('❌ Precheck error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      throw new Error(
        `Precheck failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Execute the Uniswap swap Strictly following the documentation implementation */
  async executeSwap(signedQuote: SwapQuote, delegatorPkpEthAddress: string): Promise<SwapResult> {
    await this.initialize();

    console.log('🔍 ===== EXECUTING UNISWAP SWAP =====');
    console.log('🔍 Delegator PKP Address:', delegatorPkpEthAddress);
    console.log('🔍 RPC URL for Uniswap:', this.rpcUrl);
    console.log('🔍 Uniswap Factory:', this.UNISWAP_FACTORY);
    console.log('🔍 Uniswap Router:', this.UNISWAP_ROUTER);
    console.log('🔍 ==================================');

    try {
      // Create ability client exactly as shown in docs
      const abilityClient = getVincentAbilityClient({
        bundledVincentAbility,
        ethersSigner: this.delegateeSigner,
      });

      // Execute the swap exactly as shown in docs
      const executeResult = await abilityClient.execute(
        {
          alchemyGasSponsor: false,
          action: 'swap',
          rpcUrlForUniswap: this.rpcUrl,
          signedUniswapQuote: {
            quote: signedQuote.quote as never,
            signature: signedQuote.signature,
          },
        },
        {
          delegatorPkpEthAddress,
        }
      );

      if (executeResult.success) {
        const result = executeResult.result as SwapResult;
        console.log('✅ Swap executed successfully');
        console.log('🔍 Swap transaction:', result.swapTxHash);
        if (result.spendTxHash) {
          console.log('🔍 Spending limit transaction:', result.spendTxHash);
        }
        return result;
      } else {
        // Handle different types of failures exactly as shown in docs
        if (executeResult.runtimeError) {
          console.error('❌ Runtime error:', executeResult.runtimeError);
        }
        if (executeResult.schemaValidationError) {
          console.error('❌ Schema validation error:', executeResult.schemaValidationError);
        }
        if (executeResult.result) {
          console.error('❌ Swap execution failed:', executeResult.result.reason);
        }
        throw new Error('Swap execution failed');
      }
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      console.error('❌ Execute error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      throw new Error(
        `Swap execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Complete swap workflow: quote -> precheck -> execute */
  async performSwap(params: SwapParams, delegatorPkpEthAddress: string): Promise<SwapResult> {
    console.log('🔍 ===== STARTING COMPLETE SWAP WORKFLOW =====');

    try {
      // Step 1: Generate signed quote
      const signedQuote = await this.getSignedQuote(params);

      // Step 2: Precheck
      const precheckPassed = await this.precheckSwap(signedQuote, delegatorPkpEthAddress);
      if (!precheckPassed) {
        throw new Error('Swap precheck failed');
      }

      // Step 3: Execute
      const result = await this.executeSwap(signedQuote, delegatorPkpEthAddress);

      console.log('✅ Complete swap workflow finished successfully');
      return result;
    } catch (error) {
      console.error('❌ Complete swap workflow failed:', error);
      throw error;
    }
  }

  /** Get token balance for a given address */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address owner) view returns (uint256)'],
        provider
      );

      const balance = await tokenContract.balanceOf(walletAddress);
      return balance.toString();
    } catch (error) {
      console.error('❌ Error getting token balance:', error);
      throw new Error(
        `Failed to get token balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Get ETH balance for a given address */
  async getEthBalance(walletAddress: string): Promise<string> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
      const balance = await provider.getBalance(walletAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('❌ Error getting ETH balance:', error);
      throw new Error(
        `Failed to get ETH balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Discover all available Uniswap V3 pools for a given token pair */
  async discoverPools(tokenA: string, tokenB: string): Promise<PoolInfo[]> {
    console.log('🔍 ===== DISCOVERING UNISWAP V3 POOLS =====');
    console.log('🔍 Token A:', tokenA);
    console.log('🔍 Token B:', tokenB);
    console.log('🔍 RPC URL:', this.rpcUrl);
    console.log('🔍 ======================================');

    const pools: PoolInfo[] = [];
    const fees = [500, 3000, 10000]; // 0.05%, 0.3%, 1% fee tiers

    try {
      const factoryContract = new ethers.Contract(
        this.UNISWAP_FACTORY,
        [
          'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
        ],
        this.provider
      );

      // Check each fee tier for both token orders
      for (const fee of fees) {
        try {
          // Check A -> B
          const poolAddressAB = await factoryContract.getPool(tokenA, tokenB, fee);
          if (poolAddressAB !== ethers.constants.AddressZero) {
            console.log(`🔍 Found pool for fee ${fee} (A->B):`, poolAddressAB);
            const poolInfo = await this.getPoolInfo(poolAddressAB, tokenA, tokenB);
            if (poolInfo) pools.push(poolInfo);
          }

          // Check B -> A
          const poolAddressBA = await factoryContract.getPool(tokenB, tokenA, fee);
          if (poolAddressBA !== ethers.constants.AddressZero && poolAddressBA !== poolAddressAB) {
            console.log(`🔍 Found pool for fee ${fee} (B->A):`, poolAddressBA);
            const poolInfo = await this.getPoolInfo(poolAddressBA, tokenB, tokenA);
            if (poolInfo) pools.push(poolInfo);
          }
        } catch (error) {
          console.warn(`❌ Failed to check fee tier ${fee}:`, error);
          continue;
        }
      }

      console.log(`✅ Found ${pools.length} pools`);
      return pools;
    } catch (error) {
      console.error('❌ Error discovering pools:', error);
      throw new Error(
        `Failed to discover pools: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Get detailed information about a specific pool */
  private async getPoolInfo(
    poolAddress: string,
    token0: string,
    token1: string
  ): Promise<PoolInfo | null> {
    try {
      const poolContract = new ethers.Contract(poolAddress, this.POOL_ABI, this.provider);

      const [fee, liquidity, slot0] = await Promise.all([
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ]);

      // Get token symbols and decimals
      const [token0Symbol, token0Decimals, token1Symbol, token1Decimals] = await Promise.all([
        this.getTokenSymbol(token0),
        this.getTokenDecimals(token0),
        this.getTokenSymbol(token1),
        this.getTokenDecimals(token1),
      ]);

      return {
        address: poolAddress,
        token0,
        token1,
        fee: typeof fee === 'number' ? fee : fee.toNumber(),
        liquidity: liquidity.toString(),
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        tick: slot0.tick,
        token0Symbol,
        token1Symbol,
        token0Decimals,
        token1Decimals,
      };
    } catch (error) {
      console.warn(`❌ Failed to get pool info for ${poolAddress}:`, error);
      return null;
    }
  }

  /** Get token symbol */
  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider);
      return await tokenContract.symbol();
    } catch {
      return 'UNK';
    }
  }

  /** Get token decimals */
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, this.ERC20_ABI, this.provider);
      return await tokenContract.decimals();
    } catch {
      return 18; // Default to 18 decimals
    }
  }

  /** Find all possible swap routes between two tokens */
  async findSwapRoutes(tokenIn: string, tokenOut: string, amountIn: string): Promise<SwapRoute[]> {
    console.log('🔍 ===== FINDING SWAP ROUTES =====');
    console.log('🔍 Token In:', tokenIn);
    console.log('🔍 Token Out:', tokenOut);
    console.log('🔍 Amount In:', amountIn);
    console.log('🔍 ===============================');

    try {
      // First, discover all pools
      const pools = await this.discoverPools(tokenIn, tokenOut);

      if (pools.length === 0) {
        console.log('❌ No pools found for this token pair');
        return [];
      }

      const routes: SwapRoute[] = [];

      // Find direct routes
      for (const pool of pools) {
        if (
          (pool.token0.toLowerCase() === tokenIn.toLowerCase() &&
            pool.token1.toLowerCase() === tokenOut.toLowerCase()) ||
          (pool.token1.toLowerCase() === tokenIn.toLowerCase() &&
            pool.token0.toLowerCase() === tokenOut.toLowerCase())
        ) {
          const route = await this.calculateDirectRoute(pool, tokenIn, tokenOut, amountIn);
          if (route) routes.push(route);
        }
      }

      // Find multi-hop routes (through common tokens like WETH, USDC, LINK, DAI)
      const commonTokens = [
        '0x4200000000000000000000000000000000000006', // WETH
        '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
        '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C8e7d5', // LINK
        '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
      ];

      for (const intermediateToken of commonTokens) {
        if (
          intermediateToken.toLowerCase() === tokenIn.toLowerCase() ||
          intermediateToken.toLowerCase() === tokenOut.toLowerCase()
        ) {
          continue;
        }

        const firstHopPools = pools.filter(
          (pool) =>
            (pool.token0.toLowerCase() === tokenIn.toLowerCase() &&
              pool.token1.toLowerCase() === intermediateToken.toLowerCase()) ||
            (pool.token1.toLowerCase() === tokenIn.toLowerCase() &&
              pool.token0.toLowerCase() === intermediateToken.toLowerCase())
        );

        const secondHopPools = await this.discoverPools(intermediateToken, tokenOut);

        for (const firstPool of firstHopPools) {
          for (const secondPool of secondHopPools) {
            const route = await this.calculateMultiHopRoute(
              [firstPool, secondPool],
              tokenIn,
              tokenOut,
              amountIn
            );
            if (route) routes.push(route);
          }
        }
      }

      // Sort routes by expected output (best first)
      routes.sort((a, b) => parseFloat(b.expectedOutput) - parseFloat(a.expectedOutput));

      console.log(`✅ Found ${routes.length} routes`);
      return routes;
    } catch (error) {
      console.error('❌ Error finding swap routes:', error);
      throw new Error(
        `Failed to find swap routes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Calculate direct route through a single pool */
  private async calculateDirectRoute(
    pool: PoolInfo,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapRoute | null> {
    try {
      // This is a simplified calculation - in production you'd want to use the Uniswap SDK
      // for accurate price calculations
      const amountInWei = ethers.utils.parseUnits(
        amountIn,
        pool.token0.toLowerCase() === tokenIn.toLowerCase()
          ? pool.token0Decimals
          : pool.token1Decimals
      );

      // Simplified output calculation (this is not accurate, just for demonstration)
      const expectedOutput = ethers.utils.formatUnits(
        amountInWei.mul(95).div(100),
        pool.token1.toLowerCase() === tokenOut.toLowerCase()
          ? pool.token1Decimals
          : pool.token0Decimals
      );

      return {
        pools: [pool],
        path: [tokenIn, tokenOut],
        expectedOutput,
        priceImpact: 0.5, // Simplified
        gasEstimate: '150000', // Estimated gas
        routeType: 'direct',
      };
    } catch (error) {
      console.warn('❌ Failed to calculate direct route:', error);
      return null;
    }
  }

  /** Calculate multi-hop route through multiple pools */
  private async calculateMultiHopRoute(
    pools: PoolInfo[],
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapRoute | null> {
    try {
      // Simplified multi-hop calculation
      const path = [tokenIn];
      for (let i = 0; i < pools.length - 1; i++) {
        const pool = pools[i];
        const nextToken =
          pool.token0.toLowerCase() === path[path.length - 1].toLowerCase()
            ? pool.token1
            : pool.token0;
        path.push(nextToken);
      }
      path.push(tokenOut);

      const amountInWei = ethers.utils.parseUnits(amountIn, 18); // Simplified
      const expectedOutput = ethers.utils.formatUnits(amountInWei.mul(90).div(100), 6); // Simplified

      return {
        pools,
        path,
        expectedOutput,
        priceImpact: 1.0, // Higher impact for multi-hop
        gasEstimate: '200000', // Higher gas for multi-hop
        routeType: 'multi-hop',
      };
    } catch (error) {
      console.warn('❌ Failed to calculate multi-hop route:', error);
      return null;
    }
  }
}
