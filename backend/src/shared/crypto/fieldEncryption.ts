import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Criptografia de campo em repouso (AES-256-GCM).
 *
 * Formato: `enc:v1:<base64(iv || tag || ciphertext)>`
 * - iv: 12 bytes
 * - tag: 16 bytes
 *
 * Sem `PII_ENCRYPTION_KEY`: retorna plaintext (dev/local).
 * Valores sem o prefixo são tratados como legado em claro (leitura compatível).
 */

export const ENC_PREFIX = 'enc:v1:';

const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function parseKey(): Buffer | null {
  const raw = (process.env.PII_ENCRYPTION_KEY ?? '').trim();
  if (!raw) return null;

  // Hex de 64 chars (32 bytes) — recomendado: openssl rand -hex 32
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  // Base64 que decodifica para 32 bytes
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === KEY_LEN) return buf;
  } catch {
    // fall through
  }

  throw new Error(
    'PII_ENCRYPTION_KEY inválida: use 64 hex chars (openssl rand -hex 32) ou base64 de 32 bytes.'
  );
}

export function isFieldEncryptionEnabled(): boolean {
  return Boolean((process.env.PII_ENCRYPTION_KEY ?? '').trim());
}

export function isEncryptedValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  if (plain === '') return '';
  if (isEncryptedValue(plain)) return plain;

  const key = parseKey();
  if (!key) return plain;

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, ciphertext]);
  return `${ENC_PREFIX}${packed.toString('base64')}`;
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (value === '') return '';
  if (!isEncryptedValue(value)) return value;

  const key = parseKey();
  if (!key) {
    throw new Error('Valor criptografado encontrado, mas PII_ENCRYPTION_KEY não está definida.');
  }

  const packed = Buffer.from(value.slice(ENC_PREFIX.length), 'base64');
  if (packed.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Payload criptografado inválido (tamanho).');
  }

  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = packed.subarray(IV_LEN + TAG_LEN);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

/**
 * Valida formato da chave quando definida (boot).
 * Em production, recomenda-se definir a chave; não é hard-fail se ausente
 * (permite migração gradual), mas falha se o formato for inválido.
 */
export function assertPiiEncryptionKeyFormat(): void {
  const raw = (process.env.PII_ENCRYPTION_KEY ?? '').trim();
  if (!raw) return;
  parseKey();
}
