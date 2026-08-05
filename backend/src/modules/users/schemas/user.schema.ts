import Joi from 'joi';

export const inviteUserSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  role: Joi.string().valid('MEMBER', 'ADMIN').optional()
});

export const updateUserSchema = Joi.object({
  role: Joi.string().valid('MEMBER', 'ADMIN').optional(),
  active: Joi.boolean().optional()
}).min(1);
