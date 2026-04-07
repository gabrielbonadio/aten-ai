import Joi from 'joi';

export const createTutorSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().email().allow('', null).optional(),
  phone: Joi.string().trim().min(6).max(32).required()
});

export const updateTutorSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  email: Joi.string().trim().email().allow('', null).optional(),
  phone: Joi.string().trim().min(6).max(32).optional()
}).min(1);

