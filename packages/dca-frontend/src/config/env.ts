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
console.log('🔍 ENV DEBUG - Raw VITE_APP_ID:', import.meta.env.VITE_APP_ID);
console.log('🔍 ENV DEBUG - Raw VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
console.log(
  '🔍 ENV DEBUG - Raw VITE_DELEGATEE_PRIVATE_KEY:',
  import.meta.env.VITE_DELEGATEE_PRIVATE_KEY
);
console.log('🔍 ENV DEBUG - Raw VITE_EXPECTED_AUDIENCE:', import.meta.env.VITE_EXPECTED_AUDIENCE);
console.log('🔍 ENV DEBUG - Raw VITE_IS_DEVELOPMENT:', import.meta.env.VITE_IS_DEVELOPMENT);
console.log('🔍 ENV DEBUG - Raw VITE_REDIRECT_URI:', import.meta.env.VITE_REDIRECT_URI);
console.log('🔍 ENV DEBUG - All import.meta.env keys:', Object.keys(import.meta.env));
console.log('🔍 ENV DEBUG - All import.meta.env:', import.meta.env);

export const env = {
  // Vincent Configuration
  VITE_APP_ID: 711198988, // NUMBER, not string!
  VITE_BACKEND_URL: 'http://localhost:3001',
  VITE_EXPECTED_AUDIENCE: 'http://localhost:5173',
  VITE_IS_DEVELOPMENT: true,
  VITE_REDIRECT_URI: 'http://localhost:5173',
  VITE_SENTRY_DSN: undefined,
  VITE_SENTRY_FILTER: undefined,

  // Vincent PKP Configuration
  VITE_DELEGATEE_PRIVATE_KEY: '0x4fc170047fa98089040a0153e8364877c77d4eab3870cde3b7a2634b08c5616b',
};

// Debug: Log the final env object
console.log('🔍 ENV DEBUG - Final env object:', env);
console.log('🔍 ENV DEBUG - Final VITE_DELEGATEE_PRIVATE_KEY:', env.VITE_DELEGATEE_PRIVATE_KEY);
console.log('🔍 ENV DEBUG - Final VITE_APP_ID:', env.VITE_APP_ID);
console.log('🔍 ENV DEBUG - Final VITE_BACKEND_URL:', env.VITE_BACKEND_URL);
