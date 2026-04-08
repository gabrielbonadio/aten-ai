'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('tutors', ['tenantId', 'email'], {
      name: 'tutors_tenant_id_email_unique',
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('tutors', 'tutors_tenant_id_email_unique');
  }
};
