import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { useChain } from '@/hooks/useChain';
import { usePKPWalletConnect } from './pkp-walletconnect-context';

interface Web3ContextType {
  // Vincent PKP wallet
  vincentProvider: ethers.providers.JsonRpcProvider | null;
  vincentSigner: ethers.Signer | null;
  vincentAccount: string | null;

  // PKP WalletConnect
  pkpEthersWallet: unknown | null;
  pkpWalletConnect: unknown | null;
  isWalletConnectInitialized: boolean;
  activeSessions: unknown[];

  // Chain info
  chainId: number | null;
  isConnected: boolean;

  // WalletConnect methods
  connectToDApp: (uri: string) => Promise<void>;
  disconnectFromDApp: (topic: string) => Promise<void>;
  getActiveSessions: () => unknown[];
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  const { authInfo } = useJwtContext();
  const { provider: chainProvider, chain } = useChain();
  const {
    pkpEthersWallet,
    pkpWalletConnect,
    isInitialized: isWalletConnectInitialized,
    activeSessions,
    connectToDApp,
    disconnectFromDApp,
    getActiveSessions,
  } = usePKPWalletConnect();

  // Vincent PKP wallet state
  const [vincentProvider, setVincentProvider] = useState<ethers.providers.JsonRpcProvider | null>(
    null
  );
  const [vincentSigner, setVincentSigner] = useState<ethers.Signer | null>(null);
  const [vincentAccount, setVincentAccount] = useState<string | null>(null);

  // Chain info
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Vincent PKP wallet (read-only, cannot sign transactions)
  useEffect(() => {
    console.log('🔍 Web3: useEffect triggered', { authInfo: !!authInfo, chain: chain.name });

    const updateWeb3State = () => {
      if (authInfo?.pkp.ethAddress) {
        console.log('🔍 Web3: Vincent wallet detected:', authInfo.pkp.ethAddress);

        if (chainProvider && authInfo.pkp.ethAddress) {
          try {
            // Vincent PKP wallets cannot sign transactions directly - they require Vincent Abilities
            // We only set up the provider for read-only operations
            setVincentProvider(chainProvider);
            setVincentAccount(authInfo.pkp.ethAddress);
            setVincentSigner(null); // PKP wallets cannot be used as signers
            setChainId(chain.chainId);
            setIsConnected(true);
            console.log('🔍 Vincent wallet initialized (read-only):', authInfo.pkp.ethAddress);
          } catch (err: unknown) {
            console.error('❌ Failed to initialize Vincent wallet:', err);
          }
        }
      } else {
        console.log('🔍 Web3: No Vincent wallet connected', { authInfo: authInfo });
        setVincentAccount(null);
        setVincentSigner(null);
        setVincentProvider(null);
        setIsConnected(false);
      }
    };

    updateWeb3State();
  }, [authInfo, chain, chainProvider]);

  const value: Web3ContextType = {
    // Vincent PKP wallet
    vincentProvider,
    vincentSigner,
    vincentAccount,

    // PKP WalletConnect
    pkpEthersWallet,
    pkpWalletConnect,
    isWalletConnectInitialized,
    activeSessions,

    // Chain info
    chainId,
    isConnected,

    // WalletConnect methods
    connectToDApp,
    disconnectFromDApp,
    getActiveSessions,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
