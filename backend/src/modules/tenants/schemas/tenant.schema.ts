import Joi from 'joi';

export const createTenantSchema = Joi.object({
  name: Joi.string().trim().required(),
  slug: Joi.string()
    .trim()
    .required()
    .pattern(/^\S+$/)
    .messages({
      'string.pattern.base': 'slug não pode conter espaços'
    }),
  plan: Joi.string().valid('free', 'pro').required()
});
