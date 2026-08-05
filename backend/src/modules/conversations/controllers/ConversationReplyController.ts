import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logging/logger';
import conversationReplyService from '../services/ConversationReplyService';
import type { ConversationIntent } from '../repositories/ConversationStateRepository';
import type { ConversationReplyAction } from '../services/ConversationReplyService';

function resolveTenantId(req: Request): number {
  const raw = (req.body as { tenantId?: unknown }).tenantId;
  if (raw === undefined || raw === null) {
    throw new AppError('tenantId é obrigatório.', 400);
  }

  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) {
    throw new AppError('tenantId inválido.', 400);
  }
  return tenantId;
}

class ConversationReplyController {
  /**
   * POST /api/v1/conversations/reply
   *
   * Corpo: `{ tenantId, tutorPhone, intent, action, suggestedDate? }`
   * — rota protegida por shared secret (`Authorization: Bearer <N8N_WEBHOOK_SECRET>`).
   * Não logar tutorPhone (PII).
   */
  async reply(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = resolveTenantId(req);
      const { tutorPhone, intent, action, suggestedDate } = req.body as {
        tutorPhone: string;
        intent: ConversationIntent;
        action: ConversationReplyAction;
        suggestedDate?: string | Date;
      };

      await conversationReplyService.processReply({
        tenantId,
        tutorPhone,
        intent,
        action,
        suggestedDate: suggestedDate !== undefined ? new Date(suggestedDate) : undefined
      });

      res.status(200).json({ message: 'Resposta processada com sucesso.' });
    } catch (err) {
      if (err instanceof AppError) {
        const code = err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 400;
        res.status(code).json({ message: err.message });
        return;
      }

      logger.error('conversations.reply_unexpected', {
        error: err instanceof Error ? err.message : String(err),
        tenantId: (req.body as { tenantId?: unknown })?.tenantId
      });
      res.status(500).json({ message: 'Erro interno ao processar a resposta da conversa.' });
    }
  }
}

export default new ConversationReplyController();
