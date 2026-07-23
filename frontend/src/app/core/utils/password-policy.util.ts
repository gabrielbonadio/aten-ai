/** Alinhado ao schema Joi do backend (`passwordSchema`). */
export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const STRONG_PASSWORD_HINT =
  'A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.';
