'use strict';

/**
 * Remove a tabela legada `customers`.
 * O domínio de tutores/pets substituiu customers; o módulo TS já foi removido.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) =>
      typeof t === 'string' ? t.toLowerCase() : String(t.tableName || t.name || '').toLowerCase()
    );

    if (names.includes('customers')) {
      await queryInterface.dropTable('customers');
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) =>
      typeof t === 'string' ? t.toLowerCase() : String(t.tableName || t.name || '').toLowerCase()
    );

    if (names.includes('customers')) {
      return;
    }

    await queryInterface.createTable('customers', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(32),
        allowNull: true
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

    await queryInterface.addIndex('customers', ['tenantId'], {
      name: 'customers_tenant_id_idx'
    });
  }
};
