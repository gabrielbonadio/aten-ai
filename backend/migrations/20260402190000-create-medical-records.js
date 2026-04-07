'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('medical_records', {
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
      appointmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        unique: true,
        references: {
          model: 'appointments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      veterinarianId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      symptoms: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      diagnosis: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      prescription: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      weight: {
        type: Sequelize.DECIMAL(5, 2),
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

    await queryInterface.addIndex('medical_records', ['tenantId'], { name: 'medical_records_tenant_id_idx' });
    await queryInterface.addIndex('medical_records', ['petId'], { name: 'medical_records_pet_id_idx' });
    await queryInterface.addIndex('medical_records', ['veterinarianId'], { name: 'medical_records_vet_id_idx' });
    await queryInterface.addIndex('medical_records', ['appointmentId'], {
      unique: true,
      name: 'medical_records_appointment_id_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('medical_records');
  }
};

