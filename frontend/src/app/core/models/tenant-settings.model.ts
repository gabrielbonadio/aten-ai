/** Resposta de GET/PUT /settings — tenant da clínica do usuário autenticado. */
export interface TenantSettings {
  id: number;
  name: string;
  slug: string;
  document: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  plan: 'free' | 'pro';
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export type UpdateTenantSettingsPayload = Partial<
  Pick<TenantSettings, 'name' | 'document' | 'phone' | 'address' | 'email'>
>;
