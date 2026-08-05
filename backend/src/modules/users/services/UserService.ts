import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/database';
import {
  BadRequestError,
  ConflictError,
  NotFoundError
} from '../../../shared/errors/AppError';
import { logger } from '../../../shared/logging/logger';
import type { IMailProvider } from '../../../shared/providers/MailProvider/IMailProvider';
import { ResendMailProvider } from '../../../shared/providers/MailProvider/ResendMailProvider';
import type { UserRole } from '../../auth/models/User';
import type User from '../../auth/models/User';
import userRepository from '../../auth/repositories/UserRepository';
import userTokenRepository from '../../auth/repositories/UserTokenRepository';

const BCRYPT_SALT_ROUNDS = 12;
const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export type InviteUserInput = {
  email: string;
  role?: UserRole;
};

export type UpdateTenantUserInput = {
  role?: UserRole;
  active?: boolean;
};

export type TenantUserView = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const safeLocal = local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;
  return `${safeLocal}@${domain}`;
}

function toTenantUserView(user: User): TenantUserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

class UserService {
  constructor(private readonly mailProvider: IMailProvider = new ResendMailProvider()) {}

  async listByTenant(tenantId: number): Promise<TenantUserView[]> {
    const rows = await userRepository.findAllByTenant(tenantId);
    return rows.map(toTenantUserView);
  }

  /**
   * Convida usuário ao tenant do ADMIN autenticado.
   * Não cria tenant novo — apenas User inactive + token `invite`.
   */
  async invite(input: InviteUserInput, tenantId: number): Promise<TenantUserView> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const role: UserRole = input.role ?? 'MEMBER';

    const existingInTenant = await userRepository.findByEmailAndTenant(normalizedEmail, tenantId);
    if (existingInTenant) {
      throw new ConflictError('E-mail já cadastrado neste tenant.');
    }

    const existingAnywhere = await userRepository.findByEmail(normalizedEmail);
    if (existingAnywhere) {
      throw new ConflictError('E-mail já cadastrado.');
    }

    const placeholderPassword = crypto.randomBytes(32).toString('hex');
    const password_hash = await bcrypt.hash(placeholderPassword, BCRYPT_SALT_ROUNDS);
    const localPart = normalizedEmail.split('@')[0] || 'Convidado';
    const placeholderName = localPart.slice(0, 255);

    const token = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    const user = await sequelize.transaction(async (transaction) => {
      const created = await userRepository.create(
        {
          name: placeholderName,
          email: normalizedEmail,
          password_hash,
          role,
          tenantId,
          active: false
        },
        { transaction }
      );

      await userTokenRepository.create(
        {
          token,
          userId: created.id,
          purpose: 'invite',
          expiresAt
        },
        { transaction }
      );

      return created;
    });

    const frontendBase = (process.env.FRONTEND_URL ?? 'http://localhost:4200').replace(/\/$/, '');
    const inviteLink = `${frontendBase}/accept-invite?token=${token}`;

    try {
      const html = `
        <p>Olá!</p>
        <p>Você foi convidado para a equipe no <strong>Aten AI</strong>.</p>
        <p>Use o link abaixo para definir seu nome e senha (válido por 7 dias):</p>
        <p><a href="${inviteLink}">${escapeHtml(inviteLink)}</a></p>
        <p>Se você não esperava este convite, pode ignorar este e-mail.</p>
      `.trim();
      await this.mailProvider.sendMail(user.email, 'Convite para o Aten AI', html);
      logger.info('mail.invite_sent', { email: maskEmail(user.email) });
    } catch (err) {
      logger.error('mail.invite_failed', {
        email: maskEmail(user.email),
        error: err instanceof Error ? err.message : String(err)
      });
    }

    return toTenantUserView(user);
  }

  async update(
    id: string,
    tenantId: number,
    input: UpdateTenantUserInput
  ): Promise<TenantUserView> {
    const user = await userRepository.findByIdAndTenant(id, tenantId);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado.');
    }

    const nextRole = input.role ?? user.role;
    const nextActive = input.active !== undefined ? input.active : user.active;

    const losesAdminSeat =
      user.role === 'ADMIN' && user.active && (nextRole !== 'ADMIN' || nextActive === false);

    if (losesAdminSeat) {
      const remainingAdmins = await userRepository.countActiveAdmins(tenantId, {
        excludeUserId: user.id
      });
      if (remainingAdmins === 0) {
        throw new BadRequestError('Não é possível remover ou desativar o último ADMIN do tenant.');
      }
    }

    const patch: UpdateTenantUserInput = {};
    if (input.role !== undefined) patch.role = input.role;
    if (input.active !== undefined) patch.active = input.active;

    if (Object.keys(patch).length > 0) {
      await userRepository.updateById(user.id, patch);
    }

    const refreshed = await userRepository.findByIdAndTenant(id, tenantId);
    if (!refreshed) {
      throw new NotFoundError('Usuário não encontrado.');
    }
    return toTenantUserView(refreshed);
  }
}

export default new UserService();
