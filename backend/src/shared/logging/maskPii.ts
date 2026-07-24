/**
 * Mascaramento de PII para logs (LGPD).
 * Nunca logar e-mail/telefone em claro — usar estes helpers.
 */

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '[empty]';
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '***';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain || '***'}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '[empty]';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***${digits.slice(-4)}`;
}

const SENSITIVE_KEY =
  /^(email|phone|tutor_phone|tutorPhone|password|token|refreshToken|accessToken|authorization|secret|apiKey|api_key)$/i;

/**
 * Copia `fields` mascarando chaves sensíveis conhecidas.
 */
export function redactLogFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Error) {
      out[key] = value.message;
      continue;
    }
    if (!SENSITIVE_KEY.test(key)) {
      out[key] = value;
      continue;
    }
    if (typeof value !== 'string') {
      out[key] = '[REDACTED]';
      continue;
    }
    if (/email/i.test(key)) {
      out[key] = maskEmail(value);
    } else if (/phone/i.test(key)) {
      out[key] = maskPhone(value);
    } else {
      out[key] = '[REDACTED]';
    }
  }
  return out;
}
