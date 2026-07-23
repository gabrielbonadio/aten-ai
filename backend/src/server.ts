import 'dotenv/config';
import { validateEnv } from './shared/config/validateEnv';
import app from './app';
import sequelize from './config/database';
import appointmentFollowupsJob from './modules/appointments/jobs/AppointmentFollowupsJob';
import appointmentRemindersJob from './modules/appointments/jobs/AppointmentRemindersJob';
import { startConversationGC } from './modules/conversations/jobs/ConversationGarbageCollector';
import { logger } from './shared/logging/logger';

validateEnv();

const PORT = process.env.PORT || 3000;

/** Em multi-réplica, defina ENABLE_IN_PROCESS_JOBS=false e rode `npm run worker`. */
function shouldStartInProcessJobs(): boolean {
  const raw = (process.env.ENABLE_IN_PROCESS_JOBS ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('database.connected', { dialect: 'mysql' });

    app.listen(PORT, () => {
      logger.info('server.listening', { port: Number(PORT) });

      if (shouldStartInProcessJobs()) {
        appointmentRemindersJob.start();
        appointmentFollowupsJob.start();
        startConversationGC();
        logger.info('jobs.started', {
          mode: 'in-process',
          jobs: ['appointmentReminders', 'appointmentFollowups', 'conversationGC']
        });
      } else {
        logger.info('jobs.skipped', {
          reason: 'ENABLE_IN_PROCESS_JOBS=false — use o processo worker dedicado'
        });
      }
    });
  } catch (error) {
    logger.error('server.boot_failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
};

void startServer();
