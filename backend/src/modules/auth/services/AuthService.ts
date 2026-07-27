import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/database';
import { AppError, ConflictError, ForbiddenError, UnauthorizedError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logging/logger';
import type { IMailProvider } from '../../../shared/providers/MailProvider/IMailProvider';
import { ResendMailProvider } from '../../../shared/providers/MailProvider/ResendMailProvider';
import { signAccessToken } from '../../../shared/utils/jwt';
import tenantRepository from '../../tenants/repositories/TenantRepository';
import userRepository from '../repositories/UserRepository';
import userTokenRepository from '../repositories/UserTokenRepository';
import type User from '../models/User';
import {
  buildOtpAuthUrl,
  buildQrDataUrl,
  consumeRecoveryCode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  parseRecoveryHashes,
  serializeRecoveryHashes,
  verifyTotpCode
} from './totpCrypto';

const BCRYPT_SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const REFRESH_TOKEN_BYTES = 48;
const PENDING_2FA_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const PENDING_2FA_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Hash fixo só para equalizar timing quando o e-mail não existe (bcrypt de string dummy). */
const DUMMY_PASSWORD_HASH =
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgxdqO';

function hashOpaqueToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const safeLocal = local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;
  return `${safeLocal}@${domain}`;
}

/** Gera slug único para o tenant a partir do nome informado no cadastro. */
function generateTenantSlug(displayName: string): string {
  const base = displayName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${base || 'tenant'}-${suffix}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type SignUpInput = {
  tenantName: string;
  userName: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUserView = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: number;
};

export type TenantView = {
  id: number;
  name: string;
  slug: string;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user: AuthUserView;
  tenant: TenantView;
};

export type TotpChallengeResponse = {
  requiresTotp: true;
  pendingToken: string;
};

export type LoginResult = AuthResponse | TotpChallengeResponse;

export type TotpSetupResponse = {
  otpauthUrl: string;
  qrDataUrl: string;
  secret: string;
};

export type TotpConfirmResponse = {
  recoveryCodes: string[];
  enabledAt: string;
};

export type TotpStatusResponse = {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
};

function toUserView(user: User): AuthUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId
  };
}

class AuthService {
  constructor(private readonly mailProvider: IMailProvider = new ResendMailProvider()) {}

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = hashOpaqueToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await userTokenRepository.create({
      token: tokenHash,
      userId,
      purpose: 'refresh',
      expiresAt
    });

