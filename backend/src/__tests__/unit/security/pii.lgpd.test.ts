import {
  decryptField,
  encryptField,
  ENC_PREFIX,
  isEncryptedValue
} from '../../../shared/crypto/fieldEncryption';
import { maskEmail, maskPhone, redactLogFields } from '../../../shared/logging/maskPii';

describe('maskPii', () => {
  it('mascara e-mail preservando domínio', () => {
    expect(maskEmail('maria.silva@clinic.com')).toBe('ma***@clinic.com');
  });

  it('mascara telefone mostrando só os 4 últimos dígitos', () => {
    expect(maskPhone('+5511987654321')).toBe('***4321');
  });

  it('redactLogFields mascara phone/email e tokens', () => {
    const out = redactLogFields({
      phone: '11987654321',
      email: 'a@b.com',
      token: 'super-secret',
      appointmentId: 'uuid-1'
    });
    expect(out.phone).toBe('***4321');
    expect(out.email).toBe('a***@b.com');
    expect(out.token).toBe('[REDACTED]');
    expect(out.appointmentId).toBe('uuid-1');
  });
});

describe('fieldEncryption', () => {
  const original = process.env.PII_ENCRYPTION_KEY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PII_ENCRYPTION_KEY;
    } else {
      process.env.PII_ENCRYPTION_KEY = original;
    }
  });

  it('sem chave, retorna plaintext', () => {
    delete process.env.PII_ENCRYPTION_KEY;
    expect(encryptField('febre')).toBe('febre');
    expect(decryptField('febre')).toBe('febre');
  });

  it('com chave, cifra e decifra (round-trip)', () => {
    process.env.PII_ENCRYPTION_KEY = 'a'.repeat(64);
    const cipher = encryptField('tosse e febre')!;
    expect(cipher.startsWith(ENC_PREFIX)).toBe(true);
    expect(isEncryptedValue(cipher)).toBe(true);
    expect(decryptField(cipher)).toBe('tosse e febre');
  });

  it('não re-cifra valor já criptografado', () => {
    process.env.PII_ENCRYPTION_KEY = 'b'.repeat(64);
    const once = encryptField('dx')!;
    expect(encryptField(once)).toBe(once);
  });
});
