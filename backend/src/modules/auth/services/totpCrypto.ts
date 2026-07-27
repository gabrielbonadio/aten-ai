import crypto from 'crypto';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
import { decryptField, encryptField } from '../../../shared/crypto/fieldEncryption';

const RECOVERY_CODE_COUNT = 10;
const ISSUER = 'Aten AI';

authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export async function buildQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

export function encryptTotpSecret(plain: string): string {
  return encryptField(plain) as string;
}

export function decryptTotpSecret(stored: string): string {
  return decryptField(stored) as string;
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    return authenticator.verify({ token: normalized, secret });
  } catch {
    return false;
  }
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

/** Gera códigos plaintext `XXXX-XXXX` (exibidos uma vez) e hashes SHA-256 para persistir. */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    codes.push(code);
    hashes.push(hashRecoveryCode(code));
  }

  return { codes, hashes };
}

export function serializeRecoveryHashes(hashes: string[]): string {
  return JSON.stringify(hashes);
}

export function parseRecoveryHashes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((h): h is string => typeof h === 'string');
  } catch {
    return [];
  }
}

/**
 * Consome um recovery code (single-use).
 * @returns hashes restantes se válido; null se nenhum bater.
 */
export function consumeRecoveryCode(hashes: string[], code: string): string[] | null {
  const target = hashRecoveryCode(code);
  const idx = hashes.indexOf(target);
  if (idx === -1) return null;
  return [...hashes.slice(0, idx), ...hashes.slice(idx + 1)];
}
