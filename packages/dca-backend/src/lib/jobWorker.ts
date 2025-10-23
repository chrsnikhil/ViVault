import consola from 'consola';

import { updateVolatilityIndex } from './volatilityWorker';

let volatilityTimer: NodeJS.Timeout | null = null;
let nextUpdateTime: number = 0;

export function startVolatilityTimer(): void {
  consola.info('⏰ Starting volatility timer (10-minute intervals)');

  // Add a periodic check to ensure timer is still running
  setInterval(() => {
    if (volatilityTimer) {
      consola.info(
        '⏰ Timer status check - Timer is running, next update in:',
        Math.round((nextUpdateTime - Date.now()) / 1000),
        'seconds'
      );
    } else {
      consola.warn('⚠️ Timer status check - Timer is NOT running!');
    }
  }, 30000); // Check every 30 seconds for more frequent debugging

  const runVolatilityUpdate = async () => {
    consola.info('🔄 TIMER TRIGGERED - Starting automatic volatility update...');
    try {
      consola.info('🔄 Calling updateVolatilityIndex()...');
      await updateVolatilityIndex();
      consola.success('✅ Automatic volatility update completed successfully');

      // Reset timer for next 10 minutes
      nextUpdateTime = Date.now() + 10 * 60 * 1000;
      volatilityTimer = setTimeout(runVolatilityUpdate, 10 * 60 * 1000);
      consola.info('⏰ Next volatility update scheduled in 10 minutes');
      consola.info('⏰ Timer will trigger at:', new Date(nextUpdateTime).toISOString());
      consola.info('⏰ New Timer ID:', volatilityTimer);
    } catch (error) {
      consola.error('❌ Automatic volatility update failed:', error);
      consola.error('❌ Error details:', error.message);
      consola.error('❌ Stack trace:', error.stack);

      // Still reset timer even if update failed
      nextUpdateTime = Date.now() + 10 * 60 * 1000;
      volatilityTimer = setTimeout(runVolatilityUpdate, 10 * 60 * 1000);
      consola.info('⏰ Next volatility update scheduled in 10 minutes (retry)');
      consola.info('⏰ Timer will trigger at:', new Date(nextUpdateTime).toISOString());
      consola.info('⏰ Retry Timer ID:', volatilityTimer);
    }
  };

  // Start the first timer (10 minutes from now)
  nextUpdateTime = Date.now() + 10 * 60 * 1000;
  volatilityTimer = setTimeout(runVolatilityUpdate, 10 * 60 * 1000);
  consola.info('⏰ First volatility update scheduled in 10 minutes');
  consola.info('⏰ Timer will trigger at:', new Date(nextUpdateTime).toISOString());
  consola.info('⏰ Timer ID:', volatilityTimer);
  consola.info('⏰ Current time:', new Date().toISOString());
}

export function stopVolatilityTimer(): void {
  if (volatilityTimer) {
    clearTimeout(volatilityTimer);
    volatilityTimer = null;
    consola.info('⏹️ Volatility timer stopped');
  }
}

// Get current timer status
export function getTimerStatus() {
  const now = Date.now();
  const timeUntilNext = Math.max(0, nextUpdateTime - now);

  return {
    intervalMinutes: 10,
    isRunning: volatilityTimer !== null,
    nextUpdateTime: new Date(nextUpdateTime).toISOString(),
    timeUntilNextMinutes: Math.floor(timeUntilNext / (1000 * 60)),
    timeUntilNextMs: timeUntilNext,
    timeUntilNextSeconds: Math.floor((timeUntilNext % (1000 * 60)) / 1000),
  };
}

// Legacy function for compatibility
export async function startWorker() {
  consola.warn('⚠️ startWorker() is deprecated, use startVolatilityTimer() instead');
  startVolatilityTimer();
  
  consola.info('🤖 Automated rebalancing triggers are integrated with volatility updates');
  consola.info('🤖 Enable automation via /api/automation/config endpoint');
  
  return null;
}
