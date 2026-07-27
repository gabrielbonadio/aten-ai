import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpSecret,
  parseRecoveryHashes,
  serializeRecoveryHashes,
  verifyTotpCode
} from '../../../modules/auth/services/totpCrypto';
import { authenticator } from 'otplib';

describe('totpCrypto', () => {
  it('gera secret e verifica código válido', () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(secret, code)).toBe(true);
    expect(verifyTotpCode(secret, '000000')).toBe(false);
  });

  it('gera recovery codes e consome um hash (single-use)', () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(hashes).toHaveLength(10);

    const remaining = consumeRecoveryCode(hashes, codes[0]);
    expect(remaining).not.toBeNull();
    expect(remaining).toHaveLength(9);

    const again = consumeRecoveryCode(remaining!, codes[0]);
    expect(again).toBeNull();
  });

  it('serializa e parseia hashes', () => {
    const raw = serializeRecoveryHashes(['a', 'b']);
    expect(parseRecoveryHashes(raw)).toEqual(['a', 'b']);
    expect(parseRecoveryHashes(null)).toEqual([]);
  });
});
