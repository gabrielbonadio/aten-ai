'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'confirmationStatus', {
      type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'RESCHEDULED'),
      allowNull: false,
      defaultValue: 'PENDING',
      comment: 'Status da confirmação do agendamento via automação (n8n/WhatsApp).'
    });

    await queryInterface.addColumn('appointments', 'reminderSentAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp do envio do lembrete pré-consulta. NULL = ainda não enviado.'
    });

    await queryInterface.addColumn('appointments', 'followupSentAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp do envio do follow-up pós-consulta. NULL = ainda não enviado.'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('appointments', 'followupSentAt');
    await queryInterface.removeColumn('appointments', 'reminderSentAt');
    await queryInterface.removeColumn('appointments', 'confirmationStatus');
  }
};
