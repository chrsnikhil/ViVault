import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY, LIT_RPC } from '@lit-protocol/constants';
import { createSiweMessage, generateAuthSig, LitPKPResource } from '@lit-protocol/auth-helpers';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';
import { PKPWalletConnect } from '@lit-protocol/pkp-walletconnect';
import { ethers } from 'ethers';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

interface PKPWalletConnectContextType {
  // PKP Wallet state
  pkpEthersWallet: PKPEthersWallet | null;
  pkpWalletConnect: PKPWalletConnect | null;
  isInitialized: boolean;
  isConnected: boolean;

  // Connection methods
  initializePKPWallet: () => Promise<void>;
  connectToDApp: (uri: string) => Promise<void>;
  disconnectFromDApp: (topic: string) => Promise<void>;

  // Session management
  activeSessions: unknown[];
  getActiveSessions: () => unknown[];
}

const PKPWalletConnectContext = createContext<PKPWalletConnectContextType | undefined>(undefined);

export const usePKPWalletConnect = () => {
  const context = useContext(PKPWalletConnectContext);
  if (!context) {
    throw new Error('usePKPWalletConnect must be used within a PKPWalletConnectProvider');
  }
  return context;
};

interface PKPWalletConnectProviderProps {
  children: React.ReactNode;
}

