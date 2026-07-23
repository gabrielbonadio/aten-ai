import { logger } from '../logging/logger';

const PLACEHOLDER_EXACT = new Set(['change-me', 'password', 'secret', 'root', 'aten_ai_pass']);
const PLACEHOLDER_SUBSTRINGS = ['change-me', 'changeme', 'aten_ai_pass'];

function isWeakSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 16) return true;
  if (PLACEHOLDER_EXACT.has(normalized)) return true;
  return PLACEHOLDER_SUBSTRINGS.some((p) => normalized.includes(p));
}

/**
 * Valida variáveis críticas no boot.
 * Em production: encerra o processo se secrets forem fracos/placeholder ou FRONTEND_URL faltar.
 */
export function validateEnv(): void {
  const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';
  const errors: string[] = [];

  const jwtSecret = (process.env.JWT_SECRET ?? '').trim();
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres.');
  } else if (isProduction && isWeakSecret(jwtSecret)) {
    errors.push('JWT_SECRET não pode ser um valor fraco/placeholder em production.');
  }

  if (isProduction) {
    const webhookSecret = (process.env.N8N_WEBHOOK_SECRET ?? '').trim();
    if (!webhookSecret || isWeakSecret(webhookSecret)) {
      errors.push('N8N_WEBHOOK_SECRET deve ser forte e não-placeholder em production.');
    }

    const dbPass = (process.env.DB_PASS ?? '').trim();
    if (!dbPass || isWeakSecret(dbPass)) {
      errors.push('DB_PASS deve ser definido e não-placeholder em production.');
    }

    const frontendUrl = (process.env.FRONTEND_URL ?? '').trim();
    if (!frontendUrl) {
      errors.push('FRONTEND_URL é obrigatório em production (CORS e links de e-mail).');
    }
  }

  if (errors.length === 0) {
    return;
  }

  for (const message of errors) {
    logger.error('env.validation_failed', { message });
  }

  if (isProduction) {
    throw new Error(`Configuração inválida para production:\n- ${errors.join('\n- ')}`);
  }

  logger.warn('env.validation_warnings', { errors });
}
