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

export class VincentUniswapSwapService {
  private litNodeClient: LitNodeClient;
  private delegateeSigner: ethers.Wallet;
  private rpcUrl: string;
  private provider: ethers.providers.JsonRpcProvider;

  // Base Sepolia Uniswap V3 contract addresses
  private readonly UNISWAP_FACTORY = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24';
  private readonly UNISWAP_ROUTER = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';

  constructor(
    rpcUrl: string = 'https://sepolia.base.org', // Base Sepolia for Uniswap V3
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
}
