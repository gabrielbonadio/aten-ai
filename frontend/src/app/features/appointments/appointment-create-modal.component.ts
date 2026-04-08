import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { Pet } from '../../core/models/pet.model';
import type { Appointment, AppointmentType, CreateAppointmentPayload } from '../../core/models/appointment.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { PetService } from '../../core/services/pet.service';
import { NotificationService } from '../../shared/notifications/notification.service';

const APPOINTMENT_TYPES: { label: string; value: AppointmentType }[] = [
  { label: 'Consulta', value: 'CONSULTATION' },
  { label: 'Vacina', value: 'VACCINE' },
  { label: 'Cirurgia', value: 'SURGERY' },
  { label: 'Outro', value: 'OTHER' }
];

@Component({
  selector: 'app-appointment-create-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './appointment-create-modal.component.html'
})
export class AppointmentCreateModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly petService = inject(PetService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly notifications = inject(NotificationService);

  readonly open = input(false);
  readonly editingAppointment = input<Appointment | null>(null);
  readonly dismissed = output<void>();
  readonly created = output<void>();

  readonly editingId = computed(() => this.editingAppointment()?.id ?? null);

  readonly pets = signal<Pet[]>([]);
  readonly petsLoading = signal(false);
  readonly submitting = signal(false);

  readonly petSearchTerm = signal('');
  readonly petSelectedName = signal('');
  readonly petQuery = signal('');
  readonly petDropdownOpen = signal(false);

  readonly typeOptions = APPOINTMENT_TYPES;

  readonly form = this.fb.nonNullable.group({
    petId: ['', Validators.required],
    scheduledAtLocal: ['', Validators.required],
    type: this.fb.nonNullable.control<AppointmentType>('CONSULTATION', Validators.required)
  });

  readonly filteredPets = computed(() => {
    const q = this.petQuery().trim().toLowerCase();
    const list = this.pets();
    if (!q) return list;
    return list.filter((p) => {
      const petName = p.name?.toLowerCase() ?? '';
      const tutorName = p.tutor?.name?.toLowerCase() ?? '';
      return petName.includes(q) || tutorName.includes(q);
    });
  });

  constructor() {}

  ngOnInit(): void {
    // Obrigatório: garante carga de pets mesmo fora do ciclo do `open()`.
    this.loadPets();
  }

  /** Imperativo: preparar estado para criação (sem effects). */
  openForCreate(): void {
    this.form.reset({
      petId: '',
      scheduledAtLocal: '',
      type: 'CONSULTATION'
    });
    this.petSearchTerm.set('');
    this.petSelectedName.set('');
    this.petQuery.set('');
    this.petDropdownOpen.set(false);
    this.loadPets();
  }

  /** Imperativo: preparar estado para edição (sem effects). */
  openForEdit(appointment: Appointment): void {
    const iso = this.whenOf(appointment);
    const local = iso ? this.isoToLocalDatetime(iso) : '';
    this.form.reset({
      petId: appointment.petId,
      scheduledAtLocal: local,
      type: this.normalizeType(appointment.type)
    });
    const selectedName = appointment.pet?.name ?? '';
    this.petSearchTerm.set(selectedName);
    this.petSelectedName.set(selectedName);
    this.petQuery.set('');
    this.petDropdownOpen.set(false);
    this.loadPets();
  }

  private loadPets(): void {
    this.petsLoading.set(true);
    this.petService.findAll().subscribe({
      next: (list) => {
        const safe = Array.isArray(list) ? list : [];
        this.pets.set(safe);
        this.petsLoading.set(false);

        // Se estiver editando e o nome do pet não veio no payload da API,
        // resolve pelo petId para não deixar o input visual vazio.
        const editing = this.editingAppointment();
        if (editing && !this.petSearchTerm().trim()) {
          const found = safe.find((p) => p.id === editing.petId);
          if (found) {
            this.petSearchTerm.set(found.name);
            this.petSelectedName.set(found.name);
          }
        }

        if (safe.length === 0 && this.open()) {
          this.notifications.warning('Cadastre um pet antes de marcar um agendamento.');
        }
      },
      error: () => {
        this.pets.set([]);
        this.petsLoading.set(false);
        this.notifications.error('Não foi possível carregar os pets.');
      }
    });
  }

  onPetSearchFocus(event: FocusEvent): void {
    this.petDropdownOpen.set(true);
    // Ao focar, mostra lista completa (sem filtrar pelo texto atual)
    this.petQuery.set('');

    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    if (this.petSearchTerm().trim() && this.petSearchTerm().trim() === this.petSelectedName().trim()) {
      queueMicrotask(() => input.select());
    }
  }

  onPetSearchBlur(): void {
    this.petDropdownOpen.set(false);
  }

  selectPet(p: Pet): void {
    this.form.controls.petId.setValue(p.id);
    this.form.controls.petId.markAsDirty();
    this.form.controls.petId.markAsTouched();
    this.petSearchTerm.set(p.name);
    this.petSelectedName.set(p.name);
    this.petQuery.set('');
    // Fechamento na seleção (obrigatório)
    this.petDropdownOpen.set(false);
  }

  closeModal(): void {
    if (this.submitting()) return;
    this.form.reset({
      petId: '',
      scheduledAtLocal: '',
      type: 'CONSULTATION'
    });
    this.petSearchTerm.set('');
    this.petSelectedName.set('');
    this.petQuery.set('');
    this.petDropdownOpen.set(false);
    // O editingAppointment é controlado pelo pai; ao emitir dismissed, o pai limpa esse estado.
    this.dismissed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.closeModal();
  }

  showFieldError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private extractApiMessage(err: unknown): string {
    const fallback = 'Não foi possível criar o agendamento. Tente novamente.';
    if (!(err instanceof HttpErrorResponse)) return fallback;
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
    if (typeof body === 'string' && body.trim()) {
      // Evita mostrar HTML cru (ex.: 404 do proxy) no toaster.
      if (/<(html|!doctype)/i.test(body)) return 'Erro ao conectar com o servidor.';
      return body;
    }
    return fallback;
  }

  private localToIso(local: string): string | null {
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  private isoToLocalDatetime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private whenOf(a: Appointment): string {
    const anyA = a as unknown as { date?: unknown; scheduledAt?: unknown };
    const d = anyA.date;
    if (typeof d === 'string' && d.trim()) return d;
    const s = anyA.scheduledAt;
    if (typeof s === 'string' && s.trim()) return s;
    return '';
  }

  private normalizeType(type: unknown): AppointmentType {
    const raw = typeof type === 'string' ? type.trim().toUpperCase() : '';
    if (raw === 'CONSULTATION') return 'CONSULTATION';
    if (raw === 'VACCINE') return 'VACCINE';
    if (raw === 'SURGERY') return 'SURGERY';
    if (raw === 'OTHER') return 'OTHER';
    // Se vier traduzido (legado)
    if (raw === 'CONSULTA') return 'CONSULTATION';
    if (raw === 'VACINA') return 'VACCINE';
    if (raw === 'CIRURGIA') return 'SURGERY';
    if (raw === 'OUTRO') return 'OTHER';
    return 'CONSULTATION';
  }

  submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notifications.warning('Por favor, preencha Pet, Data/Hora e Tipo.');
      return;
    }

    if (this.pets().length === 0) {
      this.notifications.warning('Cadastre um pet antes de marcar um agendamento.');
      return;
    }

    const v = this.form.getRawValue();
    const iso = this.localToIso(v.scheduledAtLocal);
    if (!iso) {
      this.notifications.warning('Informe uma data/hora válida.');
      return;
    }

    const payload: CreateAppointmentPayload = {
      petId: v.petId,
      date: iso,
      type: v.type
    };

    this.submitting.set(true);
    const editing = this.editingAppointment();
    const req$ = editing?.id
      ? this.appointmentService.update(editing.id, payload)
      : this.appointmentService.create(payload);

    req$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success(editing?.id ? 'Agendamento atualizado com sucesso.' : 'Agendamento criado com sucesso.');
        this.created.emit();
        this.closeModal();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.notifications.error(this.extractApiMessage(err));
      }
    });
  }
}

