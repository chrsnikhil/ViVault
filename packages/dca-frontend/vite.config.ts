import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build';

  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  const sentryEnabled =
    isBuild &&
    ((process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') ||
      String(process.env.SENTRY_UPLOAD_SOURCEMAPS).toLowerCase() === 'true');

  return {
    plugins: [
      react({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
      tailwindcss(),
      ...(sentryEnabled
        ? [
            sentryVitePlugin({
              applicationKey: process.env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
            }),
          ]
        : []),
    ],
    define: {
      global: 'globalThis',
      // Explicitly define environment variables
      'import.meta.env.VITE_APP_ID': JSON.stringify(env.VITE_APP_ID),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
      'import.meta.env.VITE_EXPECTED_AUDIENCE': JSON.stringify(env.VITE_EXPECTED_AUDIENCE),
      'import.meta.env.VITE_IS_DEVELOPMENT': JSON.stringify(env.VITE_IS_DEVELOPMENT),
      'import.meta.env.VITE_REDIRECT_URI': JSON.stringify(env.VITE_REDIRECT_URI),
    },
    optimizeDeps: {
      include: ['@lit-protocol/vincent-app-sdk/jwt', '@lit-protocol/vincent-app-sdk/webAuthClient'], // Dev: delete node_modules/.vite when rebuilding this
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer/',
      },
    },
    build: {
      sourcemap: true,
    },
  };
});
