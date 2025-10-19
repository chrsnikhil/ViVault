import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { JwtProvider, useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';
import { ThemeProvider } from '@/contexts/theme-context';
import { Web3Provider } from '@/contexts/web3-context';
import { PKPWalletConnectProvider } from '@/contexts/pkp-walletconnect-context';

import './App.css';

import { Home } from '@/pages/home';
import { Login } from '@/pages/login';

const { VITE_APP_ID } = env;

function AppContent() {
  const { authInfo } = useJwtContext();

  return authInfo ? <Home /> : <Login />;
}

function App() {
  return (
    <ThemeProvider>
      <JwtProvider appId={VITE_APP_ID}>
        <PKPWalletConnectProvider>
          <Web3Provider>
            <AppContent />
          </Web3Provider>
        </PKPWalletConnectProvider>
      </JwtProvider>
    </ThemeProvider>
  );
}

export default App;
