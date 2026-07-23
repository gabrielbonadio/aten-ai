/** Motivo do logout para feedback na tela de login. */
export type LogoutReason = 'manual' | 'session_expired';

const AUTH_NOTICE_KEY = 'aten-ai.auth_notice';

export function setAuthNotice(reason: LogoutReason): void {
  try {
    if (reason === 'session_expired') {
      sessionStorage.setItem(AUTH_NOTICE_KEY, reason);
    } else {
      sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }
  } catch {
    // ignore
  }
}

export function consumeAuthNotice(): LogoutReason | null {
  try {
    const v = sessionStorage.getItem(AUTH_NOTICE_KEY);
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    if (v === 'session_expired') return 'session_expired';
    return null;
  } catch {
    return null;
  }
}
