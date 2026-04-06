'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const deletedAtColumn = {
      type: Sequelize.DATE,
      allowNull: true
    };

    await queryInterface.addColumn('tenants', 'deletedAt', deletedAtColumn);
    await queryInterface.addColumn('users', 'deletedAt', deletedAtColumn);
    await queryInterface.addColumn('customers', 'deletedAt', deletedAtColumn);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tenants', 'deletedAt');
    await queryInterface.removeColumn('users', 'deletedAt');
    await queryInterface.removeColumn('customers', 'deletedAt');
  }
};
