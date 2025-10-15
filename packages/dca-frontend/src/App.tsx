import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { JwtProvider, useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';

import './App.css';

import { Home } from '@/pages/home';
import { Login } from '@/pages/login';

const { VITE_APP_ID } = env;

function AppContent() {
  const { authInfo, error } = useJwtContext();

  if (error) {
    console.error('Vincent authentication error:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Error</h1>
          <p className="text-muted-foreground mb-4">
            There was an issue with Vincent authentication. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return authInfo ? <Home /> : <Login />;
}

function App() {
  return (
    <JwtProvider appId={VITE_APP_ID}>
      <AppContent />
    </JwtProvider>
  );
}

export default App;
