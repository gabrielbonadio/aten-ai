import Joi from 'joi';

export const createCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().max(32).allow('', null).optional()
});
