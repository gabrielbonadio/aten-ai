'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // MySQL: estender ENUM de purpose (user_tokens) com invite
    await queryInterface.sequelize.query(
      "ALTER TABLE user_tokens MODIFY COLUMN purpose ENUM('password_reset','refresh','totp_pending','invite') NOT NULL DEFAULT 'password_reset'"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("DELETE FROM user_tokens WHERE purpose = 'invite'");
    await queryInterface.sequelize.query(
      "ALTER TABLE user_tokens MODIFY COLUMN purpose ENUM('password_reset','refresh','totp_pending') NOT NULL DEFAULT 'password_reset'"
    );

    await queryInterface.removeColumn('users', 'active');
  }
};
