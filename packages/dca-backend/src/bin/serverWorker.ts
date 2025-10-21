import '../lib/sentry';
import { startApiServer } from '../lib/apiServer';
// import { startVolatilityTimer } from '../lib/jobWorker'; // Not needed - frontend controls timer now
import { serviceLogger } from '../lib/logger';

async function gogo() {
  try {
    // Volatility timer is now controlled by the frontend
    serviceLogger.info('Backend ready - volatility timer controlled by frontend');

    await startApiServer();
  } catch (error) {
    serviceLogger.error('!!! Failed to initialize service', error);
    throw error;
  }
}

gogo();
