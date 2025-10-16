import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { Express, NextFunction, Response } from 'express';
import helmet from 'helmet';

import { createVincentUserMiddleware } from '@lit-protocol/vincent-app-sdk/expressMiddleware';
import { getAppInfo, getPKPInfo, isAppUser } from '@lit-protocol/vincent-app-sdk/jwt';

// DCA-specific routes removed - keeping only Vincent authentication
import { userKey, VincentAuthenticatedRequest } from './types';
import { env } from '../env';
import { serviceLogger } from '../logger';
import { PythService } from '../pyth/pythService';

const { ALLOWED_AUDIENCE, CORS_ALLOWED_DOMAIN, IS_DEVELOPMENT, VINCENT_APP_ID } = env;

const { handler, middleware } = createVincentUserMiddleware({
  userKey,
  allowedAudience: ALLOWED_AUDIENCE,
  requiredAppId: VINCENT_APP_ID,
});

// Initialize Pyth service
const pythService = new PythService();

const corsConfig = {
  optionsSuccessStatus: 204,
  origin: IS_DEVELOPMENT ? true : [CORS_ALLOWED_DOMAIN],
};

const setSentryUserMiddleware = handler(
  (req: VincentAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!isAppUser(req.user.decodedJWT)) {
      throw new Error('Vincent JWT is not an app user');
    }

    Sentry.setUser({
      app: getAppInfo(req.user.decodedJWT),
      ethAddress: getPKPInfo(req.user.decodedJWT).ethAddress,
    });
    next();
  }
);

export const registerRoutes = (app: Express) => {
  app.use(helmet());
  app.use(express.json());

  if (IS_DEVELOPMENT) {
    serviceLogger.info(`CORS is disabled for development`);
  } else {
    serviceLogger.info(`Configuring CORS with allowed domain: ${CORS_ALLOWED_DOMAIN}`);
  }
  app.use(cors(corsConfig));

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ message: 'Vincent App Backend is running', status: 'ok' });
  });

  // Example authenticated endpoint - you can add your own routes here
  app.get(
    '/user-info',
    middleware,
    setSentryUserMiddleware,
    handler((req: VincentAuthenticatedRequest, res) => {
      const { user } = req;
      res.json({
        data: {
          appInfo: getAppInfo(user.decodedJWT),
          ethAddress: getPKPInfo(user.decodedJWT).ethAddress,
        },
        success: true,
      });
    })
  );

  // Pyth price feed endpoints (public - no authentication required)
  app.get('/api/pyth/health', async (req, res) => {
    try {
      const health = await pythService.getHealthStatus();
      res.json({
        data: health,
        success: true,
      });
    } catch (error) {
      serviceLogger.error('Pyth health check failed:', error);
      res.status(500).json({
        data: { error: 'Failed to check Pyth health' },
        success: false,
      });
    }
  });

  app.get('/api/pyth/price-feeds', async (req, res) => {
    try {
      const priceFeeds = await pythService.getPopularCryptoPrices();
      res.json({
        data: priceFeeds,
        success: true,
      });
    } catch (error) {
      serviceLogger.error('Failed to fetch price feeds:', error);
      res.status(500).json({
        data: { error: 'Failed to fetch price feeds' },
        success: false,
      });
    }
  });

  app.get('/api/pyth/price-feed-ids', async (req, res) => {
    try {
      const feedIds = await pythService.getPriceFeedIds();
      return res.json({
        data: feedIds,
        success: true,
      });
    } catch (error) {
      serviceLogger.error('Failed to fetch price feed IDs:', error);
      return res.status(500).json({
        data: { error: 'Failed to fetch price feed IDs' },
        success: false,
      });
    }
  });

  app.post(
    '/api/pyth/latest-prices',
    middleware,
    setSentryUserMiddleware,
    handler(async (req: VincentAuthenticatedRequest, res) => {
      try {
        const { binary, ids, verbose } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            data: { error: 'ids array is required' },
            success: false,
          });
        }

        const priceFeeds = await pythService.getLatestPriceFeeds({
          ids,
          binary: binary || false,
          verbose: verbose || false,
        });

        return res.json({
          data: priceFeeds,
          success: true,
        });
      } catch (error) {
        serviceLogger.error('Failed to fetch latest prices:', error);
        return res.status(500).json({
          data: { error: 'Failed to fetch latest prices' },
          success: false,
        });
      }
    })
  );

  app.post(
    '/api/pyth/twap',
    middleware,
    setSentryUserMiddleware,
    handler(async (req: VincentAuthenticatedRequest, res) => {
      try {
        const { encoding, ids, parsed, window_seconds } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            data: { error: 'ids array is required' },
            success: false,
          });
        }

        if (!window_seconds || typeof window_seconds !== 'number') {
          return res.status(400).json({
            data: { error: 'window_seconds is required and must be a number' },
            success: false,
          });
        }

        const twapData = await pythService.getTwapLatest(ids, window_seconds, {
          encoding,
          parsed,
        });

        return res.json({
          data: twapData,
          success: true,
        });
      } catch (error) {
        serviceLogger.error('Failed to fetch TWAP data:', error);
        return res.status(500).json({
          data: { error: 'Failed to fetch TWAP data' },
          success: false,
        });
      }
    })
  );

  serviceLogger.info(`Routes registered`);
};
