'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tenants', 'document', {
      type: Sequelize.STRING(18),
      allowNull: true,
      comment: 'CNPJ ou documento fiscal da clínica'
    });
    await queryInterface.addColumn('tenants', 'phone', {
      type: Sequelize.STRING(32),
      allowNull: true
    });
    await queryInterface.addColumn('tenants', 'address', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
    await queryInterface.addColumn('tenants', 'email', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tenants', 'email');
    await queryInterface.removeColumn('tenants', 'address');
    await queryInterface.removeColumn('tenants', 'phone');
    await queryInterface.removeColumn('tenants', 'document');
  }
};
