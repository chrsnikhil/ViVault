import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { JwtProvider, useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';
import { ThemeProvider } from '@/contexts/theme-context';
import { Web3Provider } from '@/contexts/web3-context';
import { PriceProvider } from '@/contexts/price-context';

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
        <Web3Provider>
          <PriceProvider>
            <AppContent />
          </PriceProvider>
        </Web3Provider>
      </JwtProvider>
    </ThemeProvider>
  );
}

export default App;
