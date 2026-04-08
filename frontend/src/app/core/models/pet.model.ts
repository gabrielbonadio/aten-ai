/** Tutor resumido quando a API inclui `include: tutor` na listagem de pets */
export interface PetTutorSummary {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface Pet {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  birthDate: string | null;
  /** Sequelize DECIMAL pode vir como string no JSON */
  weight: number | string | null;
  tutorId: string;
  tutor?: PetTutorSummary | null;
}

/** Corpo do POST /pets — tenant vem do token no back-end */
export interface CreatePetPayload {
  tutorId: string;
  name: string;
  species?: string | null;
  breed?: string | null;
  birthDate?: string | null;
  weight?: number | null;
}
