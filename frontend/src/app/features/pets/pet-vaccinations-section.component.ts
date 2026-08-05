import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { PetVaccination } from '../../core/models/pet-vaccination.model';
import { PetVaccinationService } from '../../core/services/pet-vaccination.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';

@Component({
  selector: 'app-pet-vaccinations-section',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, LucideAngularModule, LoadErrorComponent],
  templateUrl: './pet-vaccinations-section.component.html'
})
export class PetVaccinationsSectionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vaccinationService = inject(PetVaccinationService);
  private readonly notifications = inject(NotificationService);

  readonly petId = input.required<string>();

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly vaccinations = signal<PetVaccination[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    appliedAt: ['', Validators.required],
    nextDueAt: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.petId();
    if (!id) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.vaccinationService.listByPet(id).subscribe({
      next: (list) => {
        const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) => {
          const ta = a.nextDueAt ? new Date(a.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
          const tb = b.nextDueAt ? new Date(b.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
          if (ta !== tb) return ta - tb;
          return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
        });
        this.vaccinations.set(sorted);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.loadError.set(true);
        if (err instanceof HttpErrorResponse && err.status === 403) return;
      }
    });
  }

  formatDate(raw: string | null | undefined): string {
    if (!raw) return '—';
    const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isOverdue(v: PetVaccination): boolean {
    if (!v.nextDueAt) return false;
    const d = new Date(v.nextDueAt.includes('T') ? v.nextDueAt : `${v.nextDueAt}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  }

  showFieldError(name: 'name' | 'appliedAt' | 'nextDueAt'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  private dateYmdToIso(ymd: string): string | null {
    const parts = ymd.trim().split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
    const dt = new Date(y, m - 1, day, 12, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }

  submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notifications.warning('Informe o nome da vacina e a data de aplicação.');
      return;
    }

    const v = this.form.getRawValue();
    const appliedIso = this.dateYmdToIso(v.appliedAt);
    if (!appliedIso) {
      this.notifications.warning('Data de aplicação inválida.');
      return;
    }

    let nextIso: string | null = null;
    const nextRaw = v.nextDueAt?.trim();
    if (nextRaw) {
      nextIso = this.dateYmdToIso(nextRaw);
      if (!nextIso) {
        this.notifications.warning('Data da próxima dose inválida.');
        return;
      }
    }

    this.saving.set(true);
    this.vaccinationService
      .create({
        petId: this.petId(),
        name: v.name.trim(),
        appliedAt: appliedIso,
        nextDueAt: nextIso
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.reset({ name: '', appliedAt: '', nextDueAt: '' });
          this.notifications.success('Vacina registrada.');
          this.load();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          if (err instanceof HttpErrorResponse && err.status === 403) return;
          this.notifications.error(this.extractApiMessage(err));
        }
      });
  }

  private extractApiMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) return 'Não foi possível salvar a vacina.';
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m.trim();
    }
    return 'Não foi possível salvar a vacina.';
  }
}
