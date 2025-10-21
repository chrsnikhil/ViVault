import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { Express, NextFunction, Response } from 'express';
import helmet from 'helmet';

import { createVincentUserMiddleware } from '@lit-protocol/vincent-app-sdk/expressMiddleware';
import { getAppInfo, getPKPInfo, isAppUser } from '@lit-protocol/vincent-app-sdk/jwt';

// DCA-specific routes removed - keeping only Vincent authentication
import { userKey, VincentAuthenticatedRequest } from './types';
import { env } from '../env';
import { getTimerStatus } from '../jobWorker';
import { serviceLogger } from '../logger';
import { updateVolatilityIndex } from '../volatilityWorker';

const { ALLOWED_AUDIENCE, CORS_ALLOWED_DOMAIN, IS_DEVELOPMENT, VINCENT_APP_ID } = env;

const { handler, middleware } = createVincentUserMiddleware({
  userKey,
  allowedAudience: ALLOWED_AUDIENCE,
  requiredAppId: VINCENT_APP_ID,
});

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

  // Manual volatility update trigger endpoint (with authentication)
  app.post(
    '/trigger-volatility-update',
    middleware,
    setSentryUserMiddleware,
    handler(async (req: VincentAuthenticatedRequest, res) => {
      try {
        serviceLogger.info('Manual volatility update triggered by user');
        await updateVolatilityIndex();
        res.json({
          message: 'Volatility update completed successfully',
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        serviceLogger.error('Manual volatility update failed:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Volatility update failed',
          success: false,
        });
      }
    })
  );

  // Test endpoint without authentication for debugging
  app.post('/test-volatility-update', async (req, res) => {
    try {
      serviceLogger.info('Test volatility update triggered');
      await updateVolatilityIndex();
      res.json({
        message: 'Test volatility update completed successfully',
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      serviceLogger.error('Test volatility update failed:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Test volatility update failed',
        success: false,
      });
    }
  });

  // Timer status endpoint
  app.get('/volatility-timer-status', (req, res) => {
    try {
      const timerStatus = getTimerStatus();
      res.json({
        data: timerStatus,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get timer status',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });
    }
  });

  serviceLogger.info(`Routes registered`);
};
