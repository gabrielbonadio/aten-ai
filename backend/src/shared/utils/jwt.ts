import jwt, { type SignOptions } from 'jsonwebtoken';

/** Payload obrigatório do JWT: identifica o usuário, o papel e o tenant. */
export type AccessTokenPayload = {
  id: string;
  role: string;
  tenantId: string;
};

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

const MIN_SECRET_LENGTH = 16;

/**
 * Lê JWT_SECRET em tempo de execução (não em carga do módulo), para funcionar
 * mesmo quando o .env é carregado depois do primeiro import deste arquivo.
 */
function requireJwtSecret(): string {
  const raw = process.env.JWT_SECRET;
  const secret = typeof raw === 'string' ? raw.trim() : '';

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET não configurado ou muito curto (mínimo ${MIN_SECRET_LENGTH} caracteres após trim).`
    );
  }

  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const signOptions: SignOptions = {
    expiresIn: (JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']
  };
  return jwt.sign(payload, requireJwtSecret(), signOptions);
}

function normalizeTenantId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/**
 * Valida assinatura e expiração do JWT e retorna o payload tipado.
 * Aceita tenantId como string no token ou número legado (convertido para string).
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, requireJwtSecret()) as jwt.JwtPayload &
    Partial<Record<'id' | 'role' | 'tenantId', unknown>>;

  if (typeof decoded.id !== 'string' || typeof decoded.role !== 'string') {
    throw new Error('Token inválido: payload incompleto.');
  }

  const tenantId = normalizeTenantId(decoded.tenantId);
  if (tenantId === null) {
    throw new Error('Token inválido: payload incompleto.');
  }

  return {
    id: decoded.id,
    role: decoded.role,
    tenantId
  };
}
