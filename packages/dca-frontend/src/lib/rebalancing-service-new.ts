import { ethers } from 'ethers';
import { VincentUniswapSwapService } from './vincent-uniswap-swap';
import { USER_VAULT_ABI, ERC20_ABI } from '../config/contracts';
import { VincentSigner } from './vincent-signer';
import { env } from '../config/env';

export type RebalanceType = 'soft' | 'medium' | 'aggressive';

export interface RebalanceConfig {
  type: RebalanceType;
  percentage: number;
  description: string;
  color: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: string; // Raw wei string from vault
  decimals: number;
}

export interface TokenRebalancePlan {
  tokenAddress: string;
  symbol: string;
  currentBalanceWei: string; // Keep as wei string
  amountToSwapWei: string;   // Keep as wei string
  remainingBalanceWei: string; // Keep as wei string
  decimals: number;
}

export interface RebalancePreview {
  totalTokens: number;
  totalAmountToSwap: string;
  estimatedUSDCReceived: string;
  rebalanceType: RebalanceType;
  tokenPlans: TokenRebalancePlan[];
}

export interface RebalanceResult {
  success: boolean;
  transactionHashes: string[];
  totalUSDCReceived: string;
  errors: string[];
}

export class RebalancingService {
  private swapService: VincentUniswapSwapService;
  private usdcAddress: string;

  // Rebalancing configurations
  public static readonly REBALANCE_CONFIGS: Record<RebalanceType, RebalanceConfig> = {
    soft: {
      type: 'soft',
      percentage: 15,
      description: 'Conservative rebalancing - 15% of each token',
      color: 'bg-green-500'
    },
    medium: {
      type: 'medium', 
      percentage: 40,
      description: 'Moderate rebalancing - 40% of each token',
      color: 'bg-yellow-500'
    },
    aggressive: {
      type: 'aggressive',
      percentage: 70,
      description: 'Aggressive rebalancing - 70% of each token',
      color: 'bg-red-500'
    }
  };

  constructor(swapService: VincentUniswapSwapService) {
    this.swapService = swapService;
    this.usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia
  }