export const PKPWalletConnectProvider: React.FC<PKPWalletConnectProviderProps> = ({ children }) => {
  const { authInfo } = useJwtContext();

  // State
  const [pkpEthersWallet, setPkpEthersWallet] = useState<PKPEthersWallet | null>(null);
  const [pkpWalletConnect, setPkpWalletConnect] = useState<PKPWalletConnect | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeSessions, setActiveSessions] = useState<unknown[]>([]);

  // Initialize PKP Wallet following the docs exactly

  const initializePKPWallet = useCallback(async () => {
    if (!authInfo?.pkp.ethAddress || !authInfo?.pkp.publicKey) {
      console.log('🔍 No Vincent PKP wallet available for WalletConnect');
      return;
    }

    try {
      console.log('🔍 Initializing PKP WalletConnect...');

      // Step 1: Create ethers wallet for controller (delegatee)
      const ETHEREUM_PRIVATE_KEY =
        '0xcbe08e167d797d1420612467230e4b8a551b6fa56e300808dda6cbfba6cc6eb3'; // From env
      const LIT_PKP_PUBLIC_KEY = authInfo.pkp.publicKey;

      const ethersWallet = new ethers.Wallet(
        ETHEREUM_PRIVATE_KEY,
        new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
      );

      // Step 2: Initialize Lit Node Client
      const litNodeClient = new LitNodeClient({
        litNetwork: LIT_NETWORK.DatilDev, // Using DatilDev for development
        debug: false,
      });
      await litNodeClient.connect();

      // Step 3: Generate session signatures
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 10); // 10 minutes from now
      const sessionSignatures = await litNodeClient.getSessionSigs({
        chain: 'ethereum',
        expiration: expirationTime.toISOString(), // 10 minutes
        resourceAbilityRequests: [
          {
            resource: new LitPKPResource('*'),
            ability: LIT_ABILITY.PKPSigning,
          },
        ],
        authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
          const toSign = await createSiweMessage({
            uri,
            expiration,
            resources: resourceAbilityRequests,
            walletAddress: await ethersWallet.getAddress(),
            nonce: await litNodeClient.getLatestBlockhash(),
            litNodeClient,
          });

          return await generateAuthSig({
            signer: ethersWallet,
            toSign,
          });
        },
      });

      // Step 4: Create PKPEthersWallet
      const pkpWallet = new PKPEthersWallet({
        litNodeClient,
        pkpPubKey: LIT_PKP_PUBLIC_KEY,
        controllerSessionSigs: sessionSignatures,
      });

      // Step 5: Create PKPWalletConnect
      const pkpWalletConnect = new PKPWalletConnect();
      pkpWalletConnect.addPKPEthersWallet(pkpWallet);

      // Step 6: Initialize WalletConnect with config
      const config = {
        projectId: 'cmguggazn00jpji0cjxrxu8em', // Using the same project ID from Privy
        metadata: {
          name: 'ViVault PKP Wallet',
          description: 'Vincent PKP Wallet for ViVault',
          url: 'https://vivault.com/',
          icons: ['https://vivault.com/favicon.png'],
        },
      };

      await pkpWalletConnect.initWalletConnect(config);

      // Step 7: Set up event listeners
      setupEventListeners(pkpWalletConnect);

      // Update state
      setPkpEthersWallet(pkpWallet);
      setPkpWalletConnect(pkpWalletConnect);
      setIsInitialized(true);
      setIsConnected(true);

      console.log('✅ PKP WalletConnect initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PKP WalletConnect:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInfo]);

  // Set up event listeners following the docs
  const setupEventListeners = useCallback((pkpWalletConnect: PKPWalletConnect) => {
    // Session Proposal Handler
    pkpWalletConnect.on('session_proposal', async (proposal) => {
      console.log('🔍 Received session proposal: ', proposal);

      try {
        // Accept session proposal
        await pkpWalletConnect.approveSessionProposal(proposal);
        console.log('✅ Session proposal approved');

        // Update active sessions
        const sessions = Object.values(pkpWalletConnect.getActiveSessions());
        setActiveSessions(sessions);

        for (const session of sessions) {
          const { name, url } = session.peer.metadata;
          console.log(`🔍 Active Session: ${name} (${url})`);
        }
      } catch (error) {
        console.error('❌ Failed to approve session proposal:', error);
      }
    });

    // Session Request Handler
    pkpWalletConnect.on('session_request', async (requestEvent) => {
      console.log('🔍 Received session request: ', requestEvent);

      try {
        const { topic, params } = requestEvent;
        const { request } = params;
        const signClient = pkpWalletConnect.getSignClient();
        const requestSession = signClient.session.get(topic);
        const { name, url } = requestSession.peer.metadata;

        // Accept session request
        console.log(`🔍 Approving ${request.method} request for session ${name} (${url})...`);
        await pkpWalletConnect.approveSessionRequest(requestEvent);
        console.log(`✅ Check the ${name} dapp to confirm whether the request was approved`);
      } catch (error) {
        console.error('❌ Failed to approve session request:', error);
      }
    });
  }, []);

  // Connect to dApp using URI
  const connectToDApp = useCallback(
    async (uri: string) => {
      if (!pkpWalletConnect) {
        throw new Error('PKP WalletConnect not initialized');
      }

      try {
        console.log('🔍 Pairing with dApp URI:', uri);
        await pkpWalletConnect.pair({ uri });
        console.log('✅ Successfully paired with dApp');
      } catch (error) {
        console.error('❌ Failed to pair with dApp:', error);
        throw error;
      }
    },
    [pkpWalletConnect]
  );

  // Disconnect from dApp
  const disconnectFromDApp = useCallback(
    async (topic: string) => {
      if (!pkpWalletConnect) {
        throw new Error('PKP WalletConnect not initialized');
      }

      try {
        const signClient = pkpWalletConnect.getSignClient();
        await signClient.disconnect({
          topic,
          reason: { code: 6000, message: 'User disconnected' },
        });

        // Update active sessions
        const sessions = Object.values(pkpWalletConnect.getActiveSessions());
        setActiveSessions(sessions);

        console.log('✅ Disconnected from dApp');
      } catch (error) {
        console.error('❌ Failed to disconnect from dApp:', error);
        throw error;
      }
    },
    [pkpWalletConnect]
  );

  // Get active sessions
  const getActiveSessions = useCallback(() => {
    if (!pkpWalletConnect) return [];
    return Object.values(pkpWalletConnect.getActiveSessions());
  }, [pkpWalletConnect]);

  // Initialize when authInfo is available
  useEffect(() => {
    const initWallet = async () => {
      if (authInfo?.pkp.ethAddress && authInfo?.pkp.publicKey && !isInitialized) {
        await initializePKPWallet();
      }
    };
    initWallet();
  }, [authInfo, isInitialized, initializePKPWallet]);

  // Update active sessions periodically
  useEffect(() => {
    const updateSessions = () => {
      if (pkpWalletConnect) {
        const sessions = getActiveSessions();
        setActiveSessions(sessions);
      }
    };
    updateSessions();
  }, [pkpWalletConnect, getActiveSessions]);

  const value: PKPWalletConnectContextType = {
    pkpEthersWallet,
    pkpWalletConnect,
    isInitialized,
    isConnected,
    initializePKPWallet,
    connectToDApp,
    disconnectFromDApp,
    activeSessions,
    getActiveSessions,
  };

  return (
    <PKPWalletConnectContext.Provider value={value}>{children}</PKPWalletConnectContext.Provider>
  );
};
