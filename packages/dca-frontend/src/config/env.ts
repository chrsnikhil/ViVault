// import { createEnv } from '@t3-oss/env-core';
// import { z } from 'zod';

// Ref: https://github.com/t3-oss/t3-env/pull/145
// const booleanStrings = ['true', 'false', true, false, '1', '0', 'yes', 'no', 'y', 'n', 'on', 'off'];
// const BooleanOrBooleanStringSchema = z
//   .any()
//   .refine((val) => booleanStrings.includes(val), { message: 'must be boolean' })
//   .transform((val) => {
//     if (typeof val === 'boolean') return val;
//     if (typeof val === 'string') {
//       const normalized = val.toLowerCase().trim();
//       if (['true', 'yes', 'y', '1', 'on'].includes(normalized)) return true;
//       if (['false', 'no', 'n', '0', 'off'].includes(normalized)) return false;
//       throw new Error(`Invalid boolean string: "${val}"`);
//     }
//     throw new Error(`Expected boolean or boolean string, got: ${typeof val}`);
//   });

// export const env = createEnv({
//   emptyStringAsUndefined: true,
//   runtimeEnv: import.meta.env,
//   clientPrefix: 'VITE_',
//   client: {
//     VITE_APP_ID: import.meta.env.VITE_APP_ID,
//     VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
//     VITE_EXPECTED_AUDIENCE: import.meta.env.VITE_EXPECTED_AUDIENCE,
//     VITE_IS_DEVELOPMENT: import.meta.env.VITE_IS_DEVELOPMENT,
//     // VITE_IS_DEVELOPMENT: BooleanOrBooleanStringSchema.default(import.meta.env.VITE_IS_DEVELOPMENT),
//     // VITE_REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI,
//     // VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
//     // VITE_SENTRY_FILTER: import.meta.env.VITE_SENTRY_FILTER,
//   },
// });
// Debug: Log what we're getting from import.meta.env
console.log('Raw VITE_APP_ID:', import.meta.env.VITE_APP_ID);
console.log('Raw VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log('All import.meta.env:', import.meta.env);

export const env = {
  VITE_APP_ID: 711198988, // Hardcoded for now
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  VITE_EXPECTED_AUDIENCE: import.meta.env.VITE_EXPECTED_AUDIENCE || 'http://localhost:5173',
  VITE_IS_DEVELOPMENT: import.meta.env.VITE_IS_DEVELOPMENT === 'true' || true,
  VITE_REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173',
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_SENTRY_FILTER: import.meta.env.VITE_SENTRY_FILTER,
};

// Debug: Log the final env object
console.log('Final env object:', env);
