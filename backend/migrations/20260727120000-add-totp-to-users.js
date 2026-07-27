'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'totpSecret', {
      type: Sequelize.STRING(512),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'totpEnabledAt', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('users', 'totpRecoveryHashes', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    });

    // MySQL: estender ENUM de purpose (user_tokens)
    await queryInterface.sequelize.query(
      "ALTER TABLE user_tokens MODIFY COLUMN purpose ENUM('password_reset','refresh','totp_pending') NOT NULL DEFAULT 'password_reset'"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM user_tokens WHERE purpose = 'totp_pending'"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE user_tokens MODIFY COLUMN purpose ENUM('password_reset','refresh') NOT NULL DEFAULT 'password_reset'"
    );

    await queryInterface.removeColumn('users', 'totpRecoveryHashes');
    await queryInterface.removeColumn('users', 'totpEnabledAt');
    await queryInterface.removeColumn('users', 'totpSecret');
  }
};
