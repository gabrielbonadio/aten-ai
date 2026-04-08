/**
 * Normaliza telefone brasileiro para exibição com DDI (+55) e DDD quando possível.
 * Aceita valores já com 55 ou apenas DDD+número (10–11 dígitos após limpar).
 */
export function formatBrazilPhoneE164(phone: string | null | undefined): string {
  if (phone == null || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `+55${digits}`;
  }
  return digits.length > 0 ? `+${digits}` : '';
}
