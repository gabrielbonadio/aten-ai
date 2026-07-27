import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensagens amigáveis para erros de auth (login/signup), sem vazar detalhes internos.
 */
export function mapAuthHttpError(
  err: unknown,
  context: 'login' | 'signup' | 'forgot' | 'reset'
): string {
  const status = err instanceof HttpErrorResponse ? err.status : (err as { status?: number })?.status;
  const apiMessage = extractApiMessage(err);

  if (context === 'login') {
    if (status === 401) {
      return apiMessage || 'E-mail ou senha incorretos. Verifique e tente novamente.';
    }
    if (status === 429) {
      return 'Muitas tentativas. Aguarde um momento e tente de novo.';
    }
    return apiMessage || 'Não foi possível entrar. Tente novamente.';
  }

  if (context === 'signup') {
    if (status === 409) {
      return (
        apiMessage ||
        'Este e-mail ou nome de clínica já está em uso. Tente outros dados ou entre na conta existente.'
      );
    }
    if (status === 400) {
      return apiMessage || 'Dados inválidos. Verifique os campos e tente novamente.';
    }
    return apiMessage || 'Não foi possível criar a conta. Tente novamente.';
  }

  if (context === 'forgot') {
    return apiMessage || 'Não foi possível enviar o e-mail. Tente novamente.';
  }

  // reset
  if (status === 400 || status === 404) {
    return (
      apiMessage ||
      'Não foi possível redefinir a senha. O link pode ser inválido ou ter expirado.'
    );
  }
  return apiMessage || 'Não foi possível redefinir a senha. Tente novamente.';
}

function extractApiMessage(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse) && typeof err !== 'object') {
    return null;
  }
  const body = err instanceof HttpErrorResponse ? err.error : (err as { error?: unknown })?.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  if (typeof body === 'string' && body.trim() && !/<(html|!doctype)/i.test(body)) {
    return body.trim();
  }
  const msg = (err as { message?: string })?.message;
  if (typeof msg === 'string' && msg.trim() && !msg.startsWith('Http failure')) {
    return msg.trim();
  }
  return null;
}
