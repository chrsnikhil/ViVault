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
  COMMON_TOKENS,
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
      const vincentSigner = new VincentSigner(
        'https://sepolia.base.org', // Base Sepolia RPC
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
      const vaultCreatedEvent = receipt.logs.find((log: unknown) => {
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

      const parsedEvent = factory.interface.parseLog(vaultCreatedEvent as unknown);
      const vaultAddress = parsedEvent?.args.vault;

      if (!vaultAddress) {
        throw new Error('Vault address not found in VaultCreated event');
      }

      console.log('✅ Vault created successfully with Vincent PKP:', vaultAddress);
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

  // Get vault factory contract (read-only)
  const getVaultFactory = useCallback(() => {
    if (!vincentProvider) throw new Error('Vincent provider not connected');
    console.log('🔍 Creating VaultFactory contract with address:', CONTRACT_ADDRESSES.VaultFactory);
    return new ethers.Contract(CONTRACT_ADDRESSES.VaultFactory, VAULT_FACTORY_ABI, vincentProvider);
  }, [vincentProvider]);

  // Get user vault contract (read-only)
  const getUserVault = useCallback(
    (vaultAddress: string) => {
      console.log('🔍 getUserVault: Creating contract with address:', vaultAddress);
      console.log('🔍 getUserVault: Vincent provider:', vincentProvider);
      if (!vincentProvider) throw new Error('Vincent provider not connected');
      const contract = new ethers.Contract(vaultAddress, USER_VAULT_ABI, vincentProvider);
      console.log('🔍 getUserVault: Contract created:', contract);
      return contract;
    },
    [vincentProvider]
  );

  // Get ERC20 contract (read-only)
  const getERC20Contract = useCallback(
    (tokenAddress: string) => {
      if (!vincentProvider) throw new Error('Vincent provider not connected');
      return new ethers.Contract(tokenAddress, ERC20_ABI, vincentProvider);
    },
    [vincentProvider]
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
      const factory = getVaultFactory();
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
      const factory = getVaultFactory();
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
        const erc20 = getERC20Contract(tokenAddress);
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
        console.log('🔍 getVaultInfo: Starting with address:', vaultAddress);
        const vault = getUserVault(vaultAddress);
        console.log('🔍 getVaultInfo: Vault contract created');

        console.log('🔍 getVaultInfo: Getting vault info...');
        console.log('🔍 getVaultInfo: Vault contract address:', vaultAddress);
        console.log('🔍 getVaultInfo: Vault contract instance:', vault);

        // Test individual calls first
        // Test if contract exists by checking code
        console.log('🔍 getVaultInfo: Testing contract code...');
        if (!vincentProvider) {
          throw new Error('Vincent provider not available');
        }

        // Test RPC connection first
        console.log('🔍 getVaultInfo: Testing RPC connection...');
        const blockNumber = await vincentProvider.getBlockNumber();
        console.log('🔍 getVaultInfo: Current block number:', blockNumber);

        const code = await vincentProvider.getCode(vaultAddress);
        console.log('🔍 getVaultInfo: Contract code length:', code.length);
        if (code === '0x') {
          throw new Error('No contract found at this address');
        }

        console.log('🔍 getVaultInfo: Testing owner() call...');
        const ownerTest = await vault.owner();
        console.log('🔍 getVaultInfo: Owner test result:', ownerTest);

        console.log('🔍 getVaultInfo: Testing factory() call...');
        const factoryTest = await vault.factory();
        console.log('🔍 getVaultInfo: Factory test result:', factoryTest);

        // Try getVaultInfo() first, fallback to individual calls if it fails
        let ownerFromContract, factoryFromContract, tokenCount, totalValue;
        try {
          console.log('🔍 getVaultInfo: Testing getVaultInfo() call...');
          [ownerFromContract, factoryFromContract, tokenCount, totalValue] =
            await vault.getVaultInfo();
          console.log('🔍 getVaultInfo: getVaultInfo() call successful');
        } catch (getVaultInfoError) {
          console.log(
            '🔍 getVaultInfo: getVaultInfo() call failed, using individual calls:',
            getVaultInfoError
          );
          // Fallback to individual calls
          ownerFromContract = ownerTest;
          factoryFromContract = factoryTest;
          tokenCount = await vault.getSupportedTokenCount();
          totalValue = 0; // Placeholder
        }

        console.log('🔍 getVaultInfo: Owner from contract:', ownerFromContract);
        console.log('🔍 getVaultInfo: Factory from contract:', factoryFromContract);
        console.log('🔍 getVaultInfo: Token count:', tokenCount.toString());
        console.log('🔍 getVaultInfo: Total value:', totalValue.toString());

        console.log('🔍 getVaultInfo: Getting supported tokens...');
        let supportedTokens = [];
        try {
          supportedTokens = await vault.getSupportedTokens();
          console.log('🔍 getVaultInfo: Supported tokens:', supportedTokens);
        } catch (supportedTokensError) {
          console.log('🔍 getVaultInfo: getSupportedTokens() call failed:', supportedTokensError);
          supportedTokens = [];
        }

        console.log('🔍 getVaultInfo: Getting balances with NEW contract logic...');
        let balancesRaw = [];
        try {
          // NEW: The updated contract's getBalances() now returns actual token balances
          balancesRaw = await vault.getBalances(Object.values(COMMON_TOKENS));
          console.log('🔍 getVaultInfo: Raw balances (actual token balances):', balancesRaw);
        } catch (balancesError) {
          console.log('🔍 getVaultInfo: getBalances() call failed:', balancesError);
          balancesRaw = [];
        }

        const balances: TokenBalance[] = await Promise.all(
          Object.keys(COMMON_TOKENS).map(async (symbol, index) => {
            try {
              const tokenAddress = COMMON_TOKENS[symbol as keyof typeof COMMON_TOKENS];
              const erc20 = getERC20Contract(tokenAddress);
              const decimals = await erc20.decimals();
              return {
                address: tokenAddress,
                symbol: symbol,
                balance: (
                  parseFloat(balancesRaw[index]?.toString() || '0') /
                  10 ** decimals
                ).toString(),
                decimals: decimals,
              };
            } catch (tokenError) {
              console.log(`🔍 getVaultInfo: Error getting info for ${symbol}:`, tokenError);
              return {
                address: COMMON_TOKENS[symbol as keyof typeof COMMON_TOKENS],
                symbol: symbol,
                balance: '0',
                decimals: 18,
              };
            }
          })
        );
        console.log('🔍 getVaultInfo: Processed balances:', balances);

        const result = {
          address: vaultAddress,
          owner: ownerFromContract,
          factory: factoryFromContract,
          balances,
          supportedTokens,
          tokenCount: tokenCount.toNumber(),
        };
        console.log('🔍 getVaultInfo: Final result:', result);
        return result;
      } catch (err) {
        console.error('❌ Error getting vault info:', err);
        throw err;
      }
    },
    [getUserVault, getERC20Contract, vincentProvider]
  );

  // Withdraw tokens from vault (requires Vincent Ability)
  const withdraw = useCallback(
    async (
      _vaultAddress: string, // eslint-disable-line @typescript-eslint/no-unused-vars
      _tokenAddress: string, // eslint-disable-line @typescript-eslint/no-unused-vars
      _amount: string // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<void> => {
      if (!authInfo?.pkp.ethAddress) throw new Error('No Vincent wallet connected');
      setLoading(true);
      setError(null);

      try {
        // TODO: Implement Vincent Ability for token withdrawal
        const message =
          'Token withdrawal requires Vincent Abilities. This will be implemented with Vincent SDK.';
        setError(message);
        alert(message);
        throw new Error(message);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw tokens';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [authInfo?.pkp.ethAddress]
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
  };
};
