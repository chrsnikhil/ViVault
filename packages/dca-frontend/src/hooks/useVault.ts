import { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/web3-context';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { VincentSigner } from '@/lib/vincent-signer';
import { env } from '@/config/env';
import {
  CONTRACT_ADDRESSES,
  VAULT_FACTORY_ABI,
  USER_VAULT_ABI,
  ERC20_ABI,
} from '@/config/contracts';

// Types
export interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export interface VaultInfo {
  address: string;
  owner: string;
  factory: string;
  balances: TokenBalance[];
  supportedTokens: string[];
  tokenCount: number;
}

export const useVault = () => {
  const { vincentProvider, vincentAccount } = useWeb3();
  const { authInfo } = useJwtContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get Vincent account
  const getVincentAccount = useCallback(() => {
    console.log('🔍 getVincentAccount called:', {
      vincentAccount,
    });

    if (vincentAccount) {
      console.log('🔍 Using Vincent wallet:', vincentAccount);
      return vincentAccount;
    } else {
      console.log('🔍 No Vincent wallet found');
      return null;
    }
  }, [vincentAccount]);

  // Create vault using Vincent PKP wallet with EVM Transaction Signer Ability
  const createVaultWithVincent = useCallback(async (): Promise<string> => {
    if (!authInfo?.pkp.ethAddress) {
      throw new Error('No Vincent PKP wallet connected');
    }

    if (!authInfo?.jwt) {
      throw new Error('No Vincent JWT available. Please re-authenticate.');
    }

    if (!env.VITE_DELEGATEE_PRIVATE_KEY) {
      throw new Error(
        'Delegatee private key not configured. Please add VITE_DELEGATEE_PRIVATE_KEY to your .env file'
      );
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 ===== PRE-TRANSACTION DEBUG INFO =====');
      console.log(
        '🔍 Creating vault with Vincent PKP wallet using EVM Transaction Signer Ability:',
        authInfo.pkp.ethAddress
      );
      console.log(
        '🔍 useVault: Environment VITE_DELEGATEE_PRIVATE_KEY (first 10 chars):',
        env.VITE_DELEGATEE_PRIVATE_KEY?.substring(0, 10) + '...'
      );
      console.log('🔍 useVault: JWT available:', !!authInfo.jwt);
      console.log('🔍 useVault: JWT (first 50 chars):', authInfo.jwt.substring(0, 50) + '...');
      console.log('🔍 useVault: Full authInfo:', {
        pkpEthAddress: authInfo.pkp.ethAddress,
        pkpPublicKey: authInfo.pkp.publicKey?.substring(0, 20) + '...',
        appId: authInfo.app.id,
        appVersion: authInfo.app.version,
        hasJWT: !!authInfo.jwt,
      });
      console.log('🔍 ===================================');

      // Create Vincent signer with EVM Transaction Signer Ability
      // Use fallback RPC endpoints for better reliability
      const rpcEndpoints = [
        'https://sepolia.base.org',
        'https://base-sepolia.g.alchemy.com/v2/demo', // Alchemy fallback
        'https://base-sepolia.public.blastapi.io', // BlastAPI fallback
      ];

      const vincentSigner = new VincentSigner(
        rpcEndpoints[0], // Primary RPC endpoint
        authInfo.pkp.ethAddress,
        env.VITE_DELEGATEE_PRIVATE_KEY,
        authInfo.jwt // ✅ Pass the JWT!
      );

      // Create contract instance
      const factory = vincentSigner.createContract(
        CONTRACT_ADDRESSES.VaultFactory,
        VAULT_FACTORY_ABI
      );

      // Check if user already has a vault
      const hasVaultResult = await factory.hasVault(authInfo.pkp.ethAddress);
      if (hasVaultResult) {
        throw new Error('User already has a vault');
      }

      // Send transaction using Vincent PKP with EVM Transaction Signer Ability
      console.log('🔍 Sending createVault transaction with Vincent PKP...');
      const tx = await vincentSigner.sendContractTransaction(factory, 'createVault');
      console.log('🔍 Transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('🔍 Transaction confirmed:', receipt);

      // Parse the VaultCreated event to get the vault address
      const vaultCreatedEvent = receipt.logs.find((log: ethers.providers.Log) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'VaultCreated';
        } catch {
          return false;
        }
      });

      if (!vaultCreatedEvent) {
        throw new Error('VaultCreated event not found in transaction receipt');
      }

      const parsedEvent = factory.interface.parseLog(vaultCreatedEvent);
      const vaultAddress = parsedEvent?.args.vault;

      if (!vaultAddress) {
        throw new Error('Vault address not found in VaultCreated event');
      }

      console.log('✅ Vault created successfully with Vincent PKP:', vaultAddress);

      // Automatically register common tokens in the new vault
      try {
        console.log('🔍 Auto-registering common tokens in new vault...');
        const commonTokens = [COMMON_TOKENS.WETH, COMMON_TOKENS.USDC];
        await registerExistingTokens(vaultAddress, commonTokens);
        console.log('✅ Common tokens auto-registered in new vault');
      } catch (autoRegisterError) {
        console.warn('⚠️ Failed to auto-register common tokens:', autoRegisterError);
        // Don't fail vault creation if auto-registration fails
      }

      return vaultAddress;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create vault with Vincent PKP';
      console.error('❌ Error creating vault with Vincent PKP:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInfo?.pkp.ethAddress]);

  // Helper function to get a working provider
  const getWorkingProvider = useCallback(async (): Promise<ethers.providers.JsonRpcProvider> => {
    // Skip the problematic sepolia.base.org endpoint and start with working ones
    const rpcEndpoints = [
      'https://base-sepolia.public.blastapi.io',
      'https://base-sepolia.g.alchemy.com/v2/demo',
      'https://sepolia.base.org', // Put this last since it's having issues
    ];

    for (const endpoint of rpcEndpoints) {
      try {
        const provider = new ethers.providers.JsonRpcProvider(endpoint);
        // Test with a simple call that's less likely to fail
        await provider.getBlockNumber();
        console.log(`✅ Using RPC endpoint: ${endpoint}`);
        return provider;
      } catch (error) {
        console.warn(`❌ RPC endpoint ${endpoint} failed:`, error);
        continue;
      }
    }

    // Fallback to vincentProvider if all endpoints fail
    if (vincentProvider) {
      console.log('⚠️ All RPC endpoints failed, using vincentProvider as fallback');
      return vincentProvider;
    }

    throw new Error('No working RPC provider available');
  }, [vincentProvider]);

  // Get vault factory contract (read-only)
  const getVaultFactory = useCallback(async () => {
    const provider = await getWorkingProvider();
    console.log('🔍 Creating VaultFactory contract with address:', CONTRACT_ADDRESSES.VaultFactory);
    return new ethers.Contract(CONTRACT_ADDRESSES.VaultFactory, VAULT_FACTORY_ABI, provider);
  }, [getWorkingProvider]);

  // Get user vault contract (read-only)
  const getUserVault = useCallback(
    async (vaultAddress: string) => {
      console.log('🔍 getUserVault: Creating contract with address:', vaultAddress);
      const provider = await getWorkingProvider();
      const contract = new ethers.Contract(vaultAddress, USER_VAULT_ABI, provider);
      console.log('🔍 getUserVault: Contract created:', contract);
      return contract;
    },
    [getWorkingProvider]
  );

  // Get ERC20 contract (read-only)
  const getERC20Contract = useCallback(
    async (tokenAddress: string) => {
      const provider = await getWorkingProvider();
      return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    },
    [getWorkingProvider]
  );

  // Check if user has a vault
  const hasVault = useCallback(async (): Promise<boolean> => {
    const account = getVincentAccount();

    if (!account) {
      console.log('🔍 hasVault: No Vincent wallet to check');
      return false;
    }

    try {
      console.log('🔍 hasVault: Checking for Vincent account:', account);
      const factory = await getVaultFactory();
      const result = await factory.hasVault(account);
      console.log('🔍 hasVault: Result:', result);
      return result;
    } catch (err) {
      console.error('❌ Error checking vault:', err);
      return false;
    }
  }, [getVincentAccount, getVaultFactory]);

  // Get user's vault address
  const getVaultAddress = useCallback(async (): Promise<string | null> => {
    const account = getVincentAccount();

    if (!account) {
      console.log('🔍 getVaultAddress: No Vincent wallet to check');
      return null;
    }

    try {
      console.log('🔍 getVaultAddress: Getting vault for Vincent account:', account);
      const factory = await getVaultFactory();
      const address = await factory.getVault(account);
      console.log('🔍 getVaultAddress: Raw address:', address);
      const result = address === '0x0000000000000000000000000000000000000000' ? null : address;
      console.log('🔍 getVaultAddress: Final result:', result);
      return result;
    } catch (err) {
      console.error('❌ Error getting vault address:', err);
      return null;
    }
  }, [getVincentAccount, getVaultFactory]);

  // Get token info (name, symbol, decimals)
  const getTokenInfo = useCallback(
    async (tokenAddress: string) => {
      try {
        const erc20 = await getERC20Contract(tokenAddress);
        const [name, symbol, decimals] = await Promise.all([
          erc20.name(),
          erc20.symbol(),
          erc20.decimals(),
        ]);
        return { name, symbol, decimals };
      } catch (err) {
        console.error('Error getting token info:', err);
        return { name: 'Unknown', symbol: 'UNK', decimals: 18 };
      }
    },
    [getERC20Contract]
  );

  // Get vault info
  const getVaultInfo = useCallback(
    async (vaultAddress: string): Promise<VaultInfo> => {
      try {
        const vault = await getUserVault(vaultAddress);
        const provider = await getWorkingProvider();

        const code = await provider.getCode(vaultAddress);
        if (code === '0x') {
          throw new Error('No contract found at this address');
        }

        const ownerTest = await vault.owner();
        const factoryTest = await vault.factory();

        // Try getVaultInfo() first, fallback to individual calls if it fails
        let ownerFromContract, factoryFromContract, tokenCount;
        try {
          [ownerFromContract, factoryFromContract, tokenCount] = await vault.getVaultInfo();
        } catch {
          // Fallback to individual calls
          ownerFromContract = ownerTest;
          factoryFromContract = factoryTest;
          tokenCount = await vault.getSupportedTokenCount();
        }

        let supportedTokens = [];
        try {
          supportedTokens = await vault.getSupportedTokens();
        } catch {
          supportedTokens = [];
        }

        let balancesRaw = [];
        let tokensToCheck = [];

        try {
          // Only check the two specific tokens: WETH and USDC
          const specificTokens = [
            '0x4200000000000000000000000000000000000006', // WETH
            '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
          ];
          tokensToCheck = specificTokens;

          // Get balances for each token individually using getBalance()
          balancesRaw = await Promise.all(
            tokensToCheck.map(async (tokenAddress: string) => {
              try {
                return await vault.getBalance(tokenAddress);
              } catch {
                return ethers.BigNumber.from(0);
              }
            })
          );
        } catch {
          balancesRaw = [];
          tokensToCheck = [
            '0x4200000000000000000000000000000000000006', // WETH
            '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
          ];
        }

        const balances: TokenBalance[] = await Promise.all(
          tokensToCheck.map(async (tokenAddress: string, index: number) => {
            try {
              const erc20 = await getERC20Contract(tokenAddress);
              const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
              const rawBalance = balancesRaw[index]?.toString() || '0';
              return {
                address: tokenAddress,
                symbol: symbol,
                balance: rawBalance, // Keep raw balance in wei
                decimals: decimals,
              };
            } catch {
              return {
                address: tokenAddress,
                symbol: 'UNK',
                balance: '0',
                decimals: 18,
              };
            }
          })
        );

        // Filter out tokens with zero balance to avoid cluttering the UI
        const nonZeroBalances = balances.filter(balance => {
          const balanceWei = ethers.BigNumber.from(balance.balance);
          return balanceWei.gt(0);
        });

        const result = {
          address: vaultAddress,
          owner: ownerFromContract,
          factory: factoryFromContract,
          balances: nonZeroBalances,
          supportedTokens,
          tokenCount: tokenCount.toNumber(),
        };

        return result;
      } catch (err) {
        console.error('❌ Error getting vault info:', err);
        throw err;
      }
    },
    [getUserVault, getERC20Contract, getWorkingProvider]
  );

  // Withdraw tokens from vault using Vincent EVM Transaction Signer Ability
  const withdraw = useCallback(
    async (
      vaultAddress: string,
      tokenAddress: string,
      amount: string,
      recipientAddress: string
    ): Promise<void> => {
      if (!authInfo?.pkp.ethAddress) {
        throw new Error('No Vincent PKP wallet connected');
      }

      if (!authInfo?.jwt) {
        throw new Error('No Vincent JWT available. Please re-authenticate.');
      }

      if (!env.VITE_DELEGATEE_PRIVATE_KEY) {
        throw new Error(
          'Delegatee private key not configured. Please add VITE_DELEGATEE_PRIVATE_KEY to your .env file'
        );
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 ===== WITHDRAW TRANSACTION DEBUG INFO =====');
        console.log('🔍 Withdrawing tokens with Vincent PKP wallet:', authInfo.pkp.ethAddress);
        console.log('🔍 Vault address:', vaultAddress);
        console.log('🔍 Token address:', tokenAddress);
        console.log('🔍 Amount (wei):', amount);
        console.log('🔍 Recipient address:', recipientAddress);
        console.log('🔍 ===========================================');

        // Create Vincent signer with EVM Transaction Signer Ability
        const vincentSigner = new VincentSigner(
          'https://sepolia.base.org', // Base Sepolia RPC
          authInfo.pkp.ethAddress,
          env.VITE_DELEGATEE_PRIVATE_KEY,
          authInfo.jwt
        );

        // Create vault contract instance with Vincent signer
        const vault = vincentSigner.createContract(vaultAddress, USER_VAULT_ABI);

        // Send withdraw transaction using Vincent PKP with EVM Transaction Signer Ability
        console.log('🔍 Sending withdrawTo transaction with Vincent PKP...');
        const tx = await vincentSigner.sendContractTransaction(
          vault,
          'withdrawTo',
          tokenAddress,
          amount,
          recipientAddress
        );
        console.log('🔍 Withdraw transaction sent:', tx.hash);

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log('🔍 Withdraw transaction confirmed:', receipt);

        // Parse the TokensWithdrawn event to verify the withdrawal
        const tokensWithdrawnEvent = receipt.logs.find((log: ethers.providers.Log) => {
          try {
            const parsed = vault.interface.parseLog(log);
            return parsed?.name === 'TokensWithdrawn';
          } catch {
            return false;
          }
        });

        if (tokensWithdrawnEvent) {
          const parsedEvent = vault.interface.parseLog(tokensWithdrawnEvent);
          console.log('✅ TokensWithdrawn event found:', parsedEvent?.args);
        }

        console.log('✅ Tokens withdrawn successfully with Vincent PKP');
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to withdraw tokens with Vincent PKP';
        console.error('❌ Error withdrawing tokens with Vincent PKP:', err);
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [authInfo?.pkp.ethAddress, authInfo?.jwt]
  );

  // Register existing tokens in vault
  const registerExistingTokens = useCallback(
    async (vaultAddress: string, tokenAddresses: string[]): Promise<void> => {
      if (!authInfo?.pkp.ethAddress) {
        throw new Error('No Vincent PKP wallet connected');
      }

      if (!authInfo?.jwt) {
        throw new Error('No Vincent JWT available. Please re-authenticate.');
      }

      if (!env.VITE_DELEGATEE_PRIVATE_KEY) {
        throw new Error(
          'Delegatee private key not configured. Please add VITE_DELEGATEE_PRIVATE_KEY to your .env file'
        );
      }

      if (tokenAddresses.length === 0) {
        console.log('🔍 No tokens to register');
        return;
      }

      try {
        console.log('🔍 Registering existing tokens:', tokenAddresses);

        const vincentSigner = new VincentSigner(
          'https://sepolia.base.org',
          authInfo.pkp.ethAddress,
          env.VITE_DELEGATEE_PRIVATE_KEY,
          authInfo.jwt
        );

        const vault = vincentSigner.createContract(vaultAddress, USER_VAULT_ABI);

        const tx = await vincentSigner.sendContractTransaction(vault, 'registerExistingTokens', [
          tokenAddresses,
        ]);
        console.log('🔍 Registration transaction sent:', tx.hash);

        await tx.wait();
        console.log('✅ Tokens registered successfully');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to register tokens';
        console.error('❌ Error registering tokens:', err);
        throw new Error(errorMessage);
      }
    },
    [authInfo?.pkp.ethAddress, authInfo?.jwt]
  );

  // Auto-register tokens that have balances but aren't registered
  const autoRegisterCommonTokens = useCallback(
    async (vaultAddress: string): Promise<void> => {
      if (!authInfo?.pkp.ethAddress || !authInfo?.jwt) {
        return;
      }

      try {
        // Check common tokens first, then any other tokens that might have balances
        const tokensToCheck = [
          COMMON_TOKENS.WETH,
          COMMON_TOKENS.USDC,
          // Add any other tokens you want to check
        ];

        const tokensToRegister: string[] = [];
        const provider = await getWorkingProvider();

        // Get currently supported tokens to avoid re-registering
        const vaultContract = new ethers.Contract(
          vaultAddress,
          ['function getSupportedTokens() external view returns (address[] memory)'],
          provider
        );
        const supportedTokens = await vaultContract.getSupportedTokens();

        for (const tokenAddress of tokensToCheck) {
          try {
            // Check if token has balance in vault
            const tokenContract = new ethers.Contract(
              tokenAddress,
              ['function balanceOf(address owner) view returns (uint256)'],
              provider
            );
            const balance = await tokenContract.balanceOf(vaultAddress);

            if (balance.gt(0)) {
              if (!supportedTokens.includes(tokenAddress)) {
                tokensToRegister.push(tokenAddress);
              }
            }
          } catch (tokenError) {
            console.warn('⚠️ Error checking token:', tokenAddress, tokenError);
          }
        }

        // Register tokens that have balances but aren't registered
        if (tokensToRegister.length > 0) {
          await registerExistingTokens(vaultAddress, tokensToRegister);
        }
      } catch (error) {
        console.warn('⚠️ Failed to auto-register tokens:', error);
        // Don't throw - this is a background operation
      }
    },
    [authInfo?.pkp.ethAddress, authInfo?.jwt, registerExistingTokens, getWorkingProvider]
  );

  // Deposit tokens to vault
  const deposit = useCallback(
    async (
      vaultAddress: string,
      tokenAddress: string,
      amount: string,
      decimals: number
    ): Promise<void> => {
      if (!authInfo?.pkp.ethAddress) {
        throw new Error('No Vincent PKP wallet connected');
      }

      if (!authInfo?.jwt) {
        throw new Error('No Vincent JWT available. Please re-authenticate.');
      }

      if (!env.VITE_DELEGATEE_PRIVATE_KEY) {
        throw new Error(
          'Delegatee private key not configured. Please add VITE_DELEGATEE_PRIVATE_KEY to your .env file'
        );
      }

      setLoading(true);
      setError(null);

      try {
        console.log('💰 Depositing tokens to vault...', {
          vaultAddress,
          tokenAddress,
          amount,
          decimals,
        });

        // Create Vincent signer with EVM Transaction Signer Ability
        const vincentSigner = new VincentSigner(
          'https://sepolia.base.org', // Base Sepolia RPC
          authInfo.pkp.ethAddress,
          env.VITE_DELEGATEE_PRIVATE_KEY,
          authInfo.jwt
        );

        // Create contract instances with Vincent signer
        const vaultContract = vincentSigner.createContract(vaultAddress, USER_VAULT_ABI);
        const tokenContract = vincentSigner.createContract(tokenAddress, ERC20_ABI);

        const amountWei = ethers.utils.parseUnits(amount, decimals);

        // Check current allowance
        const currentAllowance = await tokenContract.allowance(
          authInfo.pkp.ethAddress,
          vaultAddress
        );

        if (currentAllowance.lt(amountWei)) {
          console.log('🔓 Approving token spending...');
          const approveTx = await vincentSigner.sendContractTransaction(
            tokenContract,
            'approve',
            vaultAddress,
            amountWei
          );
          console.log('✅ Token approval confirmed:', approveTx.hash);
        }

        // Execute deposit
        console.log('💰 Executing deposit transaction...');
        const depositTx = await vincentSigner.sendContractTransaction(
          vaultContract,
          'deposit',
          tokenAddress,
          amountWei
        );

        console.log('✅ Deposit successful!', depositTx.hash);
      } catch (error: unknown) {
        console.error('❌ Deposit failed:', error);
        setError(error instanceof Error ? error.message : 'Deposit failed');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [authInfo?.pkp.ethAddress, authInfo?.jwt]
  );

  return {
    loading,
    error,
    hasVault,
    getVaultAddress,
    createVaultWithVincent,
    getVaultInfo,
    getTokenInfo,
    withdraw,
    registerExistingTokens,
    autoRegisterCommonTokens,
    deposit,
  };
};
