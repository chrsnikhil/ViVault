import { ethers } from 'ethers';
import { VincentUniswapSwapService } from './vincent-uniswap-swap';
import { COMMON_TOKENS, USER_VAULT_ABI, ERC20_ABI } from '../config/contracts';
import { VincentSigner } from './vincent-signer';
import { env } from '../config/env';

export type RebalanceType = 'soft' | 'medium' | 'aggressive';

export interface RebalanceConfig {
  type: RebalanceType;
  percentage: number;
  description: string;
  color: string;
}

export interface TokenRebalancePlan {
  tokenAddress: string;
  symbol: string;
  currentBalance: string;
  amountToSwap: string;
  remainingBalance: string;
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
    this.usdcAddress = COMMON_TOKENS.USDC;
  }

  /**
   * Calculate rebalancing plan for given vault balances
   */
  calculateRebalancePlan(
    vaultBalances: Array<{
      address: string;
      symbol: string;
      balance: string;
      decimals: number;
    }>,
    rebalanceType: RebalanceType
  ): RebalancePreview {
    const config = RebalancingService.REBALANCE_CONFIGS[rebalanceType];
    const percentage = config.percentage;

    console.log('🔍 ===== CALCULATING REBALANCE PLAN =====');
    console.log('🔍 Rebalance Type:', rebalanceType);
    console.log('🔍 Percentage:', percentage);
    console.log('🔍 Vault Balances:', vaultBalances);
    console.log('🔍 =====================================');

    const tokenPlans: TokenRebalancePlan[] = [];
    let totalAmountToSwap = 0;

    // Calculate rebalancing plan for each token
    for (const token of vaultBalances) {
      console.log(`🔍 Processing token: ${token.symbol} (${token.address})`);
      console.log(`🔍 USDC Address: ${this.usdcAddress}`);
      console.log(`🔍 Token address lowercase: ${token.address.toLowerCase()}`);
      console.log(`🔍 USDC address lowercase: ${this.usdcAddress.toLowerCase()}`);
      console.log(`🔍 Symbol match: ${token.symbol === 'USDC'}`);
      console.log(`🔍 Address match: ${token.address.toLowerCase() === this.usdcAddress.toLowerCase()}`);
      
      // Skip USDC tokens - we don't want to swap USDC to USDC
      if (token.symbol === 'USDC' || token.address.toLowerCase() === this.usdcAddress.toLowerCase()) {
        console.log(`⏭️ Skipping USDC token: ${token.symbol} (${token.address})`);
        continue;
      }

      // Handle both wei strings and formatted strings
      let currentBalanceWei: ethers.BigNumber;
      try {
        // Try to parse as wei string first
        currentBalanceWei = ethers.BigNumber.from(token.balance);
      } catch {
        // If that fails, treat as formatted string and convert to wei
        currentBalanceWei = ethers.utils.parseUnits(token.balance, token.decimals);
      }
      
      // Skip tokens with zero balance
      if (currentBalanceWei.isZero()) {
        console.log(`⏭️ Skipping token with zero balance: ${token.symbol} (${token.address}) - Balance: ${token.balance}`);
        continue;
      }

      // Convert to formatted for display
      const currentBalanceFormatted = parseFloat(ethers.utils.formatUnits(currentBalanceWei, token.decimals));

      console.log(`🔍 Token: ${token.symbol}`);
      console.log(`🔍 Raw Balance Input: "${token.balance}"`);
      console.log(`🔍 UI Balance: ${currentBalanceFormatted} (${currentBalanceWei.toString()} wei)`);
      console.log(`🔍 Token Address: ${token.address}`);
      console.log(`🔍 Token Decimals: ${token.decimals}`);
      
      // Calculate amounts in wei first, then convert to formatted
      const amountToSwapWei = currentBalanceWei.mul(percentage).div(100);
      const remainingBalanceWei = currentBalanceWei.sub(amountToSwapWei);
      
      // Convert back to formatted amounts
      const amountToSwapFormatted = parseFloat(ethers.utils.formatUnits(amountToSwapWei, token.decimals));
      const remainingBalanceFormatted = parseFloat(ethers.utils.formatUnits(remainingBalanceWei, token.decimals));

      console.log(`🔍 Current Balance: ${currentBalanceFormatted} (${currentBalanceWei.toString()} wei)`);
      console.log(`🔍 Amount to Swap (${percentage}%): ${amountToSwapFormatted} (${amountToSwapWei.toString()} wei)`);
      console.log(`🔍 Remaining: ${remainingBalanceFormatted} (${remainingBalanceWei.toString()} wei)`);
      console.log(`🔍 DEBUG: amountToSwapWei.toString() = "${amountToSwapWei.toString()}"`);

      // Only include tokens with meaningful amounts to swap
      if (amountToSwapFormatted > 0.001) { // Minimum 0.001 tokens
        const tokenPlan = {
          tokenAddress: token.address,
          symbol: token.symbol,
          currentBalance: token.balance,
          amountToSwap: amountToSwapWei.toString(), // Store as wei string
          remainingBalance: remainingBalanceFormatted.toFixed(6),
          decimals: token.decimals
        };
        
        console.log(`🔍 DEBUG: Storing tokenPlan.amountToSwap = "${tokenPlan.amountToSwap}"`);
        tokenPlans.push(tokenPlan);

        totalAmountToSwap += amountToSwapFormatted;
      }
    }

    // Estimate USDC received (simplified - in production you'd want more accurate pricing)
    const estimatedUSDCReceived = (totalAmountToSwap * 0.8).toFixed(6); // Rough estimate

    const preview: RebalancePreview = {
      totalTokens: tokenPlans.length,
      totalAmountToSwap: totalAmountToSwap.toFixed(6),
      estimatedUSDCReceived,
      rebalanceType,
      tokenPlans
    };

    console.log('✅ Rebalance plan calculated:', preview);
    return preview;
  }

  /**
   * Calculate rebalancing plan with route validation
   */
  async calculateRebalancePlanWithRoutes(
    vaultBalances: Array<{
      address: string;
      symbol: string;
      balance: string;
      decimals: number;
    }>,
    rebalanceType: RebalanceType
  ): Promise<RebalancePreview> {
    console.log('🔍 ===== CALCULATING REBALANCE PLAN WITH ROUTES =====');
    console.log('🔍 Vault Balances:', vaultBalances);
    console.log('🔍 USDC Address:', this.usdcAddress);
    console.log('🔍 ================================================');
    
    // First calculate the basic plan
    const basicPlan = this.calculateRebalancePlan(vaultBalances, rebalanceType);
    
    if (basicPlan.tokenPlans.length === 0) {
      console.log('❌ No tokens in basic plan');
      return basicPlan;
    }

    console.log('🔍 Basic plan tokens:', basicPlan.tokenPlans.map(t => ({
      symbol: t.symbol,
      address: t.tokenAddress,
      amountToSwap: t.amountToSwap
    })));

    // Check which tokens have valid routes to USDC
    const validTokenPlans: TokenRebalancePlan[] = [];
    
    for (const tokenPlan of basicPlan.tokenPlans) {
      console.log(`🔍 Checking route for ${tokenPlan.symbol} (${tokenPlan.tokenAddress}) -> USDC (${this.usdcAddress})...`);
      
      // Check route using the original token address from the vault
      const hasRoute = await this.checkSwapRouteExists(
        tokenPlan.tokenAddress,
        this.usdcAddress,
        tokenPlan.amountToSwap
      );
      
      if (hasRoute) {
        // Always use the original token address from the vault
        validTokenPlans.push(tokenPlan);
        console.log(`✅ Route found for ${tokenPlan.symbol}`);
      } else {
        console.log(`❌ No route found for ${tokenPlan.symbol} -> USDC`);
        
      }
    }

    // If no routes found, try a fallback approach
    if (validTokenPlans.length === 0) {
      console.log('⚠️ No routes found, trying fallback approach...');
      
      // For now, let's include all tokens and let the swap service handle the error
      // This will give us better error messages about what's actually wrong
      console.log('🔄 Including all tokens in preview (will show swap errors during execution)');
      validTokenPlans.push(...basicPlan.tokenPlans);
    }

    // Update the preview with only valid tokens
    const updatedPreview: RebalancePreview = {
      ...basicPlan,
      totalTokens: validTokenPlans.length,
      tokenPlans: validTokenPlans
    };

    console.log('✅ Rebalance plan with routes calculated:', updatedPreview);
    return updatedPreview;
  }

  /**
   * Check if a swap route exists for a token pair
   */
  private async checkSwapRouteExists(tokenIn: string, tokenOut: string, amountIn: string): Promise<boolean> {
    try {
      console.log(`🔍 ===== CHECKING ROUTE EXISTS =====`);
      console.log(`🔍 Token In: ${tokenIn}`);
      console.log(`🔍 Token Out: ${tokenOut}`);
      console.log(`🔍 Amount In: ${amountIn}`);
      console.log(`🔍 ================================`);
      
      // Use the same route discovery logic as the swap component
      const routes = await this.swapService.findSwapRoutes(tokenIn, tokenOut, amountIn);
      const hasRoutes = routes.length > 0;
      
      console.log(`🔍 Route check result: ${hasRoutes ? 'EXISTS' : 'NOT FOUND'} (${routes.length} routes)`);
      if (routes.length > 0) {
        console.log(`🔍 Available routes:`, routes.map(r => ({
          path: r.path,
          routeType: r.routeType,
          expectedOutput: r.expectedOutput
        })));
      }
      return hasRoutes;
    } catch (error) {
      console.error(`❌ Error checking route:`, error);
      console.error(`❌ Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Execute rebalancing by swapping tokens to USDC
   */
  async executeRebalancing(
    vaultAddress: string,
    rebalanceType: RebalanceType,
    vaultBalances: Array<{
      address: string;
      symbol: string;
      balance: string;
      decimals: number;
    }>,
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
      // Calculate rebalancing plan
      const plan = this.calculateRebalancePlan(vaultBalances, rebalanceType);
      
      if (plan.tokenPlans.length === 0) {
        throw new Error('No tokens to rebalance');
      }

      console.log('🔍 Executing swaps for', plan.tokenPlans.length, 'tokens');

      // Filter tokens that have valid routes to USDC
      const validTokenPlans = [];
      for (const tokenPlan of plan.tokenPlans) {
        console.log(`🔍 Checking route for ${tokenPlan.symbol} -> USDC...`);
        
        const hasRoute = await this.checkSwapRouteExists(
          tokenPlan.tokenAddress, 
          this.usdcAddress, 
          tokenPlan.amountToSwap
        );
        
        if (hasRoute) {
          validTokenPlans.push(tokenPlan);
          console.log(`✅ Route found for ${tokenPlan.symbol}`);
        } else {
          console.log(`❌ No route found for ${tokenPlan.symbol} -> USDC`);
          result.errors.push(`No swap route available for ${tokenPlan.symbol} -> USDC`);
        }
      }

      if (validTokenPlans.length === 0) {
        throw new Error('No valid swap routes found for any tokens');
      }

      console.log(`🔍 Found valid routes for ${validTokenPlans.length} out of ${plan.tokenPlans.length} tokens`);

      // Execute swaps using the EXACT SAME FLOW as swap popup
      for (const tokenPlan of validTokenPlans) {
        try {
          console.log(`🔄 Swapping ${tokenPlan.amountToSwap} ${tokenPlan.symbol} to USDC...`);
          
          // Step 1: Transfer tokens from vault to PKP wallet (exact same as swap popup)
          const vincentSigner = new VincentSigner(
            'https://sepolia.base.org',
            pkpAddress,
            env.VITE_DELEGATEE_PRIVATE_KEY,
            jwt
          );

          const vaultContract = vincentSigner.createContract(vaultAddress, USER_VAULT_ABI);
          const amountInWei = ethers.BigNumber.from(tokenPlan.amountToSwap);
          
          console.log(`🔍 DEBUG: tokenPlan.amountToSwap = "${tokenPlan.amountToSwap}"`);
          console.log(`🔍 DEBUG: amountInWei.toString() = "${amountInWei.toString()}"`);
          console.log(`🔍 DEBUG: amountInWei in ETH = "${ethers.utils.formatEther(amountInWei)}"`);

          // Check vault balance before attempting withdrawal (same as swap component)
          console.log('🔍 Checking vault balance before withdrawal...');
          const vaultBalance = await vaultContract.getBalance(tokenPlan.tokenAddress);
          console.log('🔍 Vault balance (wei):', vaultBalance.toString());
          console.log('🔍 Vault balance (formatted):', ethers.utils.formatUnits(vaultBalance, tokenPlan.decimals));
          console.log('🔍 Required amount (wei):', amountInWei.toString());
          console.log('🔍 Required amount (formatted):', ethers.utils.formatUnits(amountInWei, tokenPlan.decimals));
          console.log('🔍 Calculation used balance:', tokenPlan.currentBalance);

          if (vaultBalance.lt(amountInWei)) {
            throw new Error(
              `Insufficient vault balance. Vault has ${ethers.utils.formatUnits(vaultBalance, tokenPlan.decimals)} ${tokenPlan.symbol}, but trying to withdraw ${ethers.utils.formatUnits(amountInWei, tokenPlan.decimals)} ${tokenPlan.symbol}. Calculation was based on: ${tokenPlan.currentBalance} ${tokenPlan.symbol}`
            );
          }

          console.log('🔍 Transferring tokens from vault to PKP wallet...');
          console.log(`🔍 DEBUG: Calling withdrawTo with:`);
          console.log(`🔍   - token: ${tokenPlan.tokenAddress}`);
          console.log(`🔍   - amount: ${amountInWei.toString()}`);
          console.log(`🔍   - to: ${pkpAddress}`);
          
          // Double-check the amount is what we expect
          const expectedAmount = ethers.BigNumber.from(tokenPlan.amountToSwap);
          console.log(`🔍 DEBUG: Expected amount: ${expectedAmount.toString()}`);
          console.log(`🔍 DEBUG: Actual amountInWei: ${amountInWei.toString()}`);
          console.log(`🔍 DEBUG: Are they equal? ${expectedAmount.eq(amountInWei)}`);
          
          if (!expectedAmount.eq(amountInWei)) {
            throw new Error(`Amount mismatch! Expected: ${expectedAmount.toString()}, Got: ${amountInWei.toString()}`);
          }
          
          // Force the correct amount by creating a fresh BigNumber
          const correctAmount = ethers.BigNumber.from(tokenPlan.amountToSwap);
          console.log(`🔍 DEBUG: Using fresh BigNumber: ${correctAmount.toString()}`);
          
          const withdrawTx = await vincentSigner.sendContractTransaction(
            vaultContract,
            'withdrawTo',
            tokenPlan.tokenAddress,
            correctAmount.toString(),
            pkpAddress
          );
          await withdrawTx.wait();
          console.log('✅ Tokens transferred from vault to PKP wallet:', withdrawTx.hash);
          result.transactionHashes.push(withdrawTx.hash);

          // Step 2: Approve Uniswap Router (Vincent Swap service expects this)
          const tokenInContract = vincentSigner.createContract(tokenPlan.tokenAddress, ERC20_ABI);
          const uniswapRouterAddress = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4'; // Uniswap Router

          const currentAllowance = await tokenInContract.allowance(pkpAddress, uniswapRouterAddress);
          const requiredAllowance = ethers.BigNumber.from(tokenPlan.amountToSwap);

          let approveTx = null;
          if (currentAllowance.lt(requiredAllowance)) {
            console.log('🔍 Approving Uniswap Router...');
            approveTx = await vincentSigner.sendContractTransaction(
              tokenInContract,
              'approve',
              uniswapRouterAddress,
              requiredAllowance
            );
            await approveTx.wait();
            console.log('✅ Uniswap Router approved:', approveTx.hash);
            if (approveTx) result.transactionHashes.push(approveTx.hash);
          }

          // Step 3: Generate signed quote and execute swap (exact same as swap popup)
          // Convert wei amount to formatted string for swap service
          const formattedAmount = ethers.utils.formatUnits(tokenPlan.amountToSwap, tokenPlan.decimals);
          console.log(`🔍 DEBUG: Swap amount - wei: ${tokenPlan.amountToSwap}, formatted: ${formattedAmount}`);
          
          const swapParams = {
            tokenInAddress: tokenPlan.tokenAddress,
            tokenInAmount: formattedAmount, // Swap service expects formatted string
            tokenOutAddress: this.usdcAddress,
            recipient: pkpAddress, // PKP receives the USDC
            slippageTolerance: 100
          };

          const signedQuote = await this.swapService.getSignedQuote(swapParams);
          const precheckResult = await this.swapService.precheckSwap(signedQuote, pkpAddress);
          
          if (!precheckResult) {
            throw new Error('Swap precheck failed');
          }

          const swapResult = await this.swapService.executeSwap(signedQuote, pkpAddress);
          console.log('✅ Swap executed successfully:', swapResult.swapTxHash);
          result.transactionHashes.push(swapResult.swapTxHash);

          // Step 4: Transfer USDC from PKP back to vault (exact same as swap popup)
          const tokenOutContract = vincentSigner.createContract(this.usdcAddress, ERC20_ABI);
          const pkpBalance = await tokenOutContract.balanceOf(pkpAddress);
          
          if (pkpBalance.gt(0)) {
            console.log('🔍 Transferring USDC back to vault...');
            const transferTx = await vincentSigner.sendContractTransaction(
              tokenOutContract,
              'transfer',
              vaultAddress,
              pkpBalance
            );
            await transferTx.wait();
            console.log('✅ USDC transferred back to vault:', transferTx.hash);
            result.transactionHashes.push(transferTx.hash);
          }

          // Add small delay between swaps to avoid nonce issues
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          const errorMsg = `Failed to swap ${tokenPlan.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('❌', errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Check if at least some swaps succeeded
      if (result.transactionHashes.length > 0) {
        result.success = true;
        result.totalUSDCReceived = plan.estimatedUSDCReceived;
        console.log('✅ Rebalancing completed successfully');
        console.log('🔍 Successful swaps:', result.transactionHashes.length);
        console.log('🔍 Failed swaps:', result.errors.length);
      } else {
        throw new Error('All swaps failed');
      }

    } catch (error) {
      console.error('❌ Rebalancing failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Get rebalancing configuration for a specific type
   */
  getRebalanceConfig(type: RebalanceType): RebalanceConfig {
    return RebalancingService.REBALANCE_CONFIGS[type];
  }

  /**
   * Get all available rebalancing configurations
   */
  getAllRebalanceConfigs(): RebalanceConfig[] {
    return Object.values(RebalancingService.REBALANCE_CONFIGS);
  }

  /**
   * Check if a token should be excluded from rebalancing
   */
  shouldExcludeToken(tokenAddress: string, symbol: string): boolean {
    // Exclude USDC itself and native ETH
    const excludedTokens = [
      this.usdcAddress.toLowerCase(),
      '0x0000000000000000000000000000000000000000', // ETH
    ];

    return excludedTokens.includes(tokenAddress.toLowerCase()) || 
           symbol.toLowerCase().includes('usdc');
  }

  /**
   * Test if WETH -> USDC route exists (for debugging)
   */
  async testWethToUsdcRoute(): Promise<boolean> {
    // Test with the official WETH address
    const wethAddress = '0x4200000000000000000000000000000000000006';
    const testAmount = '0.001'; // Small test amount
    
    console.log('🧪 ===== TESTING WETH -> USDC ROUTE =====');
    console.log('🧪 WETH Address:', wethAddress);
    console.log('🧪 USDC Address:', this.usdcAddress);
    console.log('🧪 Test Amount:', testAmount);
    console.log('🧪 ======================================');
    
    try {
      const hasRoute = await this.checkSwapRouteExists(wethAddress, this.usdcAddress, testAmount);
      console.log('🧪 Test result:', hasRoute ? 'ROUTE EXISTS' : 'NO ROUTE');
      return hasRoute;
    } catch (error) {
      console.error('🧪 Test failed:', error);
      return false;
    }
  }

  /**
   * Test route for any token pair (for debugging)
   */
  async testTokenRoute(tokenIn: string, tokenOut: string, amount: string = '0.001'): Promise<boolean> {
    console.log('🧪 ===== TESTING TOKEN ROUTE =====');
    console.log('🧪 Token In:', tokenIn);
    console.log('🧪 Token Out:', tokenOut);
    console.log('🧪 Amount:', amount);
    console.log('🧪 ===============================');
    
    try {
      const hasRoute = await this.checkSwapRouteExists(tokenIn, tokenOut, amount);
      console.log('🧪 Test result:', hasRoute ? 'ROUTE EXISTS' : 'NO ROUTE');
      return hasRoute;
    } catch (error) {
      console.error('🧪 Test failed:', error);
      return false;
    }
  }

  /**
   * Transfer USDC from PKP wallet back to vault
   */
  private async transferUsdcToVault(pkpAddress: string, vaultAddress: string, swapTxHash: string): Promise<string | null> {
    try {
      console.log('🔍 ===== TRANSFERRING USDC TO VAULT =====');
      console.log('🔍 PKP Address:', pkpAddress);
      console.log('🔍 Vault Address:', vaultAddress);
      console.log('🔍 Swap TX Hash:', swapTxHash);
      console.log('🔍 ======================================');

      // Wait a moment for the swap transaction to be confirmed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get USDC balance from PKP wallet
      const usdcContract = new ethers.Contract(
        this.usdcAddress,
        ['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)'],
        this.swapService['provider'] // Access the provider from swap service
      );

      const pkpBalance = await usdcContract.balanceOf(pkpAddress);
      console.log('🔍 PKP USDC balance:', ethers.utils.formatUnits(pkpBalance, 6));

      if (pkpBalance.eq(0)) {
        console.log('⚠️ No USDC found in PKP wallet to transfer');
        return null;
      }

      // For now, we'll just log that we would transfer the USDC
      // In a real implementation, you would use Vincent EVM Transaction Signer
      // to transfer the USDC from PKP wallet to vault
      console.log('⚠️ USDC transfer to vault not implemented yet - would transfer:', ethers.utils.formatUnits(pkpBalance, 6), 'USDC');
      
      // Return a placeholder transaction hash for now
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
      
    } catch (error) {
      console.error('❌ Error transferring USDC to vault:', error);
      throw error;
    }
  }
}