    return raw;
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const tenant = await tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new UnauthorizedError('Tenant não encontrado para este usuário.');
    }

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      tenantId: String(user.tenantId)
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      token,
      refreshToken,
      user: toUserView(user),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    };
  }

  /**
   * Cadastro multi-tenant: cria Tenant e o primeiro User (ADMIN) na mesma transação.
   * Se qualquer INSERT ou o hash falhar, o Sequelize desfaz tudo (rollback automático).
   */
  async signUp(input: SignUpInput): Promise<AuthResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const emailTaken = await userRepository.findByEmail(normalizedEmail);
    if (emailTaken) {
      throw new ConflictError('E-mail já cadastrado.');
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    const { tenant, user } = await sequelize.transaction(async (transaction) => {
      const tenantRow = await tenantRepository.create(
        {
          name: input.tenantName.trim(),
          slug: generateTenantSlug(input.tenantName)
        },
        { transaction }
      );

      const userRow = await userRepository.create(
        {
          name: input.userName.trim(),
          email: normalizedEmail,
          password_hash,
          role: 'ADMIN',
          tenantId: tenantRow.id
        },
        { transaction }
      );

      return { tenant: tenantRow, user: userRow };
    });

    try {
      const welcomeHtml = `
        <p>Olá, <strong>${escapeHtml(user.name)}</strong>!</p>
        <p>Bem-vindo ao <strong>Aten AI</strong>. O workspace <strong>${escapeHtml(tenant.name)}</strong> foi criado com sucesso.</p>
        <p>Você já pode acessar a plataforma com o e-mail cadastrado.</p>
      `.trim();
      await this.mailProvider.sendMail(user.email, 'Bem-vindo ao Aten AI', welcomeHtml);
      logger.info('mail.welcome_sent', { email: maskEmail(user.email) });
    } catch (err) {
      logger.error('mail.welcome_failed', {
        email: maskEmail(user.email),
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Fluxo seguro: sempre retorna sucesso, mesmo quando o e-mail não existe.
   * Isso evita vazamento de informação sobre quais e-mails estão cadastrados.
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) return;

    const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await sequelize.transaction(async (transaction) => {
      await userTokenRepository.deleteByUserIdAndPurpose(user.id, 'password_reset', { transaction });
      await userTokenRepository.create(
        {
          token,
          userId: user.id,
          purpose: 'password_reset',
          expiresAt
        },
        { transaction }
      );
    });

    const frontendBase = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/$/, '');
    const resetLink = `${frontendBase}/reset-password?token=${token}`;

    try {
      const html = `
        <p>Olá, <strong>${escapeHtml(user.name)}</strong>.</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Use o link abaixo para criar uma nova senha (válido por 2 horas):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Se você não solicitou, pode ignorar este e-mail.</p>
      `.trim();
      await this.mailProvider.sendMail(user.email, 'Redefinição de senha', html);
      logger.info('mail.reset_sent', { email: maskEmail(user.email) });
    } catch (err) {
      logger.error('mail.reset_failed', {
        email: maskEmail(user.email),
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenRow = await userTokenRepository.findByToken(token, 'password_reset');
    if (!tokenRow || tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new AppError('Token inválido ou expirado', 400);
    }

    // A troca de senha invalida o token usado e todas as sessões (refresh).
    await sequelize.transaction(async (transaction) => {
      const user = await userRepository.findById(tokenRow.userId, { transaction });
      if (!user) {
        throw new AppError('Token inválido ou expirado', 400);
      }

      const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      await userRepository.updatePasswordHash(user.id, password_hash, { transaction });

      await userTokenRepository.deleteById(tokenRow.id, { transaction });
      await userTokenRepository.deleteByUserIdAndPurpose(user.id, 'refresh', { transaction });
      await userTokenRepository.deleteByUserIdAndPurpose(user.id, 'totp_pending', { transaction });
      // Troca de senha invalida 2FA pendente/ativo? Mantemos TOTP, mas limpar pending.
    });
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await userRepository.findByEmail(email);

    // Dummy compare equaliza o tempo de resposta quando o e-mail não existe.
    const hashToCompare = user?.password_hash ?? DUMMY_PASSWORD_HASH;
    const match = await bcrypt.compare(input.password, hashToCompare);

    if (!user || !match) {
      throw new UnauthorizedError('Credenciais inválidas.');
    }

    if (user.role === 'ADMIN' && user.totpEnabledAt && user.totpSecret) {
      const pendingRaw = crypto.randomBytes(PENDING_2FA_TOKEN_BYTES).toString('hex');
      const pendingHash = hashOpaqueToken(pendingRaw);
      const expiresAt = new Date(Date.now() + PENDING_2FA_TTL_MS);

      await userTokenRepository.deleteByUserIdAndPurpose(user.id, 'totp_pending');
      await userTokenRepository.create({
        token: pendingHash,
        userId: user.id,
        purpose: 'totp_pending',
        expiresAt
      });

      return { requiresTotp: true, pendingToken: pendingRaw };
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Segundo fator do login: código TOTP (6 dígitos) ou recovery code.
   */
  async completeTotpLogin(input: {
    pendingToken: string;
    code?: string;
    recoveryCode?: string;
  }): Promise<AuthResponse> {
    const pendingHash = hashOpaqueToken(input.pendingToken.trim());
    const tokenRow = await userTokenRepository.findByToken(pendingHash, 'totp_pending');

    if (!tokenRow || tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Sessão de verificação expirada. Faça login novamente.');
    }

    const user = await userRepository.findById(tokenRow.userId);
    if (!user || user.role !== 'ADMIN' || !user.totpEnabledAt || !user.totpSecret) {
      throw new UnauthorizedError('Sessão de verificação inválida.');
    }

    const totpCode = input.code?.trim();
    const recoveryCode = input.recoveryCode?.trim();

    if (totpCode) {
      const secret = decryptTotpSecret(user.totpSecret);
      if (!verifyTotpCode(secret, totpCode)) {
        throw new UnauthorizedError('Código de autenticação inválido.');
      }
    } else if (recoveryCode) {
      const hashes = parseRecoveryHashes(user.totpRecoveryHashes);
      const remaining = consumeRecoveryCode(hashes, recoveryCode);
      if (!remaining) {
        throw new UnauthorizedError('Código de recuperação inválido.');
      }
      await userRepository.updateTotp(user.id, {
        totpRecoveryHashes: serializeRecoveryHashes(remaining)
      });
    } else {
      throw new AppError('Informe o código do autenticador ou um código de recuperação.', 400);
    }

    await userTokenRepository.deleteById(tokenRow.id);
    await userTokenRepository.deleteByUserIdAndPurpose(user.id, 'totp_pending');

    return this.buildAuthResponse(user);
  }

  getTotpStatus(userId: string): Promise<TotpStatusResponse> {
    return this.loadAdminForTotp(userId).then((user) => ({
      enabled: Boolean(user.totpEnabledAt && user.totpSecret),
      enabledAt: user.totpEnabledAt ? user.totpEnabledAt.toISOString() : null,
      recoveryCodesRemaining: parseRecoveryHashes(user.totpRecoveryHashes).length
    }));
  }

  async setupTotp(userId: string): Promise<TotpSetupResponse> {
    const user = await this.loadAdminForTotp(userId);

    if (user.totpEnabledAt) {
      throw new ConflictError('A autenticação em dois fatores já está ativa.');
    }

    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    await userRepository.updateTotp(user.id, {
      totpSecret: encrypted,
      totpEnabledAt: null,
      totpRecoveryHashes: null
    });

    const otpauthUrl = buildOtpAuthUrl(user.email, secret);
    const qrDataUrl = await buildQrDataUrl(otpauthUrl);

    return { otpauthUrl, qrDataUrl, secret };
  }

  async confirmTotp(userId: string, code: string): Promise<TotpConfirmResponse> {
    const user = await this.loadAdminForTotp(userId);

    if (user.totpEnabledAt) {
      throw new ConflictError('A autenticação em dois fatores já está ativa.');
    }
    if (!user.totpSecret) {
      throw new AppError('Inicie o setup do 2FA antes de confirmar.', 400);
    }

    const secret = decryptTotpSecret(user.totpSecret);
    if (!verifyTotpCode(secret, code)) {
      throw new UnauthorizedError('Código de autenticação inválido.');
    }

    const { codes, hashes } = generateRecoveryCodes();
    const enabledAt = new Date();
    await userRepository.updateTotp(user.id, {
      totpEnabledAt: enabledAt,
      totpRecoveryHashes: serializeRecoveryHashes(hashes)
    });

    return { recoveryCodes: codes, enabledAt: enabledAt.toISOString() };
  }

  async disableTotp(
    userId: string,
    input: { password: string; code?: string; recoveryCode?: string }
  ): Promise<void> {
    const user = await this.loadAdminForTotp(userId);

    if (!user.totpEnabledAt || !user.totpSecret) {
      throw new AppError('A autenticação em dois fatores não está ativa.', 400);
    }

    const passwordOk = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordOk) {
      throw new UnauthorizedError('Senha incorreta.');
    }

    await this.assertTotpOrRecovery(user, input.code, input.recoveryCode);
    await userRepository.clearTotp(user.id);
    await userTokenRepository.deleteByUserIdAndPurpose(user.id, 'totp_pending');
  }

  async regenerateRecoveryCodes(
    userId: string,
    input: { password: string; code?: string; recoveryCode?: string }
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.loadAdminForTotp(userId);

    if (!user.totpEnabledAt || !user.totpSecret) {
      throw new AppError('A autenticação em dois fatores não está ativa.', 400);
    }

    const passwordOk = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordOk) {
      throw new UnauthorizedError('Senha incorreta.');
    }

    await this.assertTotpOrRecovery(user, input.code, input.recoveryCode);

    const { codes, hashes } = generateRecoveryCodes();
    await userRepository.updateTotp(user.id, {
      totpRecoveryHashes: serializeRecoveryHashes(hashes)
    });

    return { recoveryCodes: codes };
  }

  private async loadAdminForTotp(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuário não autenticado.');
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('2FA disponível apenas para administradores.');
    }
    return user;
  }

  private async assertTotpOrRecovery(
    user: User,
    code?: string,
    recoveryCode?: string
  ): Promise<void> {
    if (!user.totpSecret) {
      throw new AppError('2FA inválido.', 400);
    }

    if (code?.trim()) {
      const secret = decryptTotpSecret(user.totpSecret);
      if (!verifyTotpCode(secret, code)) {
        throw new UnauthorizedError('Código de autenticação inválido.');
      }
      return;
    }

    if (recoveryCode?.trim()) {
      const hashes = parseRecoveryHashes(user.totpRecoveryHashes);
      const remaining = consumeRecoveryCode(hashes, recoveryCode);
      if (!remaining) {
        throw new UnauthorizedError('Código de recuperação inválido.');
      }
      await userRepository.updateTotp(user.id, {
        totpRecoveryHashes: serializeRecoveryHashes(remaining)
      });
      return;
    }

    throw new AppError('Informe o código do autenticador ou um código de recuperação.', 400);
  }

  /**
   * Troca refresh token (rotação): invalida o atual e emite access + refresh novos.
   */
  async refresh(refreshTokenRaw: string): Promise<AuthResponse> {
    const tokenHash = hashOpaqueToken(refreshTokenRaw);
    const tokenRow = await userTokenRepository.findByToken(tokenHash, 'refresh');

    if (!tokenRow || tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token inválido ou expirado.');
    }

    const user = await userRepository.findById(tokenRow.userId);
    if (!user) {
      throw new UnauthorizedError('Refresh token inválido ou expirado.');
    }

    await userTokenRepository.deleteById(tokenRow.id);
    return this.buildAuthResponse(user);
  }

  /** Revoga um refresh token (logout). Idempotente. */
  async logout(refreshTokenRaw: string): Promise<void> {
    const tokenHash = hashOpaqueToken(refreshTokenRaw);
    const tokenRow = await userTokenRepository.findByToken(tokenHash, 'refresh');
    if (tokenRow) {
      await userTokenRepository.deleteById(tokenRow.id);
    }
  }
}

export default new AuthService();
