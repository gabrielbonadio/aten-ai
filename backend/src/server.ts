import 'dotenv/config';
import app from './app';
import sequelize from './config/database';
import appointmentFollowupsJob from './modules/appointments/jobs/AppointmentFollowupsJob';
import appointmentRemindersJob from './modules/appointments/jobs/AppointmentRemindersJob';
import { startConversationGC } from './modules/conversations/jobs/ConversationGarbageCollector';
import { logger } from './shared/logging/logger';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('database.connected', { dialect: 'mysql' });

    app.listen(PORT, () => {
      logger.info('server.listening', { port: Number(PORT) });

      // Jobs de automação só iniciam APÓS o servidor estar de pé, evitando
      // que um banco intermitente derrube o servidor mas deixe o cron órfão.
      appointmentRemindersJob.start();
      appointmentFollowupsJob.start();
      startConversationGC();
      logger.info('jobs.started', {
        jobs: ['appointmentReminders', 'appointmentFollowups', 'conversationGC']
      });
    });
  } catch (error) {
    logger.error('server.boot_failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
};

void startServer();
