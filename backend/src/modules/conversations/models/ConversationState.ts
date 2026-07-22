import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

/**
 * Estado temporário de conversas inbound de WhatsApp.
 *
 * Quando despachamos um outbound (ex.: lembrete D-1 com a pergunta
 * "confirma sua consulta?"), gravamos aqui que esperamos uma resposta
 * desse telefone para a intenção `confirm_appointment` referente a um
 * recurso específico (`referenceId`). Quando o tutor responde no
 * WhatsApp, a Evolution API dispara o n8n, que consulta esta tabela
 * pelo telefone e descobre o contexto da conversa.
 *
 * Características da tabela:
 *
 * - **Volátil**: cada registro tem TTL via `expiresAt`. Garbage collector
 *   roda de madrugada e limpa registros expirados.
 *
 * - **Sem `paranoid`**: soft delete contraria o propósito de uma tabela
 *   de TTL — o GC precisa apagar fisicamente para o índice por
 *   `tutorPhone` (UNIQUE) liberar slots a tempo.
 *
 * - **UNIQUE `(tenantId, tutorPhone)`**: um telefone só pode ter UM
 *   estado ativo por vez DENTRO de um tenant. Codifica a invariante de
 *   negócio no schema (segunda linha de defesa), permite que dois
 *   tenants distintos compartilhem o mesmo telefone, e habilita
 *   `UPSERT` idempotente no Repository.
 *
 * - **Padrão Repository**: o resto da aplicação NUNCA acessa esse model
 *   diretamente. O acesso é mediado por `ConversationStateRepository`,
 *   permitindo migração transparente para Redis no futuro.
 */
class ConversationState extends Model<
  InferAttributes<ConversationState>,
  InferCreationAttributes<ConversationState>
> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare tutorPhone: string;
  declare expectedIntent: string;
  /**
   * UUID do recurso correlato (ex.: `appointment.id`). STRING(36) em vez
   * de DataTypes.UUID puro porque a tabela é polimórfica — o
   * `expectedIntent` é quem define qual entidade está sendo referenciada.
   */
  declare referenceId: string;
  declare expiresAt: Date;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize): typeof ConversationState {
    ConversationState.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true
        },
        tenantId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        tutorPhone: {
          type: DataTypes.STRING(32),
          allowNull: false
        },
        expectedIntent: {
          type: DataTypes.STRING(64),
          allowNull: false
        },
        referenceId: {
          type: DataTypes.STRING(36),
          allowNull: false
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'conversation_states',
        timestamps: true,
        // paranoid: false propositadamente — esta tabela tem TTL.
        paranoid: false,
        indexes: [
          // Lookup principal do fluxo inbound: webhook chega com
          // (tenant, phone) e resolve o contexto da conversa. UNIQUE
          // composto codifica a invariante "um phone = um estado ativo
          // por tenant" no schema.
          {
            unique: true,
            fields: ['tenantId', 'tutorPhone'],
            name: 'conversation_states_tenant_phone_unique'
          },
          // Usado pelo Garbage Collector (Etapa 4):
          // DELETE FROM conversation_states WHERE expiresAt <= NOW().
          {
            fields: ['expiresAt'],
            name: 'conversation_states_expires_at_idx'
          }
        ]
      }
    );

    return ConversationState;
  }
}

export default ConversationState;
