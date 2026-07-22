export interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 0): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}
