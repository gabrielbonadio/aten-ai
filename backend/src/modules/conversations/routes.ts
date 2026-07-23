import { Router } from 'express';
import { ensureWebhookSecret } from '../../shared/middlewares/ensureWebhookSecret';
import { webhookRateLimiter } from '../../shared/middlewares/rateLimit';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import conversationReplyController from './controllers/ConversationReplyController';
import { conversationReplySchema } from './schemas/conversationReply.schema';

const conversationsRoutes = Router();

conversationsRoutes.post(
  '/conversations/reply',
  webhookRateLimiter,
  ensureWebhookSecret,
  validateSchema(conversationReplySchema),
  (req, res, next) => {
    void conversationReplyController.reply(req, res).catch(next);
  }
);

export default conversationsRoutes;
