import {
  digitsOnly,
  formatCentsAsBRL,
  maskBRLFromDigitCents,
  parseBRLInputToCents
} from './br-masks';

describe('br-masks money (S7)', () => {
  it('formatCentsAsBRL', () => {
    expect(formatCentsAsBRL(0)).toContain('0,00');
    expect(formatCentsAsBRL(15050)).toContain('150,50');
    expect(formatCentsAsBRL(null)).toBe('');
  });

  it('maskBRLFromDigitCents e parse round-trip', () => {
    expect(maskBRLFromDigitCents('15000')).toContain('150,00');
    expect(parseBRLInputToCents('R$ 150,00')).toBe(15000);
    expect(parseBRLInputToCents('')).toBeNull();
    expect(digitsOnly('R$ 1.234,56')).toBe('123456');
  });
});
