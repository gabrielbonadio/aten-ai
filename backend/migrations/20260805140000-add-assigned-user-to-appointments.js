'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'assignedUserId', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('appointments', ['tenantId', 'assignedUserId', 'date'], {
      name: 'appointments_tenant_assigned_user_date_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('appointments', 'appointments_tenant_assigned_user_date_idx');
    await queryInterface.removeColumn('appointments', 'assignedUserId');
  }
};
