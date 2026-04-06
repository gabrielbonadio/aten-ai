import Joi from 'joi';

export const signUpSchema = Joi.object({
  tenantName: Joi.string().trim().min(1).max(255).required(),
  userName: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required()
});
