import consola from 'consola';

import { createAgenda, getAgenda } from './agenda/agendaClient';

// Function to create and configure a new agenda instance
export async function startWorker() {
  await createAgenda();

  const agenda = getAgenda();

  // DCA job processing removed - you can add your own job definitions here
  consola.info('Job worker started - ready for custom job definitions');

  return agenda;
}
