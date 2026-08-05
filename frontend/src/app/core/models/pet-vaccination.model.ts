/** Vacina / reforço do pet (API pet_vaccinations). */
export interface PetVaccination {
  id: string;
  petId: string;
  tenantId?: number;
  /** Nome da vacina (ex.: V10, Antirrábica). */
  name: string;
  /** Data da aplicação (ISO). */
  appliedAt: string;
  /** Próxima dose (ISO); null se não houver reforço marcado. */
  nextDueAt?: string | null;
  reminderSentAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePetVaccinationPayload {
  petId: string;
  name: string;
  /** ISO date/datetime. */
  appliedAt: string;
  /** ISO date/datetime ou null. */
  nextDueAt?: string | null;
}
