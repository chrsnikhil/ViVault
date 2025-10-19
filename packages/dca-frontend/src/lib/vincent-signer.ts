import { getVincentAbilityClient } from '@lit-protocol/vincent-app-sdk/abilityClient';
import { bundledVincentAbility } from '@lit-protocol/vincent-ability-evm-transaction-signer';
import { ethers } from 'ethers';

export class VincentSigner {
  private abilityClient: unknown;
  private pkpAddress: string;
  private provider: ethers.providers.JsonRpcProvider;
  private delegateeSigner: ethers.Wallet;
  private jwt: string;

  constructor(rpcUrl: string, pkpAddress: string, delegateePrivateKey: string, jwt: string) {
    this.pkpAddress = pkpAddress;
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.jwt = jwt;

    // Create delegatee signer for authorization
    this.delegateeSigner = new ethers.Wallet(delegateePrivateKey, this.provider);

    // Initialize Vincent ability client with EVM Transaction Signer Ability
    this.abilityClient = getVincentAbilityClient({
      bundledVincentAbility: bundledVincentAbility,
      ethersSigner: this.delegateeSigner,
    });

    console.log('🔍 ===== VincentSigner INITIALIZATION =====');
    console.log('🔍 VincentSigner: Initialized with EVM Transaction Signer Ability');
    console.log('🔍 VincentSigner: PKP Address (delegatorPkpEthAddress):', pkpAddress);
    console.log('🔍 VincentSigner: Delegatee Address:', this.delegateeSigner.address);
    console.log(
      '🔍 VincentSigner: Delegatee Private Key (first 10 chars):',
      delegateePrivateKey.substring(0, 10) + '...'
    );
    console.log('🔍 VincentSigner: JWT stored (first 20 chars):', jwt.substring(0, 20) + '...');
    console.log('🔍 VincentSigner: Full JWT:', jwt);
    console.log('🔍 ========================================');
  }

