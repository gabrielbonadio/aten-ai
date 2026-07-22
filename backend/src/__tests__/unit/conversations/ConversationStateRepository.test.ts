import { Op } from 'sequelize';
import ConversationState from '../../../modules/conversations/models/ConversationState';
import conversationStateRepository from '../../../modules/conversations/repositories/ConversationStateRepository';

jest.mock('../../../modules/conversations/models/ConversationState', () => ({
  __esModule: true,
  default: {
    upsert: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn()
  }
}));

const mockedModel = ConversationState as unknown as {
  upsert: jest.Mock;
  findOne: jest.Mock;
  destroy: jest.Mock;
};

describe('ConversationStateRepository (unit)', () => {
  const tenantId = 1;
  const phone = '+5511987654321';
  const referenceId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveState', () => {
    it('faz upsert com expiresAt ~24h no futuro', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const persisted = {
        tenantId,
        tutorPhone: phone,
        expectedIntent: 'confirm_appointment',
        referenceId,
        expiresAt: new Date(now + 24 * 60 * 60 * 1000)
      };
      mockedModel.upsert.mockResolvedValue([persisted, true]);

      const result = await conversationStateRepository.saveState(
        tenantId,
        phone,
        'confirm_appointment',
        referenceId,
        24
      );

      expect(mockedModel.upsert).toHaveBeenCalledTimes(1);
      const payload = mockedModel.upsert.mock.calls[0][0];
      expect(payload).toMatchObject({
        tenantId,
        tutorPhone: phone,
        expectedIntent: 'confirm_appointment',
        referenceId
      });
      expect(payload.expiresAt.getTime()).toBe(now + 24 * 60 * 60 * 1000);
      expect(result).toEqual(persisted);
    });

    it('propaga erro amigável quando o upsert falha', async () => {
      mockedModel.upsert.mockRejectedValue(new Error('DB down'));

      await expect(
        conversationStateRepository.saveState(tenantId, phone, 'confirm_appointment', referenceId)
      ).rejects.toThrow(/Não foi possível persistir o estado de conversa/);
    });
  });

  describe('getState', () => {
    it('filtra por tenant, telefone e expiresAt > agora (defesa TTL)', async () => {
      const active = { id: 'state-1', tenantId, tutorPhone: phone };
      mockedModel.findOne.mockResolvedValue(active);

      const before = Date.now();
      const result = await conversationStateRepository.getState(tenantId, phone);
      const after = Date.now();

      expect(result).toEqual(active);
      expect(mockedModel.findOne).toHaveBeenCalledTimes(1);

      const where = mockedModel.findOne.mock.calls[0][0].where;
      expect(where[Op.and]).toEqual(
        expect.arrayContaining([
          { tenantId },
          { tutorPhone: phone },
          expect.objectContaining({
            expiresAt: expect.objectContaining({ [Op.gt]: expect.any(Date) })
          })
        ])
      );

      const expiresClause = where[Op.and].find((c: Record<string, unknown>) => 'expiresAt' in c);
      const gtDate = expiresClause.expiresAt[Op.gt] as Date;
      expect(gtDate.getTime()).toBeGreaterThanOrEqual(before);
      expect(gtDate.getTime()).toBeLessThanOrEqual(after);
    });

    it('retorna null quando não há estado ativo', async () => {
      mockedModel.findOne.mockResolvedValue(null);
      await expect(conversationStateRepository.getState(tenantId, phone)).resolves.toBeNull();
    });
  });

  describe('clearState', () => {
    it('destroy pelo par (tenantId, tutorPhone) e retorna linhas afetadas', async () => {
      mockedModel.destroy.mockResolvedValue(1);
      await expect(conversationStateRepository.clearState(tenantId, phone)).resolves.toBe(1);
      expect(mockedModel.destroy).toHaveBeenCalledWith({
        where: { [Op.and]: [{ tenantId }, { tutorPhone: phone }] }
      });
    });
  });
});
