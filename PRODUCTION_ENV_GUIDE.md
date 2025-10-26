# Production Environment Variables

## Railway Environment Variables

Set these in your Railway project's **Variables** tab for the frontend service:

### Required Variables

```bash
VITE_APP_ID=711198988
VITE_BACKEND_URL=https://backend-production-6d161.up.railway.app
VITE_REDIRECT_URI=https://frontend-production-b854.up.railway.app
VITE_EXPECTED_AUDIENCE=https://frontend-production-b854.up.railway.app
VITE_IS_DEVELOPMENT=false
```

### Optional Variables

```bash
VITE_DELEGATEE_PRIVATE_KEY=0x4fc170047fa98089040a0153e8364877c77d4eab3870cde3b7a2634b08c5616b
VITE_SENTRY_DSN=your-sentry-dsn-here (if using Sentry)
```

## Vincent App Settings

1. Go to [Vincent Dashboard](https://dashboard.heyvincent.ai/)
2. Find your app (App ID: 711198988)
3. Update the following settings:
   - **Redirect URIs**: Add `https://frontend-production-b854.up.railway.app`
   - **App User URL**: `https://frontend-production-b854.up.railway.app`

## Backend Environment Variables

If you have a separate backend service, set these variables:

```bash
# Required
VINCENT_APP_ID=711198988
PRIVATE_KEY=your-private-key
BASE_RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
VINCENT_DELEGATEE_PRIVATE_KEY=0x4fc170047fa98089040a0153e8364877c77d4eab3870cde3b7a2634b08c5616b

# CORS
CORS_ALLOWED_DOMAIN=https://frontend-production-b854.up.railway.app
ALLOWED_AUDIENCE=https://frontend-production-b854.up.railway.app

# Optional
IS_DEVELOPMENT=false
PORT=3001
SENTRY_DSN=your-sentry-dsn
```

