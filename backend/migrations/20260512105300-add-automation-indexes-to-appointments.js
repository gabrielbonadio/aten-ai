'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('appointments', ['confirmationStatus'], {
      name: 'appointments_confirmation_status_idx'
    });

    await queryInterface.addIndex('appointments', ['reminderSentAt'], {
      name: 'appointments_reminder_sent_at_idx'
    });

    await queryInterface.addIndex('appointments', ['followupSentAt'], {
      name: 'appointments_followup_sent_at_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('appointments', 'appointments_followup_sent_at_idx');
    await queryInterface.removeIndex('appointments', 'appointments_reminder_sent_at_idx');
    await queryInterface.removeIndex('appointments', 'appointments_confirmation_status_idx');
  }
};
