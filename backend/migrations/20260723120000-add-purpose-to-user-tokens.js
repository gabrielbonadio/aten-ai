'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_tokens', 'purpose', {
      type: Sequelize.ENUM('password_reset', 'refresh'),
      allowNull: false,
      defaultValue: 'password_reset'
    });

    await queryInterface.addIndex('user_tokens', ['userId', 'purpose'], {
      name: 'user_tokens_user_id_purpose_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('user_tokens', 'user_tokens_user_id_purpose_idx');
    await queryInterface.removeColumn('user_tokens', 'purpose');
  }
};
