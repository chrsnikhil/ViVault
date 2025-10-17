import { useCallback, useState } from 'react';
import { Contract } from 'ethers';
import { useWeb3 } from '@/contexts/web3-context';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
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
  const { provider } = useWeb3();
  const { authInfo } = useJwtContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get vault factory contract
  const getVaultFactory = useCallback(() => {
    if (!provider) throw new Error('Provider not connected');
    console.log('🔍 Creating VaultFactory contract with address:', CONTRACT_ADDRESSES.VaultFactory);
    return new Contract(CONTRACT_ADDRESSES.VaultFactory, VAULT_FACTORY_ABI, provider);
  }, [provider]);

  // Get user vault contract
  const getUserVault = useCallback(
    (vaultAddress: string) => {
      if (!provider) throw new Error('Provider not connected');
      return new Contract(vaultAddress, USER_VAULT_ABI, provider);
    },
    [provider]
  );

  // Get ERC20 contract
  const getERC20Contract = useCallback(
    (tokenAddress: string) => {
      if (!provider) throw new Error('Provider not connected');
      return new Contract(tokenAddress, ERC20_ABI, provider);
    },
    [provider]
  );

  // Check if user has a vault
  const hasVault = useCallback(async (): Promise<boolean> => {
    if (!authInfo?.pkp.ethAddress) {
      console.log('🔍 hasVault: No authInfo or ethAddress');
      return false;
    }
    try {
      console.log('🔍 hasVault: Checking for account:', authInfo.pkp.ethAddress);
      const factory = getVaultFactory();
      const result = await factory.hasVault(authInfo.pkp.ethAddress);
      console.log('🔍 hasVault: Result:', result);
      return result;
    } catch (err) {
      console.error('❌ Error checking vault:', err);
      return false;
    }
  }, [authInfo?.pkp.ethAddress, getVaultFactory]);

  // Get user's vault address
  const getVaultAddress = useCallback(async (): Promise<string | null> => {
    if (!authInfo?.pkp.ethAddress) {
      console.log('🔍 getVaultAddress: No authInfo or ethAddress');
      return null;
    }
    try {
      console.log('🔍 getVaultAddress: Getting vault for account:', authInfo.pkp.ethAddress);
      const factory = getVaultFactory();
      const address = await factory.getVault(authInfo.pkp.ethAddress);
      console.log('🔍 getVaultAddress: Raw address:', address);
      const result = address === '0x0000000000000000000000000000000000000000' ? null : address;
      console.log('🔍 getVaultAddress: Final result:', result);
      return result;
    } catch (err) {
      console.error('❌ Error getting vault address:', err);
      return null;
    }
  }, [authInfo?.pkp.ethAddress, getVaultFactory]);

  // Create a new vault (simple contract call, no Vincent Abilities needed)
  const createVault = useCallback(async (): Promise<string> => {
    if (!authInfo?.pkp.ethAddress) throw new Error('No Vincent wallet connected');
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Creating vault for account:', authInfo.pkp.ethAddress);
      const factory = getVaultFactory();

      // Check if user already has a vault
      const hasVaultResult = await factory.hasVault(authInfo.pkp.ethAddress);
      if (hasVaultResult) {
        throw new Error('User already has a vault');
      }

      // For now, we'll show a message that this requires Vincent Abilities
      const message =
        'Vault creation requires Vincent Abilities for secure PKP wallet transactions. This will be implemented with the Vincent Ability SDK.';
      setError(message);
      alert(message);
      throw new Error(message);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vault';
      setError(errorMessage);
      console.error('❌ Error creating vault:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [authInfo?.pkp.ethAddress, getVaultFactory]);

  // Get vault info
  const getVaultInfo = useCallback(
    async (vaultAddress: string): Promise<VaultInfo> => {
      try {
        const vault = getUserVault(vaultAddress);
        const owner = await vault.owner();
        const factoryAddress = await vault.factory();
        const [tokenCount] = await vault.getVaultInfo();

        // Get supported tokens
        const supportedTokens = await vault.getSupportedTokens();

        // Get balances for common tokens
        const balancesRaw = await vault.getBalances(Object.values(COMMON_TOKENS));
        const balances: TokenBalance[] = await Promise.all(
          Object.keys(COMMON_TOKENS).map(async (symbol, index) => {
            const tokenAddress = COMMON_TOKENS[symbol as keyof typeof COMMON_TOKENS];
            const erc20 = getERC20Contract(tokenAddress);
            const decimals = await erc20.decimals();
            return {
              address: tokenAddress,
              symbol: symbol,
              balance: (parseFloat(balancesRaw[index].toString()) / 10 ** decimals).toString(),
              decimals: decimals,
            };
          })
        );

        return {
          address: vaultAddress,
          owner,
          factory: factoryAddress,
          balances,
          supportedTokens,
          tokenCount: tokenCount.toNumber(),
        };
      } catch (err) {
        console.error('Error getting vault info:', err);
        throw err;
      }
    },
    [getUserVault, getERC20Contract]
  );

  // Deposit tokens to vault (requires Vincent Ability)
  const deposit = useCallback(
    async (
      _vaultAddress: string, // eslint-disable-line @typescript-eslint/no-unused-vars
      _tokenAddress: string, // eslint-disable-line @typescript-eslint/no-unused-vars
      _amount: string // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<void> => {
      if (!authInfo?.pkp.ethAddress) throw new Error('No Vincent wallet connected');
      setLoading(true);
      setError(null);

      try {
        // TODO: Implement Vincent Ability for token deposit
        const message =
          'Token deposit requires Vincent Abilities. This will be implemented with Vincent SDK.';
        setError(message);
        alert(message);
        throw new Error(message);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to deposit tokens';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [authInfo?.pkp.ethAddress]
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
    createVault,
    getVaultInfo,
    deposit,
    withdraw,
  };
};
