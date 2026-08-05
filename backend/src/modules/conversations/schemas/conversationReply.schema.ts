import Joi from 'joi';

/**
 * Inbound n8n → API.
 *
 * - Confirmação / cancelamento a partir do lembrete: intent `confirm_appointment`
 *   + action `CONFIRMED` | `CANCELED`.
 * - Reagendamento: mesmo intent do state (`confirm_appointment` no fluxo D-1,
 *   ou `reschedule_appointment` se o state esperar isso) + action `RESCHEDULE`
 *   + `suggestedDate` ISO futura.
 */
export const conversationReplySchema = Joi.object({
  tenantId: Joi.number().integer().positive().required(),
  tutorPhone: Joi.string().trim().min(3).max(32).required(),
  intent: Joi.string()
    .valid('confirm_appointment', 'reschedule_appointment', 'cancel_appointment')
    .required(),
  action: Joi.string().valid('CONFIRMED', 'CANCELED', 'RESCHEDULE').required(),
  suggestedDate: Joi.when('action', {
    is: 'RESCHEDULE',
    then: Joi.date().iso().greater('now').required().messages({
      'date.greater': 'suggestedDate deve ser uma data/hora futura.',
      'any.required': 'suggestedDate é obrigatório quando action é RESCHEDULE.'
    }),
    otherwise: Joi.forbidden().messages({
      'any.unknown': 'suggestedDate só é permitido quando action é RESCHEDULE.'
    })
  })
});
