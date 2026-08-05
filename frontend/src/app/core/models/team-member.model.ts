/** Papéis do tenant (S2). Sem matriz RBAC completa. */
export type TeamMemberRole = 'ADMIN' | 'MEMBER';

/** Usuário do tenant retornado por GET /users (sem password_hash). */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole | string;
  tenantId?: number;
  /** false / omitido: convite ainda não aceito, se o BE enviar. */
  active?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InviteTeamMemberPayload {
  email: string;
  role?: TeamMemberRole;
}

export interface InviteTeamMemberResponse {
  message?: string;
  user?: TeamMember;
}

export interface AcceptInvitePayload {
  token: string;
  name: string;
  password: string;
}
