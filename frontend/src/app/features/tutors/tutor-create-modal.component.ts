import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { CreateTutorPayload, Tutor } from '../../core/models/tutor.model';
import { TutorService } from '../../core/services/tutor.service';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-tutor-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './tutor-create-modal.component.html'
})
export class TutorCreateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly tutorService = inject(TutorService);
  private readonly notifications = inject(NotificationService);

  readonly open = input(false);
  readonly editingTutor = input<Tutor | null>(null);
  readonly dismissed = output<void>();
  readonly saved = output<void>();

  readonly editingId = computed(() => this.editingTutor()?.id ?? null);
  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: [''],
    phone: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(32)]],
    address: ['']
  });

  openForCreate(): void {
    this.form.reset({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
  }

  openForEdit(tutor: Tutor): void {
    this.form.reset({
      name: tutor.name ?? '',
      email: tutor.email ?? '',
      phone: tutor.phone ?? '',
      address: tutor.address ?? ''
    });
  }

  closeModal(): void {
    if (this.submitting()) return;
    this.form.reset({ name: '', email: '', phone: '', address: '' });
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

  private extractApiMessage(err: unknown): string {
    const fallback = 'Não foi possível salvar o tutor. Tente novamente.';
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
      this.notifications.warning('Preencha os campos obrigatórios corretamente.');
      return;
    }

    const v = this.form.getRawValue();
    const emailTrim = v.email?.trim() ?? '';
    const payload: CreateTutorPayload = {
      name: v.name.trim(),
      phone: v.phone.trim(),
      email: emailTrim ? emailTrim : null,
      address: v.address?.trim() ? v.address.trim() : null
    };

    this.submitting.set(true);
    const editing = this.editingTutor();
    const req$ = editing?.id
      ? this.tutorService.update(editing.id, payload)
      : this.tutorService.create(payload);

    req$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success(editing?.id ? 'Tutor atualizado com sucesso.' : 'Tutor cadastrado com sucesso.');
        this.saved.emit();
        this.closeModal();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.notifications.error(this.extractApiMessage(err));
      }
    });
  }
}
