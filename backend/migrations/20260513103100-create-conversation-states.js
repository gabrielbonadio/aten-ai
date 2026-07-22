'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('conversation_states', {
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
        onDelete: 'CASCADE',
        comment: 'Tenant que possui este estado de conversa. CASCADE on delete porque o estado é volátil.'
      },
      tutorPhone: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: 'Telefone do tutor em formato E.164 (ex.: +5511987654321). Chave de lookup do fluxo inbound.'
      },
      expectedIntent: {
        type: Sequelize.STRING(64),
        allowNull: false,
        comment: 'Intenção que aguardamos da resposta do tutor (ex.: confirm_appointment, reschedule_appointment).'
      },
      referenceId: {
        type: Sequelize.STRING(36),
        allowNull: false,
        comment: 'UUID do recurso correlato à conversa (ex.: appointment.id). Sem FK formal — tabela é polimórfica via expectedIntent.'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'TTL do estado. Linhas com expiresAt <= NOW() são removidas pelo garbage collector diário.'
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
      }
    });

    // UNIQUE composto: codifica no schema a invariante "um telefone tem
    // no máximo um estado ativo por vez DENTRO de um tenant". Habilita
    // UPSERT idempotente no Repository (INSERT ... ON DUPLICATE KEY UPDATE).
    await queryInterface.addIndex('conversation_states', ['tenantId', 'tutorPhone'], {
      unique: true,
      name: 'conversation_states_tenant_phone_unique'
    });

    // Índice para o garbage collector (Etapa 4) varrer registros
    // expirados sem full table scan.
    await queryInterface.addIndex('conversation_states', ['expiresAt'], {
      name: 'conversation_states_expires_at_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('conversation_states');
  }
};
