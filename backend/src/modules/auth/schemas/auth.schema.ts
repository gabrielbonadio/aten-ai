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

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(32).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .required()
    .messages({
      'string.pattern.base': 'A senha deve conter maiúscula, minúscula, número e caractere especial.'
    })
});
