'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pets', {
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
      tutorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tutors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      species: {
        type: Sequelize.STRING(80),
        allowNull: true
      },
      breed: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      birthDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      weight: {
        type: Sequelize.DECIMAL(10, 2),
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

    await queryInterface.addIndex('pets', ['tenantId'], { name: 'pets_tenant_id_idx' });
    await queryInterface.addIndex('pets', ['tutorId'], { name: 'pets_tutor_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pets');
  }
};

