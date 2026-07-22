import Joi from 'joi';

export const conversationReplySchema = Joi.object({
  tenantId: Joi.number().integer().positive().required(),
  tutorPhone: Joi.string().trim().min(3).max(32).required(),
  intent: Joi.string()
    .valid('confirm_appointment', 'reschedule_appointment', 'cancel_appointment')
    .required(),
  action: Joi.string().valid('CONFIRMED', 'CANCELED').required()
});
