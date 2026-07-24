import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'aten_access';
export const REFRESH_COOKIE = 'aten_refresh';

const ACCESS_MAX_AGE_MS = 60 * 60 * 1000; // 1h — alinhado ao JWT_EXPIRES_IN padrão
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d

function baseCookieOptions(): CookieOptions {
  const isProduction = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

/** Grava access + refresh em cookies httpOnly (o JSON da API continua trazendo os tokens). */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const base = baseCookieOptions();
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: REFRESH_MAX_AGE_MS });
}

export function clearAuthCookies(res: Response): void {
  const base = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
