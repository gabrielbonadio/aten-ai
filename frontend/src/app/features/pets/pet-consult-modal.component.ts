import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, map, of, switchMap } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';
import { MedicalRecordService } from '../../core/services/medical-record.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { maskBRLFromDigitCents, parseBRLInputToCents } from '../../shared/utils/br-masks';

@Component({
  selector: 'app-pet-consult-modal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './pet-consult-modal.component.html'
})
export class PetConsultModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly notifications = inject(NotificationService);

  readonly open = input(false);
  readonly petId = input.required<string>();
  /** Quando aberto a partir da agenda — back marca COMPLETED ao salvar o prontuário. */
  readonly appointmentId = input<string | null>(null);
  readonly dismissed = output<void>();
  readonly saved = output<void>();

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    symptoms: ['', [Validators.required, Validators.maxLength(8000)]],
    diagnosis: ['', [Validators.required, Validators.maxLength(8000)]],
    prescription: [''],
    weight: this.fb.control<number | null>(null),
    scheduleReturn: [false],
    returnDate: [''],
    /** Valor em máscara BRL (só quando há appointmentId). */
    amountDisplay: [''],
    markPaid: [false]
  });

  closeModal(): void {
    if (this.submitting()) return;
    this.form.reset({
      symptoms: '',
      diagnosis: '',
      prescription: '',
      weight: null,
      scheduleReturn: false,
      returnDate: '',
      amountDisplay: '',
      markPaid: false
    });
    this.syncReturnValidators();
    this.dismissed.emit();
  }

  /** Data mínima (hoje) para o campo de retorno — evita datas passadas acidentais. */
  minReturnDateStr(): string {
    return this.formatYmd(new Date());
  }

  onScheduleReturnChange(): void {
    const checked = this.form.controls.scheduleReturn.value;
    if (checked && !this.form.controls.returnDate.value?.trim()) {
      this.form.patchValue({ returnDate: this.defaultReturnDateStr() });
    }
    this.syncReturnValidators();
  }

  onAmountInput(event: Event): void {
    const raw = (event.target as HTMLInputElement | null)?.value ?? '';
    this.form.controls.amountDisplay.setValue(maskBRLFromDigitCents(raw), { emitEvent: false });
  }

  private syncReturnValidators(): void {
    const ctrl = this.form.controls.returnDate;
    if (this.form.controls.scheduleReturn.value) {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private defaultReturnDateStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return this.formatYmd(d);
  }

  private formatYmd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** Converte yyyy-mm-dd para ISO UTC (09:00 horário local). */
  private dateYmdToIso(dateYmd: string): string | null {
    const parts = dateYmd.trim().split('-');
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
    const dt = new Date(y, m - 1, day, 9, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }

  private extractAppointmentMessage(err: unknown): string {
    const fallback = 'Prontuário salvo, mas o retorno não pôde ser agendado. Tente pela agenda.';
    if (!(err instanceof HttpErrorResponse)) return fallback;
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const msg = (body as { message: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) {
        return `Prontuário salvo. Não foi possível agendar o retorno: ${msg.trim()}`;
      }
    }
    return fallback;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.closeModal();
  }

  showFieldError(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  private extractApiMessage(err: unknown): string {
    const fallback = 'Não foi possível registrar o atendimento.';
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
    this.syncReturnValidators();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      if (this.form.controls.scheduleReturn.value && this.form.controls.returnDate.invalid) {
        this.notifications.warning('Informe a data do retorno.');
      } else {
        this.notifications.warning('Preencha sintomas e diagnóstico.');
      }
      return;
    }

    const v = this.form.getRawValue();
    let w: number | null = null;
    if (v.weight != null && v.weight !== ('' as unknown)) {
      const n = Number(v.weight);
      if (Number.isFinite(n)) {
        if (n < 0.01 || n > 999.99) {
          this.notifications.warning('Peso deve estar entre 0,01 e 999,99 kg.');
          return;
        }
        w = n;
      }
    }
    const scheduleReturn = v.scheduleReturn;
    const returnDateRaw = (v.returnDate ?? '').trim();
    if (scheduleReturn) {
      if (!returnDateRaw) {
        this.notifications.warning('Informe a data do retorno.');
        return;
      }
      if (!this.dateYmdToIso(returnDateRaw)) {
        this.notifications.warning('Data de retorno inválida.');
        return;
      }
    }

    this.submitting.set(true);
    const petId = this.petId();
    const linkedAppointmentId = this.appointmentId()?.trim() || null;
    const returnIso = returnDateRaw ? this.dateYmdToIso(returnDateRaw)! : '';
    const amountCents = linkedAppointmentId
      ? parseBRLInputToCents(v.amountDisplay ?? '')
      : null;
    const markPaid = !!(linkedAppointmentId && v.markPaid);
    if (markPaid && (amountCents == null || amountCents <= 0)) {
      this.submitting.set(false);
      this.notifications.warning('Informe o valor para marcar como pago.');
      return;
    }

    this.medicalRecordService
      .create({
        petId,
        appointmentId: linkedAppointmentId,
        symptoms: v.symptoms.trim(),
        diagnosis: v.diagnosis.trim(),
        prescription: v.prescription?.trim() ? v.prescription.trim() : null,
        weight: w
      })
      .pipe(
        switchMap(() => {
          if (!linkedAppointmentId || (amountCents == null && !markPaid)) {
            return of({ paymentOk: true as const });
          }
          return this.appointmentService
            .updatePayment(linkedAppointmentId, {
              ...(amountCents != null ? { amountCents } : {}),
              ...(markPaid ? { paymentStatus: 'PAID' as const } : {})
            })
            .pipe(
              map(() => ({ paymentOk: true as const })),
              catchError(() => of({ paymentOk: false as const }))
            );
        }),
        switchMap((payment) => {
          if (!scheduleReturn) {
            return of({
              outcome: 'record' as const,
              completedAppointment: !!linkedAppointmentId,
              paymentOk: payment.paymentOk
            });
          }
          return this.appointmentService
            .create({
              petId,
              date: returnIso,
              type: 'CONSULTATION',
              status: 'SCHEDULED'
            })
            .pipe(
              map(() => ({
                outcome: 'both' as const,
                completedAppointment: !!linkedAppointmentId,
                paymentOk: payment.paymentOk
              })),
              catchError((err: unknown) =>
                of({
                  outcome: 'partial' as const,
                  appointmentError: err,
                  completedAppointment: !!linkedAppointmentId,
                  paymentOk: payment.paymentOk
                })
              )
            );
        })
      )
      .subscribe({
        next: (r) => {
          this.submitting.set(false);
          if (r.outcome === 'both') {
            this.notifications.success(
              r.completedAppointment
                ? 'Consulta concluída, prontuário salvo e retorno agendado.'
                : 'Prontuário salvo e retorno agendado com sucesso!'
            );
          } else if (r.outcome === 'record') {
            this.notifications.success(
              r.completedAppointment
                ? 'Consulta concluída e registrada no prontuário.'
                : 'Atendimento registrado no prontuário.'
            );
          } else {
            const base = this.extractAppointmentMessage(r.appointmentError);
            this.notifications.warning(
              r.completedAppointment
                ? `Consulta concluída. ${base}`
                : base
            );
          }
          if (!r.paymentOk) {
            this.notifications.warning(
              'Consulta salva, mas o valor/pagamento não pôde ser atualizado. Ajuste na agenda.'
            );
          }
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
