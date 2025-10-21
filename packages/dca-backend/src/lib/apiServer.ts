import * as Sentry from '@sentry/node';
import express from 'express';

import { env } from './env';
import { registerRoutes } from './express';
import { serviceLogger } from './logger';
// import { connectToMongoDB } from './mongo/mongoose'; // Not needed anymore

const app = express();

registerRoutes(app);

Sentry.setupExpressErrorHandler(app);

const { PORT } = env;

const startApiServer = async () => {
  serviceLogger.info('Starting server without MongoDB...');

  await new Promise((resolve, reject) => {
    // The `listen` method launches a web server.
    app.listen(PORT).once('listening', resolve).once('error', reject);
  });

  serviceLogger.info(`Server is listening on port ${PORT}`);
};

// Export app definition for orchestration in integration tests, startApiServer() for bin deployment
export { app, startApiServer };
