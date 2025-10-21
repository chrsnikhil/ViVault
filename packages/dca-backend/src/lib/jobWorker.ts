import consola from 'consola';

import { createAgenda, getAgenda } from './agenda/agendaClient';
import { updateVolatilityIndex } from './volatilityWorker';

// Function to create and configure a new agenda instance
export async function startWorker() {
  await createAgenda();

  const agenda = getAgenda();

  // Define volatility update job
  agenda.define('update-volatility', async () => {
    consola.info('🔄 Starting scheduled volatility update...');
    try {
      await updateVolatilityIndex();
      consola.success('✅ Scheduled volatility update completed');
    } catch (error) {
      consola.error('❌ Scheduled volatility update failed:', error);
      throw error;
    }
  });

  // Schedule volatility updates every hour
  agenda.every('1 hour', 'update-volatility');
  consola.info('⏰ Scheduled volatility updates every hour');

  // DCA job processing removed - you can add your own job definitions here
  consola.info('Job worker started - ready for custom job definitions');

  return agenda;
}