  /** Precheck function to validate transaction structure and run policy checks */
  async precheckTransaction(transaction: ethers.providers.TransactionRequest) {
    console.log('🔍 VincentSigner: Starting transaction precheck...');

    try {
      // Get nonce and gas info
      const nonce = await this.provider.getTransactionCount(this.pkpAddress);
      const feeData = await this.provider.getFeeData();

      console.log('🔍 VincentSigner: Transaction details:', {
        to: transaction.to,
        nonce,
        gasLimit: transaction.gasLimit?.toString(),
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      });

      // Create complete transaction - use legacy format for ethers v5 compatibility
      const completeTx = {
        to: transaction.to,
        value: transaction.value?.toString() || '0x00',
        data: transaction.data?.toString() || '0x',
        chainId: (await this.provider.getNetwork()).chainId,
        nonce,
        gasLimit: ethers.BigNumber.from(transaction.gasLimit || '500000').toHexString(),
        gasPrice: feeData.gasPrice?.toHexString() || '0x59682f00', // Use gasPrice instead of EIP-1559
      };

      console.log('🔍 VincentSigner: Complete transaction:', completeTx);

      // Serialize transaction
      const serializedTx = ethers.utils.serializeTransaction(completeTx);
      console.log('🔍 VincentSigner: Serialized transaction:', serializedTx);

      // Call precheck function
      console.log('🔍 VincentSigner: Calling precheck...');
      console.log('precheck', {
        rawAbilityParams: { serializedTransaction: serializedTx },
        delegatorPkpEthAddress: '0xcc68b13b4Bd8D8fC9d797282Bf9b927F79fcC470', // Hardcoded user PKP address
        rpcUrl: undefined,
      });
      const precheckResult = await this.abilityClient.precheck(
        { serializedTransaction: serializedTx },
        { delegatorPkpEthAddress: '0xcc68b13b4Bd8D8fC9d797282Bf9b927F79fcC470' } // Hardcoded user PKP address
      );

      console.log('🔍 VincentSigner: Precheck result:', precheckResult);

      if (precheckResult.success) {
        const { deserializedUnsignedTransaction } = precheckResult.result;
        console.log('✅ VincentSigner: Transaction validated:', deserializedUnsignedTransaction);
        return {
          success: true,
          deserializedUnsignedTransaction,
          serializedTransaction: serializedTx,
        };
      } else {
        // Handle different types of failures
        let errorMessage = 'Transaction precheck failed';
        let isWhitelistError = false;

        if (precheckResult.runtimeError) {
          errorMessage = `Runtime error: ${precheckResult.runtimeError}`;
          // Check if it's a whitelist/policy error
          if (
            precheckResult.runtimeError.includes('DelegateeNotAssociatedWithApp') ||
            precheckResult.runtimeError.includes('not permitted') ||
            precheckResult.runtimeError.includes('whitelist') ||
            precheckResult.runtimeError.includes('policy')
          ) {
            isWhitelistError = true;
          }
        } else if (precheckResult.schemaValidationError) {
          errorMessage = `Schema validation error: ${precheckResult.schemaValidationError}`;
        } else if (precheckResult.result) {
          errorMessage = `Transaction validation failed: ${precheckResult.result.error || JSON.stringify(precheckResult.result)}`;
        }

        if (isWhitelistError) {
          errorMessage +=
            '\n\n⚠️ CONTRACT WHITELIST ERROR:\nThis transaction is being blocked by the Vincent Contract Whitelist Policy.\n\nPlease configure your whitelist with:\n' +
            '• Chain ID: 84532 (Base Sepolia)\n' +
            '• Contract: 0x2e2bb24b2B88F30ea7dB6DFD8b9DAeC87b563b1C (VaultFactory)\n' +
            '• Function: 0x5d12928b (createVault) or * (all functions)\n\n' +
            'You can update your whitelist in the Vincent Dashboard or re-authenticate with proper configuration.';
        }

        console.error('❌ VincentSigner: Precheck failed:', errorMessage);
        console.error(
          '❌ VincentSigner: Full precheck result:',
          JSON.stringify(precheckResult, null, 2)
        );
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error('❌ VincentSigner: Error during precheck:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during precheck',
      };
    }
  }

  /** Execute function to sign the transaction */
  async signTransaction(transaction: ethers.providers.TransactionRequest) {
    console.log('🔍 VincentSigner: Starting transaction signing...');

    try {
      // First run precheck to validate the transaction
      const precheckResult = await this.precheckTransaction(transaction);

      if (!precheckResult.success) {
        throw new Error(`Precheck failed: ${precheckResult.error}`);
      }

      const { serializedTransaction } = precheckResult;

      // Call execute function to sign the transaction
      console.log('🔍 VincentSigner: Calling execute to sign transaction...');
      const executeResult = await this.abilityClient.execute(
        { serializedTransaction },
        { delegatorPkpEthAddress: '0xcc68b13b4Bd8D8fC9d797282Bf9b927F79fcC470' } // Hardcoded user PKP address
      );

      console.log('🔍 VincentSigner: Execute result:', executeResult);

      if (executeResult.success) {
        const { signedTransaction, deserializedSignedTransaction } = executeResult.result;
        console.log('✅ VincentSigner: Transaction signed successfully');
        console.log('🔍 VincentSigner: Signed transaction:', signedTransaction);
        console.log('🔍 VincentSigner: Transaction details:', deserializedSignedTransaction);

        return signedTransaction;
      } else {
        // Handle different types of failures
        let errorMessage = 'Transaction signing failed';

        if (executeResult.runtimeError) {
          errorMessage = `Runtime error: ${executeResult.runtimeError}`;
        } else if (executeResult.schemaValidationError) {
          errorMessage = `Schema validation error: ${executeResult.schemaValidationError}`;
        } else if (executeResult.result) {
          errorMessage = `Transaction signing failed: ${executeResult.result.error}`;
        }

        console.error('❌ VincentSigner: Execute failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ VincentSigner: Error signing transaction:', error);
      throw error;
    }
  }

  /** Send transaction using Vincent PKP wallet */
  async sendTransaction(transaction: ethers.providers.TransactionRequest) {
    console.log('🔍 VincentSigner: Sending transaction...');

    try {
      // Sign the transaction
      const signedTx = await this.signTransaction(transaction);

      // Send the signed transaction
      const txResponse = await this.provider.sendTransaction(signedTx);
      console.log('✅ VincentSigner: Transaction sent:', txResponse.hash);

      return txResponse;
    } catch (error) {
      console.error('❌ VincentSigner: Error sending transaction:', error);
      throw error;
    }
  }

  /** Get the PKP address */
  getAddress() {
    return this.pkpAddress;
  }

  /** Get the provider */
  getProvider() {
    return this.provider;
  }

  /** Helper method to create a contract instance */
  createContract(address: string, abi: ethers.ContractInterface) {
    return new ethers.Contract(address, abi, this.provider);
  }

  /** Helper method to send a contract transaction */
  async sendContractTransaction(contract: ethers.Contract, method: string, ...args: unknown[]) {
    console.log(`🔍 VincentSigner: Preparing contract transaction: ${method}`);

    // Encode the function call
    const data = contract.interface.encodeFunctionData(method, args);
    console.log('🔍 VincentSigner: Encoded function data:', data);

    // Estimate gas
    let gasLimit;
    try {
      gasLimit = await contract.estimateGas[method](...args, {
        from: this.pkpAddress,
      });
      console.log('🔍 VincentSigner: Estimated gas:', gasLimit.toString());
    } catch (error) {
      console.warn('⚠️ VincentSigner: Gas estimation failed, using default:', error);
      gasLimit = ethers.BigNumber.from('500000');
    }

    // Send transaction
    const tx = await this.sendTransaction({
      to: contract.address,
      data,
      gasLimit,
    });

    return tx;
  }
}
