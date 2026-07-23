import rateLimit from 'express-rate-limit';

/** Login / signup — mitiga brute-force e criação em massa. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente em alguns minutos.' }
});

/** Forgot / reset password — mais restritivo (spam de e-mail). */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas solicitações de recuperação de senha. Tente mais tarde.' }
});

/** Webhook inbound n8n. */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Rate limit do webhook excedido.' }
});
