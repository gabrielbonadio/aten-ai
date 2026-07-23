import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/database';
import { AppError, ConflictError, UnauthorizedError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logging/logger';
import type { IMailProvider } from '../../../shared/providers/MailProvider/IMailProvider';
import { ResendMailProvider } from '../../../shared/providers/MailProvider/ResendMailProvider';
import { signAccessToken } from '../../../shared/utils/jwt';
import tenantRepository from '../../tenants/repositories/TenantRepository';
import userRepository from '../repositories/UserRepository';
import userTokenRepository from '../repositories/UserTokenRepository';
import type User from '../models/User';

const BCRYPT_SALT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const REFRESH_TOKEN_BYTES = 48;
const RESET_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

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
    });
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await userRepository.findByEmail(email);

    // Dummy compare equaliza o tempo de resposta quando o e-mail não existe.
    const hashToCompare = user?.password_hash ?? DUMMY_PASSWORD_HASH;
    const match = await bcrypt.compare(input.password, hashToCompare);

    if (!user || !match) {
      throw new UnauthorizedError('Credenciais inválidas.');
    }

    return this.buildAuthResponse(user);
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
