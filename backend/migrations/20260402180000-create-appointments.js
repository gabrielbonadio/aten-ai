'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('appointments', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      tenantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      petId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'pets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('VACCINE', 'CONSULTATION', 'SURGERY', 'OTHER'),
        allowNull: false,
        defaultValue: 'CONSULTATION'
      },
      status: {
        type: Sequelize.ENUM('SCHEDULED', 'COMPLETED', 'CANCELED'),
        allowNull: false,
        defaultValue: 'SCHEDULED'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('appointments', ['tenantId'], { name: 'appointments_tenant_id_idx' });
    await queryInterface.addIndex('appointments', ['petId'], { name: 'appointments_pet_id_idx' });
    await queryInterface.addIndex('appointments', ['date'], { name: 'appointments_date_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('appointments');
  }
};

