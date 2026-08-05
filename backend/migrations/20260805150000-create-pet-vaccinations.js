'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pet_vaccinations', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      appliedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nextDueAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      reminderSentAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('pet_vaccinations', ['tenantId'], {
      name: 'pet_vaccinations_tenant_id_idx'
    });
    await queryInterface.addIndex('pet_vaccinations', ['petId'], {
      name: 'pet_vaccinations_pet_id_idx'
    });
    await queryInterface.addIndex('pet_vaccinations', ['nextDueAt'], {
      name: 'pet_vaccinations_next_due_at_idx'
    });
    await queryInterface.addIndex('pet_vaccinations', ['reminderSentAt'], {
      name: 'pet_vaccinations_reminder_sent_at_idx'
    });
    await queryInterface.addIndex('pet_vaccinations', ['tenantId', 'nextDueAt'], {
      name: 'pet_vaccinations_tenant_next_due_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pet_vaccinations');
  }
};
