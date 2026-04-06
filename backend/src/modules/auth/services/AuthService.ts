import bcrypt from 'bcrypt';
import sequelize from '../../../config/database';
import { ConflictError, UnauthorizedError } from '../../../shared/errors/AppError';
import { ResendMailProvider } from '../../../shared/providers/MailProvider/ResendMailProvider';
import { signAccessToken } from '../../../shared/utils/jwt';
import tenantRepository from '../../tenants/repositories/TenantRepository';
import userRepository from '../repositories/UserRepository';
import type User from '../models/User';

const BCRYPT_SALT_ROUNDS = 12;
const mailProvider = new ResendMailProvider();

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
      await mailProvider.sendMail(
        user.email,
        'Bem-vindo ao Aten AI',
        welcomeHtml
      );
      console.log('[Mail] E-mail de boas-vindas enviado com sucesso para', user.email);
    } catch (err) {
      console.error('[Mail] Falha ao enviar e-mail de boas-vindas (cadastro já concluído):', err);
    }

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      tenantId: String(user.tenantId)
    });

    return {
      token,
      user: toUserView(user),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas.');
    }

    const match = await bcrypt.compare(input.password, user.password_hash);
    if (!match) {
      throw new UnauthorizedError('Credenciais inválidas.');
    }

    const token = signAccessToken({
      id: user.id,
      role: user.role,
      tenantId: String(user.tenantId)
    });

    const tenant = await tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new UnauthorizedError('Tenant não encontrado para este usuário.');
    }

    return {
      token,
      user: toUserView(user),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
    };
  }
}

export default new AuthService();
