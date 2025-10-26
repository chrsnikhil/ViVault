import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';
import { bundledVincentAbility } from '@lit-protocol/vincent-ability-erc20-transfer';
import { ethers } from 'ethers';

/**
 * Service for transferring WETH using Vincent ERC20 Transfer Ability This uses the official ERC20
 * Transfer Ability for WETH transfers
 */
export class VincentEthTransferService {
  private abilityClient: unknown;
  private pkpAddress: string;
  private provider: ethers.providers.JsonRpcProvider;
  private delegateeSigner: ethers.Wallet;
  private rpcUrl: string;
  private chain: string;

  constructor(
    rpcUrl: string,
    pkpAddress: string,
    delegateePrivateKey: string,
    jwt: string,
    chain: string = 'baseSepolia'
  ) {
    this.pkpAddress = pkpAddress;
    this.rpcUrl = rpcUrl;
    this.chain = chain;
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Create delegatee signer
    this.delegateeSigner = new ethers.Wallet(delegateePrivateKey, this.provider);

    // Initialize Vincent ability client with ERC20 Transfer Ability
    this.abilityClient = (getVincentAbilityClient as any)({
      bundledVincentAbility: bundledVincentAbility,
      ethersSigner: this.delegateeSigner,
    });

    console.log('🔍 ===== VincentEthTransferService INITIALIZATION =====');
    console.log('🔍 Using Vincent ERC20 Transfer Ability for WETH');
    console.log('🔍 PKP Address (User Vincent Wallet):', pkpAddress);
    console.log('🔍 Delegatee Address:', this.delegateeSigner.address);
    console.log('🔍 RPC URL:', rpcUrl);
    console.log('🔍 Chain:', chain);
    console.log('🔍 JWT stored (first 20 chars):', jwt.substring(0, 20) + '...');
    console.log('🔍 ====================================================');
  }

  /** Transfer WETH using Vincent ERC20 Transfer Ability */
  async transferWeth(params: {
    to: string;
    tokenAddress: string;
    amount: string; // Amount in WETH (e.g., "0.001")
  }) {
    console.log('🔍 VincentEthTransferService: Starting WETH transfer...');
    console.log('🔍 Transfer params:', params);

    try {
      // Validate recipient address
      if (!ethers.utils.isAddress(params.to)) {
        throw new Error('Invalid recipient address');
      }

      // Validate token address
      if (!ethers.utils.isAddress(params.tokenAddress)) {
        throw new Error('Invalid token address');
      }

      // Prepare transfer parameters according to ERC20 Transfer Ability docs
      const transferParams = {
        rpcUrl: this.rpcUrl,
        chain: this.chain,
        to: params.to,
        tokenAddress: params.tokenAddress,
        amount: params.amount,
      };

      console.log('🔍 Calling ERC20 Transfer Ability precheck with:', transferParams);

      // Precheck transfer
      const precheckResult = await (this.abilityClient as any).precheck(transferParams, {
        delegatorPkpEthAddress: this.pkpAddress,
      });

      console.log('🔍 Precheck result:', precheckResult);

      if (!precheckResult.success) {
        let errorMessage = 'Precheck failed';
        if (precheckResult.runtimeError) {
          errorMessage = `Runtime error: ${precheckResult.runtimeError}`;
        } else if (precheckResult.schemaValidationError) {
          errorMessage = `Schema validation error: ${precheckResult.schemaValidationError}`;
        } else if (precheckResult.result?.error) {
          errorMessage = `Validation failed: ${precheckResult.result.error}`;
        }
        throw new Error(errorMessage);
      }

      // Log precheck results
      const { addressValid, amountValid, tokenAddressValid, estimatedGas, userBalance } =
        precheckResult.result;
      console.log('✅ Precheck passed:', {
        addressValid,
        amountValid,
        tokenAddressValid,
        estimatedGas,
        userBalance,
      });

      console.log('✅ Precheck passed, executing transfer...');

      // Execute transfer
      const executeResult = await (this.abilityClient as any).execute(transferParams, {
        delegatorPkpEthAddress: this.pkpAddress,
      });

      console.log('🔍 Execute result:', executeResult);

      if (!executeResult.success) {
        let errorMessage = 'Transfer execution failed';
        if (executeResult.runtimeError) {
          errorMessage = `Runtime error: ${executeResult.runtimeError}`;
        } else if (executeResult.schemaValidationError) {
          errorMessage = `Schema validation error: ${executeResult.schemaValidationError}`;
        } else if (executeResult.result?.error) {
          errorMessage = `Execution failed: ${executeResult.result.error}`;
        }
        throw new Error(errorMessage);
      }

      const { txHash, to, amount, tokenAddress, timestamp } = executeResult.result;
      console.log('✅ Transfer executed successfully:', {
        txHash,
        to,
        amount,
        tokenAddress,
        timestamp,
      });

      return {
        success: true,
        txHash,
        to,
        amount,
        tokenAddress,
        timestamp,
      };
    } catch (error) {
      console.error('❌ Error during WETH transfer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during transfer',
      };
    }
  }

  /** Get the user's WETH balance */
  async getWethBalance(tokenAddress: string): Promise<string> {
    try {
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ];
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      const balance = await tokenContract.balanceOf(this.pkpAddress);
      const decimals = await tokenContract.decimals();
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting WETH balance:', error);
      return '0';
    }
  }

  /** Get the user's native ETH balance (for gas) */
  async getEthBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.pkpAddress);
    return ethers.utils.formatEther(balance);
  }

  /** Get the user's PKP address */
  getAddress(): string {
    return this.pkpAddress;
  }

  /** Get the delegatee address */
  getDelegateeAddress(): string {
    return this.delegateeSigner.address;
  }
}
