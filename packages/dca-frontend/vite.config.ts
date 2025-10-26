import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build';

  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '');

  // Debug: Log directory and mode
  console.log('🔍 Vite Config - Current working directory:', process.cwd());
  console.log('🔍 Vite Config - Mode:', mode);
  console.log(
    '🔍 Vite Config - Loaded env variables:',
    Object.keys(env).filter((key) => key.startsWith('VITE_'))
  );
  console.log('🔍 Vite Config - VITE_APP_ID:', env.VITE_APP_ID);
  console.log(
    '🔍 Vite Config - VITE_DELEGATEE_PRIVATE_KEY:',
    env.VITE_DELEGATEE_PRIVATE_KEY ? '***exists***' : 'undefined'
  );

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
      'process.env': {},
      'process.browser': true,
      'process.version': '"v16.0.0"',
      'process.platform': '"browser"',
      'process.nextTick': 'setTimeout',
      Browser: 'undefined', // Fix for brotli package
    },
    optimizeDeps: {
      include: [
        '@lit-protocol/vincent-app-sdk/jwt',
        '@lit-protocol/vincent-app-sdk/webAuthClient',
        '@lit-protocol/vincent-ability-uniswap-swap',
        'buffer',
      ], // Dev: delete node_modules/.vite when rebuilding this
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        brotli: path.resolve(__dirname, './src/lib/brotli-mock.js'), // Mock brotli for browser
        'scheduler': path.resolve(__dirname, './src/lib/scheduler-polyfill.ts'), // Scheduler polyfill
      },
    },
    build: {
      sourcemap: false, // Disable sourcemaps to save memory during build
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild', // Use faster esbuild instead of terser
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Simple chunk splitting to avoid circular dependencies
            if (id.includes('node_modules')) {
              // Keep all node_modules in one chunk to avoid circular dependency issues
              return 'vendor';
            }
          },
        },
        onwarn(warning, warn) {
          // Suppress specific warnings to reduce noise during build
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        },
      },
    },
  };
});