  /**
   * Fetch fresh vault balances using the same logic as the working swap popup
   */
  private async fetchFreshVaultBalances(
    vaultContract: ethers.Contract
  ): Promise<TokenBalance[]> {
    console.log('🔍 Fetching fresh vault balances...');
    
    // Only check the two specific tokens: WETH and USDC
    const specificTokens = [
      '0x4200000000000000000000000000000000000006', // WETH
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
    ];
    
    const freshBalances: TokenBalance[] = [];
    
    for (const tokenAddress of specificTokens) {
      try {
        // Get actual on-chain balance
        const balance = await vaultContract.getBalance(tokenAddress);
        
        if (balance.gt(0)) {
          // Get token info - create contract instance like useVault.ts does
          const provider = vaultContract.provider;
          const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
          const [symbol, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);
          
          freshBalances.push({
            address: tokenAddress,
            symbol: symbol,
            balance: balance.toString(), // Keep as wei string
            decimals: decimals
          });
          
          console.log(`✅ ${symbol}: ${ethers.utils.formatUnits(balance, decimals)}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch balance for token ${tokenAddress}:`, error);
      }
    }
    
    console.log(`🔍 Found ${freshBalances.length} tokens with balances`);
    return freshBalances;
  }

  /**
   * Get rebalance configuration for a given type
   */
  getRebalanceConfig(type: RebalanceType): RebalanceConfig {
    return RebalancingService.REBALANCE_CONFIGS[type];
  }

  /**
   * Get all rebalance configurations
   */
  getAllRebalanceConfigs(): RebalanceConfig[] {
    return Object.values(RebalancingService.REBALANCE_CONFIGS);
  }

  /**
   * Check if a token should be excluded from rebalancing
   */
  shouldExcludeToken(address: string, symbol: string): boolean {
    // Skip USDC tokens
    if (symbol === 'USDC' || address.toLowerCase() === this.usdcAddress.toLowerCase()) {
      return true;
    }
    return false;
  }

  /**
   * Calculate rebalance plan with route validation (for preview)
   */
  async calculateRebalancePlanWithRoutes(
    vaultBalances: TokenBalance[],
    rebalanceType: RebalanceType
  ): Promise<RebalancePreview> {
    // For now, just use the basic calculation
    // In the future, this could include route validation
    return this.calculateRebalancePlan(vaultBalances, rebalanceType);
  }

  /**
   * Test if a token has a valid swap route to USDC
   */
  async testTokenRoute(tokenAddress: string, tokenSymbol: string): Promise<boolean> {
    try {
      // Skip USDC tokens
      if (this.shouldExcludeToken(tokenAddress, tokenSymbol)) {
        return false;
      }

      // For now, assume all non-USDC tokens have routes
      // In the future, this could check actual Uniswap routes
      return true;
    } catch (error) {
      console.warn(`Failed to test route for ${tokenSymbol}:`, error);
      return false;
    }
  }

  /**
   * Calculate rebalance plan - simple and clean
   */
  calculateRebalancePlan(
    vaultBalances: TokenBalance[],
    rebalanceType: RebalanceType
  ): RebalancePreview {
    const config = RebalancingService.REBALANCE_CONFIGS[rebalanceType];
    const percentage = config.percentage;

    console.log('🔍 ===== CALCULATING REBALANCE PLAN =====');
    console.log('🔍 Rebalance Type:', rebalanceType);
    console.log('🔍 Percentage:', percentage);
    console.log('🔍 Vault Balances:', vaultBalances.length);
    console.log('🔍 =====================================');

    const tokenPlans: TokenRebalancePlan[] = [];
    let totalAmountToSwap = 0;

    // Filter out duplicate tokens (keep only the first occurrence of each symbol)
    const uniqueTokens = vaultBalances.filter((token, index, self) => 
      self.findIndex(t => t.symbol === token.symbol) === index
    );

    console.log(`🔍 Filtered ${vaultBalances.length} tokens to ${uniqueTokens.length} unique tokens`);

    for (const token of uniqueTokens) {
      // Skip USDC tokens
      if (token.symbol === 'USDC' || token.address.toLowerCase() === this.usdcAddress.toLowerCase()) {
        console.log(`⏭️ Skipping USDC token: ${token.symbol}`);
        continue;
      }

      // Handle both wei strings and formatted strings
      console.log(`🔍 Processing ${token.symbol}: balance="${token.balance}"`);
      
      let currentBalanceWei: ethers.BigNumber;
      try {
        // Try to parse as wei string first
        currentBalanceWei = ethers.BigNumber.from(token.balance);
        console.log(`🔍 Parsed as wei: ${currentBalanceWei.toString()}`);
      } catch {
        // If that fails, treat as formatted string and convert to wei
        currentBalanceWei = ethers.utils.parseUnits(token.balance, token.decimals);
        console.log(`🔍 Parsed as formatted: ${token.balance} -> ${currentBalanceWei.toString()} wei`);
      }
      
      // Skip zero balance tokens
      if (currentBalanceWei.isZero()) {
        console.log(`⏭️ Skipping zero balance token: ${token.symbol}`);
        continue;
      }

      // Calculate amounts in wei
      const amountToSwapWei = currentBalanceWei.mul(percentage).div(100);
      const remainingBalanceWei = currentBalanceWei.sub(amountToSwapWei);

      // Convert to formatted for display
      const currentBalanceFormatted = parseFloat(ethers.utils.formatUnits(currentBalanceWei, token.decimals));
      const amountToSwapFormatted = parseFloat(ethers.utils.formatUnits(amountToSwapWei, token.decimals));

      console.log(`🔍 ${token.symbol}: ${currentBalanceFormatted} -> swap ${amountToSwapFormatted} (${percentage}%)`);

      // Only include tokens with meaningful amounts to swap
      if (amountToSwapFormatted > 0.001) {
        tokenPlans.push({
          tokenAddress: token.address,
          symbol: token.symbol,
          currentBalanceWei: currentBalanceWei.toString(),
          amountToSwapWei: amountToSwapWei.toString(),
          remainingBalanceWei: remainingBalanceWei.toString(),
          decimals: token.decimals
        });

        totalAmountToSwap += amountToSwapFormatted;
      }
    }

    // Estimate USDC received (simplified)
    const estimatedUSDCReceived = (totalAmountToSwap * 0.8).toFixed(6);

    const preview: RebalancePreview = {
      totalTokens: tokenPlans.length,
      totalAmountToSwap: totalAmountToSwap.toFixed(6),
      estimatedUSDCReceived,
      rebalanceType,
      tokenPlans
    };

    console.log('✅ Rebalance plan calculated:', {
      totalTokens: preview.totalTokens,
      totalAmountToSwap: preview.totalAmountToSwap,
      estimatedUSDCReceived: preview.estimatedUSDCReceived
    });

    return preview;
  }

  /**
   * Execute rebalancing - clean step-by-step process
   */
  async executeRebalancing(
    vaultAddress: string,
    rebalanceType: RebalanceType,
    _vaultBalances: TokenBalance[],
    pkpAddress: string,
    jwt: string
  ): Promise<RebalanceResult> {
    console.log('🚀 ===== EXECUTING REBALANCING =====');
    console.log('🚀 Vault Address:', vaultAddress);
    console.log('🚀 Rebalance Type:', rebalanceType);
    console.log('🚀 PKP Address:', pkpAddress);
    console.log('🚀 =================================');

    const result: RebalanceResult = {
      success: false,
      transactionHashes: [],
      totalUSDCReceived: '0',
      errors: []
    };

    try {
      // Initialize Vincent Signer first
      const vincentSigner = new VincentSigner(
        'https://sepolia.base.org',
        pkpAddress,
        env.VITE_DELEGATEE_PRIVATE_KEY,
        jwt
      );

      const vaultContract = vincentSigner.createContract(vaultAddress, USER_VAULT_ABI);

      // Step 1: Fetch fresh on-chain balances
      const freshBalances = await this.fetchFreshVaultBalances(vaultContract);
      
      // Step 2: Calculate rebalance plan with fresh data
      const plan = this.calculateRebalancePlan(freshBalances, rebalanceType);
      
      if (plan.tokenPlans.length === 0) {
        throw new Error('No tokens to rebalance');
      }

      console.log(`🔍 Executing rebalancing for ${plan.tokenPlans.length} tokens`);

      // Step 2: Process each token
      for (const tokenPlan of plan.tokenPlans) {
        try {
          console.log(`🔄 Processing ${tokenPlan.symbol}...`);
          
          // Step 2a: Withdraw tokens from vault to PKP
          await this.withdrawTokensFromVault(
            vincentSigner,
            vaultContract,
            tokenPlan,
            pkpAddress,
            result
          );

          // Step 2b: Swap tokens on PKP wallet
          await this.swapTokensOnPKP(
            vincentSigner,
            tokenPlan,
            pkpAddress,
            result
          );

          // Step 2c: Transfer USDC back to vault
          await this.transferUSDCToVault(
            vincentSigner,
            vaultContract,
            pkpAddress,
            vaultAddress,
            result
          );

          console.log(`✅ Completed rebalancing for ${tokenPlan.symbol}`);

        } catch (error) {
          const errorMsg = `Failed to process ${tokenPlan.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('❌', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      if (result.transactionHashes.length > 0) {
        result.success = true;
        console.log('✅ Rebalancing completed successfully');
      } else {
        throw new Error('All rebalancing steps failed');
      }

    } catch (error) {
      console.error('❌ Rebalancing failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Step 2a: Withdraw tokens from vault to PKP with auto-sync
   */
  private async withdrawTokensFromVault(
    vincentSigner: VincentSigner,
    vaultContract: ethers.Contract,
    tokenPlan: TokenRebalancePlan,
    pkpAddress: string,
    result: RebalanceResult
  ): Promise<void> {
    console.log(`🔍 Withdrawing ${tokenPlan.symbol} from vault to PKP...`);
    
    const amountWei = ethers.BigNumber.from(tokenPlan.amountToSwapWei);
    const amountFormatted = ethers.utils.formatUnits(amountWei, tokenPlan.decimals);
    
    console.log(`🔍 Amount: ${amountFormatted} ${tokenPlan.symbol} (${amountWei.toString()} wei)`);

    // Step 1: Sync vault balance before checking
    console.log(`🔄 Syncing vault balance for ${tokenPlan.symbol}...`);
    try {
      const syncTx = await vincentSigner.sendContractTransaction(
        vaultContract,
        'syncTokenBalance',
        tokenPlan.tokenAddress
      );
      await syncTx.wait();
      console.log('✅ Vault balance synced:', syncTx.hash);
      result.transactionHashes.push(syncTx.hash);
    } catch (error) {
      console.warn('⚠️ Failed to sync vault balance, proceeding with current balance:', error);
    }

    // Step 2: Check if WETH is supported in vault, if not, deposit a tiny amount to register it
    if (tokenPlan.tokenAddress === '0x4200000000000000000000000000000000000006') {
      const supportedTokens = await vaultContract.getAllSupportedTokens();
      const isWETHSupported = supportedTokens.includes(tokenPlan.tokenAddress);
      
      if (!isWETHSupported) {
        console.log('🔍 WETH not supported in vault, depositing tiny amount to register it...');
        try {
          // Deposit 1 wei of WETH to register it in the vault
          const tinyAmount = ethers.BigNumber.from(1); // 1 wei
          const depositTx = await vincentSigner.sendContractTransaction(
            vaultContract,
            'deposit',
            [tokenPlan.tokenAddress, tinyAmount]
          );
          await depositTx.wait();
          console.log('✅ WETH registered in vault:', depositTx.hash);
          result.transactionHashes.push(depositTx.hash);
                } catch (depositError) {
                  console.warn('⚠️ Failed to register WETH, proceeding with withdrawal:', depositError instanceof Error ? depositError.message : String(depositError));
                }
      }
    }

    // Step 3: Fetch ACTUAL on-chain balance from the vault contract after sync
    const vaultBalance = await vaultContract.getBalance(tokenPlan.tokenAddress);
    console.log('🔍 ACTUAL on-chain vault balance (wei):', vaultBalance.toString());
    console.log('🔍 ACTUAL on-chain vault balance (formatted):', ethers.utils.formatUnits(vaultBalance, tokenPlan.decimals));
    
    // Step 4: Compare with what we're trying to withdraw
    if (vaultBalance.lt(amountWei)) {
      throw new Error(
        `Insufficient vault balance on-chain! Vault has ${ethers.utils.formatUnits(vaultBalance, tokenPlan.decimals)} ${tokenPlan.symbol}, ` +
        `but trying to withdraw ${amountFormatted} ${tokenPlan.symbol}. ` +
        `UI showed: ${ethers.utils.formatUnits(ethers.BigNumber.from(tokenPlan.currentBalanceWei), tokenPlan.decimals)} ${tokenPlan.symbol}`
      );
    }

    // Step 5: Withdraw from vault with retry logic
    let retries = 3;
    let lastError: Error | null = null;
    
    while (retries > 0) {
      try {
        console.log(`🔄 Attempting withdrawal (${4 - retries}/3)...`);
        const withdrawTx = await vincentSigner.sendContractTransaction(
          vaultContract,
          'withdrawTo',
          tokenPlan.tokenAddress,
          amountWei.toString(),
          pkpAddress
        );
        
        await withdrawTx.wait();
        console.log(`✅ Withdrawn ${tokenPlan.symbol} from vault:`, withdrawTx.hash);
        result.transactionHashes.push(withdrawTx.hash);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Withdrawal attempt failed (${4 - retries}/3):`, error);
        retries--;
        
        if (retries > 0) {
          console.log(`⏳ Waiting 2 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // All retries failed
    throw new Error(`Failed to withdraw ${tokenPlan.symbol} after 3 attempts: ${lastError?.message}`);
  }

  /**
   * Step 2b: Swap tokens on PKP wallet
   */
  private async swapTokensOnPKP(
    vincentSigner: VincentSigner,
    tokenPlan: TokenRebalancePlan,
    pkpAddress: string,
    result: RebalanceResult
  ): Promise<void> {
    console.log(`🔍 Swapping ${tokenPlan.symbol} to USDC on PKP wallet...`);
    
    // Convert wei to formatted string for swap service
    const amountFormatted = ethers.utils.formatUnits(tokenPlan.amountToSwapWei, tokenPlan.decimals);
    
    // Approve Uniswap Router
    await this.approveUniswapRouter(vincentSigner, tokenPlan, pkpAddress, result);
    
    // Execute swap
    const swapParams = {
      tokenInAddress: tokenPlan.tokenAddress,
      tokenInAmount: amountFormatted, // Swap service expects formatted string
      tokenOutAddress: this.usdcAddress,
      recipient: pkpAddress,
      slippageTolerance: 100
    };

    const signedQuote = await this.swapService.getSignedQuote(swapParams);
    const precheckResult = await this.swapService.precheckSwap(signedQuote, pkpAddress);
    
    if (!precheckResult) {
      throw new Error('Swap precheck failed');
    }

    const swapResult = await this.swapService.executeSwap(signedQuote, pkpAddress);
    console.log(`✅ Swapped ${tokenPlan.symbol} to USDC:`, swapResult.swapTxHash);
    result.transactionHashes.push(swapResult.swapTxHash);
  }

  /**
   * Step 2c: Transfer USDC back to vault
   */
  private async transferUSDCToVault(
    vincentSigner: VincentSigner,
    vaultContract: ethers.Contract,
    pkpAddress: string,
    vaultAddress: string,
    result: RebalanceResult
  ): Promise<void> {
    console.log(`🔍 Transferring USDC back to vault...`);
    
    // Wait a moment for the swap to fully complete
    console.log('⏳ Waiting for swap to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check PKP USDC balance
    const usdcContract = vincentSigner.createContract(this.usdcAddress, ERC20_ABI);
    const pkpBalance = await usdcContract.balanceOf(pkpAddress);
    
    console.log(`🔍 PKP USDC balance (raw): ${pkpBalance.toString()}`);
    console.log(`🔍 PKP USDC balance (formatted): ${ethers.utils.formatUnits(pkpBalance, 6)} USDC`);
    
    if (pkpBalance.isZero()) {
      console.log('⚠️ No USDC to transfer back to vault');
      return;
    }

    const balanceFormatted = ethers.utils.formatUnits(pkpBalance, 6);
    console.log(`🔍 PKP USDC balance: ${balanceFormatted} USDC`);

    // Approve vault to spend USDC
    const approveTx = await vincentSigner.sendContractTransaction(
      usdcContract,
      'approve',
      vaultAddress,
      pkpBalance
    );
    await approveTx.wait();
    console.log('✅ Vault approved to spend USDC:', approveTx.hash);
    result.transactionHashes.push(approveTx.hash);

    // Deposit USDC into vault
    const depositTx = await vincentSigner.sendContractTransaction(
      vaultContract,
      'deposit',
      this.usdcAddress,
      pkpBalance
    );
    await depositTx.wait();
    console.log('✅ USDC deposited into vault:', depositTx.hash);
    result.transactionHashes.push(depositTx.hash);
  }


  /**
   * Approve Uniswap Router to spend tokens with retry logic
   */
  private async approveUniswapRouter(
    vincentSigner: VincentSigner,
    tokenPlan: TokenRebalancePlan,
    pkpAddress: string,
    result: RebalanceResult
  ): Promise<void> {
    console.log(`🔍 Approving Uniswap Router for ${tokenPlan.symbol}...`);
    
    const tokenContract = vincentSigner.createContract(tokenPlan.tokenAddress, ERC20_ABI);
    const uniswapRouterAddress = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';
    
    const currentAllowance = await tokenContract.allowance(pkpAddress, uniswapRouterAddress);
    const requiredAllowance = ethers.BigNumber.from(tokenPlan.amountToSwapWei);
    
    if (currentAllowance.lt(requiredAllowance)) {
      // Retry logic for network issues
      let retries = 3;
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          console.log(`🔄 Attempting approval (${4 - retries}/3)...`);
          const approveTx = await vincentSigner.sendContractTransaction(
            tokenContract,
            'approve',
            uniswapRouterAddress,
            requiredAllowance
          );
          await approveTx.wait();
          console.log(`✅ Approved Uniswap Router for ${tokenPlan.symbol}:`, approveTx.hash);
          result.transactionHashes.push(approveTx.hash);
          return; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          console.warn(`⚠️ Approval attempt failed (${4 - retries}/3):`, error);
          retries--;
          
          if (retries > 0) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // All retries failed
      throw new Error(`Failed to approve Uniswap Router after 3 attempts: ${lastError?.message}`);
    } else {
      console.log(`✅ Uniswap Router already approved for ${tokenPlan.symbol}`);
    }
  }
}
