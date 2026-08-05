/** Apenas dígitos. */
export function digitsOnly(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Formata centavos como moeda BRL (ex.: 15050 → "R$ 150,50"). */
export function formatCentsAsBRL(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/**
 * Máscara de digitação BRL: dígitos entram como centavos
 * (1 → R$ 0,01; 15000 → R$ 150,00).
 */
export function maskBRLFromDigitCents(raw: string, maxDigits = 11): string {
  const d = digitsOnly(raw).slice(0, maxDigits);
  if (!d) return '';
  return formatCentsAsBRL(Number(d));
}

/** Converte input mascarado/digitado em centavos; vazio → null. */
export function parseBRLInputToCents(raw: string): number | null {
  const d = digitsOnly(raw);
  if (!d) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

/** Telefone BR: (00) 0000-0000 ou (00) 00000-0000 */
export function formatPhoneBR(digits: string): string {
  const d = digitsOnly(digits).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/** CPF (11) ou CNPJ (14) com máscara visual. */
export function formatCpfCnpj(digits: string): string {
  const d = digitsOnly(digits).slice(0, 14);
  if (d.length === 0) return '';
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}
