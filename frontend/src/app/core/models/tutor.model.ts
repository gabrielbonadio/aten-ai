/** Tutor como retornado pela API (lista pode incluir `pets` para contagem). */
export interface Tutor {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address?: string | null;
  pets?: TutorPetRef[] | null;
}

export interface TutorPetRef {
  id: string;
  name?: string;
}

export interface CreateTutorPayload {
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
}
