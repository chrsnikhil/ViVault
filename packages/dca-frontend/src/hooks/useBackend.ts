import { useCallback } from 'react';

import { useJwtContext, useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';

const { VITE_APP_ID, VITE_BACKEND_URL, VITE_REDIRECT_URI } = env;

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const useBackend = () => {
  const { authInfo } = useJwtContext();
  const vincentWebAuthClient = useVincentWebAuthClient(VITE_APP_ID);

  // Debug: Log authentication state
  console.log('useBackend - authInfo:', authInfo);
  console.log('useBackend - VITE_APP_ID:', VITE_APP_ID);
  console.log('useBackend - VITE_REDIRECT_URI:', VITE_REDIRECT_URI);

  const getJwt = useCallback(() => {
    try {
      console.log('🔍 DEBUG: Starting Vincent authentication...', {
        appId: VITE_APP_ID,
        redirectUri: VITE_REDIRECT_URI,
        expectedUri: 'http://localhost:5173',
        isCorrect: VITE_REDIRECT_URI === 'http://localhost:5173',
      });

      // Redirect to Vincent Auth consent page with appId and version
      vincentWebAuthClient.redirectToConnectPage({
        redirectUri: VITE_REDIRECT_URI,
      });
    } catch (error) {
      console.error('Vincent authentication error:', error);
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [vincentWebAuthClient]);

  const sendRequest = useCallback(
    async <T>(endpoint: string, method: HTTPMethod, body?: unknown): Promise<T> => {
      if (!authInfo?.jwt) {
        throw new Error('No JWT to query backend');
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${authInfo.jwt}`,
      };
      if (body != null) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${VITE_BACKEND_URL}${endpoint}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as { data: T; success: boolean };

      if (!json.success) {
        throw new Error(`Backend error: ${json.data}`);
      }

      return json.data;
    },
    [authInfo]
  );

  return {
    getJwt,
    sendRequest,
  };
};
