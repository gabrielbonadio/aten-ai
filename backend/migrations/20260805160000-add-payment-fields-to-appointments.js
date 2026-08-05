'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'amountCents', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('appointments', 'paymentStatus', {
      type: Sequelize.ENUM('PENDING', 'PAID', 'WAIVED'),
      allowNull: false,
      defaultValue: 'PENDING'
    });

    await queryInterface.addIndex('appointments', ['tenantId', 'paymentStatus', 'date'], {
      name: 'appointments_tenant_payment_status_date_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('appointments', 'appointments_tenant_payment_status_date_idx');
    await queryInterface.removeColumn('appointments', 'paymentStatus');
    await queryInterface.removeColumn('appointments', 'amountCents');
  }
};
