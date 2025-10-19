import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { usePrivy } from '@privy-io/react-auth';
import { useChain } from '@/hooks/useChain';

interface PrivyWalletContextType {
  privyProvider: ethers.providers.JsonRpcProvider | null;
  privySigner: ethers.Signer | null;
  privyAccount: string | null;
  privyUser: unknown | null;
  connectPrivyWallet: () => Promise<void>;
  disconnectPrivyWallet: () => void;
  switchToPrivyWallet: () => void;
}

const PrivyWalletContext = createContext<PrivyWalletContextType | undefined>(undefined);

export const usePrivyWallet = () => {
  const context = useContext(PrivyWalletContext);
  if (!context) {
    throw new Error('usePrivyWallet must be used within a PrivyWalletProvider');
  }
  return context;
};

interface PrivyWalletProviderProps {
  children: React.ReactNode;
}

export const PrivyWalletProvider: React.FC<PrivyWalletProviderProps> = ({ children }) => {
  const {
    user: privyUser,
    authenticated: privyAuthenticated,
    login: privyLogin,
    logout: privyLogout,
  } = usePrivy();
  const { provider: chainProvider } = useChain();

  // Privy wallet state
  const [privyProvider, setPrivyProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [privySigner, setPrivySigner] = useState<ethers.Signer | null>(null);
  const [privyAccount, setPrivyAccount] = useState<string | null>(null);

  // Initialize Privy wallet
  useEffect(() => {
    console.log('🔍 PrivyWallet: useEffect triggered', {
      privyAuthenticated,
      privyUser: !!privyUser,
    });

    const updatePrivyState = () => {
      if (privyAuthenticated && privyUser) {
        console.log('🔍 PrivyWallet: Privy wallet detected:', privyUser);

        // Get the embedded wallet from Privy user
        const embeddedWallet = privyUser.wallet;
        if (embeddedWallet && embeddedWallet.address) {
          try {
            // Use the chain provider with the embedded wallet address
            setPrivyProvider(chainProvider);
            setPrivySigner(chainProvider?.getSigner(embeddedWallet.address) || null);
            setPrivyAccount(embeddedWallet.address);

            console.log('🔍 Privy wallet initialized successfully:', embeddedWallet.address);
          } catch (err: unknown) {
            console.error('❌ Failed to initialize Privy wallet:', err);
          }
        } else {
          console.log('🔍 PrivyWallet: No embedded wallet found in user object');
          setPrivyAccount(null);
          setPrivySigner(null);
          setPrivyProvider(null);
        }
      } else {
        console.log('🔍 PrivyWallet: No Privy wallet connected');
        setPrivyAccount(null);
        setPrivySigner(null);
        setPrivyProvider(null);
      }
    };

    updatePrivyState();
  }, [privyAuthenticated, privyUser, chainProvider]);

  // Connect Privy wallet
  const connectPrivyWallet = async () => {
    try {
      console.log('🔍 PrivyWallet: Connecting to Privy wallet...');
      await privyLogin();
    } catch (error) {
      console.error('Failed to connect Privy wallet:', error);
      throw error;
    }
  };

  // Disconnect Privy wallet
  const disconnectPrivyWallet = () => {
    privyLogout();
    setPrivyProvider(null);
    setPrivySigner(null);
    setPrivyAccount(null);
  };

  // Switch to Privy wallet
  const switchToPrivyWallet = () => {
    if (privyAccount) {
      console.log('🔍 Switched to Privy wallet:', privyAccount);
    } else {
      console.warn('⚠️ No Privy wallet connected');
    }
  };

  const value: PrivyWalletContextType = {
    privyProvider,
    privySigner,
    privyAccount,
    privyUser,
    connectPrivyWallet,
    disconnectPrivyWallet,
    switchToPrivyWallet,
  };

  return <PrivyWalletContext.Provider value={value}>{children}</PrivyWalletContext.Provider>;
};
