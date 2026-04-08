import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { CreatePetPayload, Pet } from '../../core/models/pet.model';
import type { Tutor } from '../../core/models/tutor.model';
import { PetService } from '../../core/services/pet.service';
import { TutorService } from '../../core/services/tutor.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { PET_SPECIES_OPTIONS } from './pet-species.options';

@Component({
  selector: 'app-pet-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './pet-create-modal.component.html'
})
export class PetCreateModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly petService = inject(PetService);
  private readonly tutorService = inject(TutorService);
  private readonly notifications = inject(NotificationService);

  readonly open = input(false);
  readonly editingPet = input<Pet | null>(null);
  readonly dismissed = output<void>();
  readonly created = output<void>();

  readonly editingId = computed(() => this.editingPet()?.id ?? null);

  readonly speciesOptions = PET_SPECIES_OPTIONS;

  readonly tutors = signal<Tutor[]>([]);
  readonly tutorsLoading = signal(false);
  readonly tutorFilter = signal('');
  readonly submitting = signal(false);

  readonly filteredTutors = computed(() => {
    const q = this.tutorFilter().trim().toLowerCase();
    const list = this.tutors();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        (t.email?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    species: ['', Validators.required],
    breed: [''],
    birthDate: [''],
    weight: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01)
    ]),
    tutorId: ['', Validators.required]
  });

  constructor() {}

  ngOnInit(): void {
    this.loadTutors();
  }

  private loadTutors(): void {
    this.tutorsLoading.set(true);
    this.tutorService.findAll().subscribe({
      next: (data) => {
        console.log('Tutores carregados:', data);
        const list = Array.isArray(data) ? data : [];
        this.tutors.set(list);
        this.tutorsLoading.set(false);
        if (list.length === 0 && this.open()) {
          this.notifications.warning('Cadastre um tutor antes de adicionar um pet.');
        }
      },
      error: (err: unknown) => {
        console.error('Erro ao buscar tutores:', err);
        this.tutors.set([]);
        this.tutorsLoading.set(false);
        const msg =
          err instanceof HttpErrorResponse ? this.extractApiMessage(err) : 'Não foi possível carregar os tutores.';
        this.notifications.error(msg);
      }
    });
  }

  openForCreate(): void {
    this.tutorFilter.set('');
    this.form.reset({
      name: '',
      species: '',
      breed: '',
      birthDate: '',
      weight: null,
      tutorId: ''
    });
    this.loadTutors();
  }

  openForEdit(pet: Pet): void {
    const birth = pet.birthDate ? new Date(pet.birthDate) : null;
    const birthLocal =
      birth && !Number.isNaN(birth.getTime())
        ? `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, '0')}-${String(birth.getDate()).padStart(2, '0')}`
        : '';
    const weight =
      pet.weight === null || pet.weight === undefined
        ? null
        : typeof pet.weight === 'string'
          ? Number(pet.weight)
          : pet.weight;

    this.tutorFilter.set('');
    this.form.reset({
      name: pet.name ?? '',
      species: pet.species ?? '',
      breed: pet.breed ?? '',
      birthDate: birthLocal,
      weight: Number.isFinite(weight as number) ? (weight as number) : null,
      tutorId: pet.tutorId ?? ''
    });
    this.loadTutors();
  }

  closeModal(): void {
    if (this.submitting()) return;
    this.form.reset({
      name: '',
      species: '',
      breed: '',
      birthDate: '',
      weight: null,
      tutorId: ''
    });
    this.tutorFilter.set('');
    this.dismissed.emit();
  }

  close(): void {
    this.closeModal();
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

  /** Mensagem do back-end (`{ message }`) ou texto plano; fallback genérico. */
  private extractApiMessage(err: unknown): string {
    const fallback = 'Não foi possível cadastrar o pet. Tente novamente.';
    if (!(err instanceof HttpErrorResponse)) return fallback;
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
    if (typeof body === 'string' && body.trim()) {
      if (/<(html|!doctype)/i.test(body)) return 'Erro ao conectar com o servidor.';
      return body;
    }
    return fallback;
  }

  submit(): void {
    if (this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notifications.warning(
        'Por favor, preencha todos os campos obrigatórios, incluindo o Tutor.'
      );
      return;
    }

    const v = this.form.getRawValue();
    const birth = v.birthDate?.trim();
    const payload: CreatePetPayload = {
      tutorId: v.tutorId,
      name: v.name.trim(),
      species: v.species.trim() || null,
      breed: v.breed?.trim() || null,
      birthDate: birth ? `${birth}T12:00:00.000Z` : null,
      weight: v.weight != null ? Number(v.weight) : null
    };

    this.submitting.set(true);
    const editing = this.editingPet();
    const req$ = editing?.id ? this.petService.update(editing.id, payload) : this.petService.create(payload);
    req$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success(editing?.id ? 'Pet atualizado com sucesso.' : 'Pet cadastrado com sucesso.');
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
