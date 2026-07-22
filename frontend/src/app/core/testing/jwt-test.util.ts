/**
 * Monta um JWT fake (header.payload.signature) apenas para testes no browser.
 * A assinatura não é validada pelo AuthGuard/interceptor — só o payload Base64.
 */
export function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'none', typ: 'JWT' };
  const encode = (obj: unknown): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  return `${encode(header)}.${encode(payload)}.test-signature`;
}

export function buildValidJwt(overrides: Record<string, unknown> = {}): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60; // +1h
  return buildFakeJwt({
    id: 'user-1',
    role: 'ADMIN',
    tenantId: '42',
    exp,
    ...overrides
  });
}

export function buildExpiredJwt(overrides: Record<string, unknown> = {}): string {
  const exp = Math.floor(Date.now() / 1000) - 60; // -1min
  return buildFakeJwt({
    id: 'user-1',
    role: 'ADMIN',
    tenantId: '42',
    exp,
    ...overrides
  });
}
