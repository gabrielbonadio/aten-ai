import Joi from 'joi';

/** Política única de senha (signup + reset). */
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  .required()
  .messages({
    'string.pattern.base': 'A senha deve conter maiúscula, minúscula, número e caractere especial.'
  });

export const signUpSchema = Joi.object({
  tenantName: Joi.string().trim().min(1).max(255).required(),
  userName: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().email().required(),
  password: passwordSchema
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
  password: passwordSchema
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().trim().min(32).required()
});

export const logoutSchema = Joi.object({
  refreshToken: Joi.string().trim().min(32).required()
});
