import Joi from 'joi';

/** PUT /settings — atualização parcial dos dados da clínica (nunca aceita tenantId no body). */
export const updateTenantSettingsSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  document: Joi.string().trim().max(18).allow('', null).optional(),
  phone: Joi.string().trim().max(32).allow('', null).optional(),
  address: Joi.string().trim().max(500).allow('', null).optional(),
  email: Joi.string().trim().email().max(255).allow('', null).optional()
})
  .min(1)
  .messages({
    'object.min': 'Informe ao menos um campo para atualizar.'
  });
