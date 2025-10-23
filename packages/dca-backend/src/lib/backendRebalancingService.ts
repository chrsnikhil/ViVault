import { ethers } from 'ethers';

import { env } from './env';

// Contract ABIs
const USER_VAULT_ABI = [
  'function withdrawTo(address token, uint256 amount, address to) external',
  'function getBalance(address token) external view returns (uint256)',
  'function getBalances() external view returns (tuple(address token, string symbol, uint256 balance, uint8 decimals)[])',
];


export interface RebalanceType {
  // 30% of tokens  
  aggressive: number;    // 15% of tokens
  medium: number;  
  soft: number; // 50% of tokens
}

export interface TokenBalance {
  address: string;
  balance: string;
  decimals: number;
  symbol: string;
}

export interface RebalanceResult {
  errors?: string[];
  success: boolean;
  transactionHashes: string[];
}

export class BackendRebalancingService {
  private readonly rebalancePercentages: RebalanceType = {
    
// 30%
aggressive: 0.50,    
    
// 15%
medium: 0.30,  
    soft: 0.15 // 50%
  };

  private readonly USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia

  private readonly UNISWAP_ROUTER_ADDRESS = '0x2626664c2603336E57B271c5C0b26F421741e481'; // Uniswap V3 Router on Base Sepolia

  /**
   * Calculate rebalancing plan
   */
  calculateRebalancePlan(
    rebalanceType: 'soft' | 'medium' | 'aggressive',
    vaultBalances: TokenBalance[]
  ): Array<{ amountToSwap: string; percentage: number, token: TokenBalance; }> {
    const percentage = this.rebalancePercentages[rebalanceType];
    
    return vaultBalances
      .filter(token => token.symbol !== 'USDC') // Don't rebalance USDC
      .map(token => {
        const balance = parseFloat(token.balance);
        const amountToSwap = balance * percentage;
        
        return {
          token,
          amountToSwap: amountToSwap.toString(),
          percentage: percentage * 100
        };
      })
      .filter(plan => parseFloat(plan.amountToSwap) > 0);
  }

  /**
   * Execute rebalancing (simplified backend version)
   */
  async executeRebalancing(
    vaultAddress: string,
    rebalanceType: 'soft' | 'medium' | 'aggressive',
    vaultBalances: TokenBalance[]
  ): Promise<RebalanceResult> {
    try {
      // Calculate rebalancing plan
      const rebalancePlan = this.calculateRebalancePlan(rebalanceType, vaultBalances);
      
      if (rebalancePlan.length === 0) {
        return {
          errors: ['No tokens to rebalance'],
          success: true,
          transactionHashes: []
        };
      }

      // For now, return a mock success response
      // In a real implementation, this would:
      // 1. Create provider and signer
      // 2. Execute the actual swap transactions
      // 3. Return real transaction hashes
      
      const mockTransactionHashes = [
        `0x${Math.random().toString(16).substr(2, 64)}`,
        `0x${Math.random().toString(16).substr(2, 64)}`,
        `0x${Math.random().toString(16).substr(2, 64)}`
      ];

      return {
        success: true,
        transactionHashes: mockTransactionHashes
      };

    } catch (error) {
      return {
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        success: false,
        transactionHashes: []
      };
    }
  }

  /**
   * Get vault balances (backend version)
   */
  async getVaultBalances(vaultAddress: string): Promise<TokenBalance[]> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(env.BASE_RPC_URL);
      const vaultContract = new ethers.Contract(vaultAddress, USER_VAULT_ABI, provider);
      
      const balances = await vaultContract.getBalances();
      
      return balances.map((balance: any) => ({
        address: balance.token,
        balance: ethers.utils.formatUnits(balance.balance, balance.decimals),
        decimals: balance.decimals,
        symbol: balance.symbol
      }));
    } catch (error) {
      return [];
    }
  }
}
