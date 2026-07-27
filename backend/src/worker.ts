import 'dotenv/config';
import { initSentry } from './shared/observability/sentry';
import { validateEnv } from './shared/config/validateEnv';
import sequelize from './config/database';
import appointmentFollowupsJob from './modules/appointments/jobs/AppointmentFollowupsJob';
import appointmentRemindersJob from './modules/appointments/jobs/AppointmentRemindersJob';
import { startConversationGC } from './modules/conversations/jobs/ConversationGarbageCollector';
import { logger } from './shared/logging/logger';

/**
 * Processo dedicado para jobs (lembretes, follow-ups, GC).
 * Use com ENABLE_IN_PROCESS_JOBS=false na API para scale-out horizontal sem duplicar WhatsApps.
 */
initSentry();
validateEnv();

const startWorker = async () => {
  try {
    await sequelize.authenticate();
    logger.info('worker.database.connected', { dialect: 'mysql' });

    appointmentRemindersJob.start();
    appointmentFollowupsJob.start();
    startConversationGC();

    logger.info('worker.jobs.started', {
      jobs: ['appointmentReminders', 'appointmentFollowups', 'conversationGC']
    });
  } catch (error) {
    logger.error('worker.boot_failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
};

void startWorker();
