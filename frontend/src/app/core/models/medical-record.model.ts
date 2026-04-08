export interface MedicalRecordVeterinarian {
  id: string;
  name: string;
}

/** Prontuário retornado pela API (lista ou include no pet). */
export interface MedicalRecord {
  id: string;
  tenantId?: number;
  petId: string;
  appointmentId?: string | null;
  veterinarianId: string;
  symptoms: string;
  diagnosis: string;
  prescription: string | null;
  weight: number | string | null;
  createdAt?: string;
  updatedAt?: string;
  veterinarian?: MedicalRecordVeterinarian | null;
}

export interface CreateMedicalRecordPayload {
  petId: string;
  appointmentId?: string | null;
  symptoms: string;
  diagnosis: string;
  prescription?: string | null;
  weight?: number | null;
}
