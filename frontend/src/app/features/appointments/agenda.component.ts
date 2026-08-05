import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type {
  Appointment,
  AppointmentAssigneeFilter,
  AppointmentConfirmationStatus,
  AppointmentStatusCode
} from '../../core/models/appointment.model';
import type { TeamMember } from '../../core/models/team-member.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from '../../core/services/team.service';
import {
  appointmentStatusLabel,
  confirmationStatusLabel,
  normalizeAppointmentStatus,
  normalizeConfirmationStatus
} from '../../core/utils/appointment-display.util';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { PetConsultModalComponent } from '../pets/pet-consult-modal.component';
import { AppointmentCreateModalComponent } from './appointment-create-modal.component';

type AgendaRowView = Appointment & {
  timeLabel: string;
  petName: string;
  tutorName: string;
  professionalName: string;
  typeLabel: string;
  statusLabel: string;
  statusCode: AppointmentStatusCode;
  confirmationCode: AppointmentConfirmationStatus | null;
  confirmationLabel: string | null;
  sortMs: number;
};

type FilterMode = 'month' | 'range';

/** all | me | uuid do profissional */
type ProfessionalFilter = 'all' | 'me' | string;

type StatusConfirmKind = 'cancel' | 'complete';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    NgClass,
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent,
    AppointmentCreateModalComponent,
    PetConsultModalComponent,
    LoadErrorComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './agenda.component.html'
})
export class AgendaComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly teamService = inject(TeamService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  readonly brand = inject(ClinicBrandingService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly appointments = signal<Appointment[]>([]);
  readonly createModalOpen = signal(false);
  readonly editingAppointment = signal<Appointment | null>(null);
  readonly appointmentToDelete = signal<string | null>(null);
  readonly deleting = signal(false);

  readonly statusUpdatingId = signal<string | null>(null);
  readonly statusConfirm = signal<{ id: string; kind: StatusConfirmKind } | null>(null);
  readonly statusConfirming = signal(false);

  readonly consultModalOpen = signal(false);
  readonly consultPetId = signal<string | null>(null);
  readonly consultAppointmentId = signal<string | null>(null);

  /** Filtro: mês inteiro (padrão) ou intervalo de datas. */
  readonly filterMode = signal<FilterMode>('month');
  readonly monthValue = signal(this.currentMonthValue());
  readonly rangeFrom = signal('');
  readonly rangeTo = signal('');

  readonly professionalFilter = signal<ProfessionalFilter>('all');
  readonly professionals = signal<TeamMember[]>([]);

  readonly currentUserId = this.auth.getStoredUser()?.id?.trim() || '';

  /** Profissionais para chips (exclui o próprio usuário — coberto por “Eu”). */
  readonly otherProfessionals = computed(() => {
    const me = this.currentUserId;
    return this.professionals().filter((p) => p.id !== me);
  });

  @ViewChild(AppointmentCreateModalComponent)
  private readonly appointmentModal?: AppointmentCreateModalComponent;

  readonly filteredAppointments = computed<AgendaRowView[]>(() => {
    const list = this.appointments();
    const mode = this.filterMode();
    const month = this.monthValue();
    const from = this.rangeFrom();
    const to = this.rangeTo();
    const proMap = new Map(this.professionals().map((p) => [p.id, p.name?.trim() || p.email]));

    return list
      .map((a) => {
        const dt = this.parseDate(this.whenOf(a));
        const statusCode = this.normalizeStatus(a.status);
        const confirmationCode = this.normalizeConfirmation(a.confirmationStatus);
        const assignedId = a.assignedUserId?.trim() || a.assignedUser?.id?.trim() || '';
        const professionalName =
          a.assignedUser?.name?.trim() ||
          (assignedId ? proMap.get(assignedId) : '') ||
          (assignedId ? 'Profissional' : '—');
        return {
          appointment: a,
          dt,
          sortMs: dt?.getTime() ?? 0,
          timeLabel: dt ? this.hhmm(dt) : '—',
          petName: a.pet?.name?.trim() || '—',
          tutorName: a.pet?.tutor?.name?.trim() || a.tutor?.name?.trim() || '—',
          professionalName,
          typeLabel: this.typeLabelFor(typeof a.type === 'string' ? a.type : ''),
          statusCode,
          statusLabel: this.statusLabelFor(statusCode),
          confirmationCode,
          confirmationLabel: this.confirmationLabelFor(confirmationCode)
        };
      })
      .filter((row) => {
        if (!row.dt) return false;
        if (mode === 'month') {
          if (!month || month.length < 7) return true;
          const [y, m] = month.split('-').map(Number);
          return row.dt.getFullYear() === y && row.dt.getMonth() + 1 === m;
        }
        const day = this.dateKey(row.dt);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      })
      .sort((a, b) => b.sortMs - a.sortMs)
      .map(
        (row): AgendaRowView => ({
          ...row.appointment,
          timeLabel: row.timeLabel,
          petName: row.petName,
          tutorName: row.tutorName,
          professionalName: row.professionalName,
          typeLabel: row.typeLabel,
          statusLabel: row.statusLabel,
          statusCode: row.statusCode,
          confirmationCode: row.confirmationCode,
          confirmationLabel: row.confirmationLabel,
          sortMs: row.sortMs
        })
      );
  });

  readonly groupedUpcoming = computed(() => {
    const groups = new Map<string, AgendaRowView[]>();
    for (const a of this.filteredAppointments()) {
      const dt = this.parseDate(this.whenOf(a));
      const key = dt ? this.dateKey(dt) : 'Sem data';
      const bucket = groups.get(key) ?? [];
      bucket.push(a);
      groups.set(key, bucket);
    }

    // Datas mais recentes primeiro (Map preserva ordem de inserção → já inserimos desc)
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      title: key === 'Sem data' ? key : this.prettyDateTitle(key),
      items
    }));
  });

  readonly hasAnyAppointments = computed(() => this.appointments().length > 0);
  readonly filterEmpty = computed(
    () => this.hasAnyAppointments() && this.filteredAppointments().length === 0
  );

  ngOnInit(): void {
    this.loadProfessionals();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    const pf = this.professionalFilter();
    const assignedUserId: AppointmentAssigneeFilter | null =
      pf === 'all' ? null : pf === 'me' ? 'me' : pf;
    this.appointmentService.findAll({ assignedUserId }).subscribe({
      next: (list) => {
        this.appointments.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }

  private loadProfessionals(): void {
    this.teamService.listProfessionals().subscribe({
      next: (list) => {
        const me = this.auth.getStoredUser();
        const byId = new Map((Array.isArray(list) ? list : []).map((m) => [m.id, m]));
        if (me?.id && !byId.has(me.id)) {
          byId.set(me.id, {
            id: me.id,
            name: me.name?.trim() || me.email,
            email: me.email,
            role: me.role
          });
        }
        this.professionals.set(
          Array.from(byId.values()).sort((a, b) =>
            (a.name || a.email).localeCompare(b.name || b.email, 'pt-BR')
          )
        );
      },
      error: () => {
        const me = this.auth.getStoredUser();
        this.professionals.set(
          me?.id
            ? [
                {
                  id: me.id,
                  name: me.name?.trim() || me.email,
                  email: me.email,
                  role: me.role
                }
              ]
            : []
        );
      }
    });
  }

  setProfessionalFilter(filter: ProfessionalFilter): void {
    if (this.professionalFilter() === filter) return;
    this.professionalFilter.set(filter);
    this.load();
  }

  isProfessionalFilter(filter: ProfessionalFilter): boolean {
    return this.professionalFilter() === filter;
  }

  setFilterMode(mode: FilterMode): void {
    this.filterMode.set(mode);
    if (mode === 'month' && !this.monthValue()) {
      this.monthValue.set(this.currentMonthValue());
    }
  }

  onMonthInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.monthValue.set(v);
  }

  onRangeFromInput(ev: Event): void {
    this.rangeFrom.set((ev.target as HTMLInputElement).value);
  }

  onRangeToInput(ev: Event): void {
    this.rangeTo.set((ev.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.filterMode.set('month');
    this.monthValue.set(this.currentMonthValue());
    this.rangeFrom.set('');
    this.rangeTo.set('');
    if (this.professionalFilter() !== 'all') {
      this.professionalFilter.set('all');
      this.load();
    }
  }

  openCreateModal(): void {
    this.editingAppointment.set(null);
    this.createModalOpen.set(true);
    this.appointmentModal?.openForCreate();
  }

  onCreateDismissed(): void {
    this.createModalOpen.set(false);
    this.editingAppointment.set(null);
  }

  onCreated(): void {
    this.load();
  }

  typePillClass(typeLabel: string): string {
    const t = typeLabel.trim().toLowerCase();
    if (t === 'vacina')
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300';
    if (t === 'cirurgia')
      return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  private typeLabelFor(apiType: string): string {
    const t = apiType.trim().toUpperCase();
    if (t === 'CONSULTATION' || t === 'CONSULTA') return 'Consulta';
    if (t === 'VACCINE' || t === 'VACINA') return 'Vacina';
    if (t === 'SURGERY' || t === 'CIRURGIA') return 'Cirurgia';
    if (t === 'OTHER' || t === 'OUTRO') return 'Outro';
    return apiType?.trim() || '—';
  }

  isConsultation(a: Appointment): boolean {
    const t = String(a.type ?? '')
      .trim()
      .toUpperCase();
    return t === 'CONSULTATION' || t === 'CONSULTA';
  }

  statusPillClass(statusLabel: string): string {
    const s = statusLabel.trim().toLowerCase();
    if (s === 'concluído' || s === 'concluido')
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
    if (s === 'agendado')
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200';
    if (s === 'cancelado')
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300';
    return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300';
  }

  normalizeStatus(apiStatus: string | null | undefined): AppointmentStatusCode {
    return normalizeAppointmentStatus(apiStatus);
  }

  private statusLabelFor(code: AppointmentStatusCode): string {
    return appointmentStatusLabel(code);
  }

  normalizeConfirmation(
    value: AppointmentConfirmationStatus | string | null | undefined
  ): AppointmentConfirmationStatus | null {
    return normalizeConfirmationStatus(value);
  }

  private confirmationLabelFor(code: AppointmentConfirmationStatus | null): string | null {
    return confirmationStatusLabel(code);
  }

  confirmationPillClass(code: AppointmentConfirmationStatus | null): string {
    if (code === 'CONFIRMED')
      return 'border-sky-200/80 bg-sky-50/80 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300';
    if (code === 'RESCHEDULED')
      return 'border-violet-200/80 bg-violet-50/70 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300';
    return 'border-zinc-200/80 bg-zinc-50/80 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400';
  }

  isStatusBusy(id: string): boolean {
    return this.statusUpdatingId() === id || this.statusConfirming();
  }

  requestComplete(a: AgendaRowView): void {
    if (this.isStatusBusy(a.id) || a.statusCode !== 'SCHEDULED') return;
    if (this.isConsultation(a)) {
      const petId = a.petId || a.pet?.id;
      if (!petId) {
        this.notifications.warning('Pet não encontrado para registrar o atendimento.');
        return;
      }
      this.consultPetId.set(petId);
      this.consultAppointmentId.set(a.id);
      this.consultModalOpen.set(true);
      return;
    }
    this.statusConfirm.set({ id: a.id, kind: 'complete' });
  }

  requestCancel(a: AgendaRowView): void {
    if (this.isStatusBusy(a.id) || a.statusCode !== 'SCHEDULED') return;
    this.statusConfirm.set({ id: a.id, kind: 'cancel' });
  }

  requestReopen(a: AgendaRowView): void {
    if (this.isStatusBusy(a.id)) return;
    if (a.statusCode !== 'CANCELED' && a.statusCode !== 'COMPLETED') return;
    this.applyStatus(a.id, 'SCHEDULED', 'Agendamento reaberto.');
  }

  cancelStatusConfirm(): void {
    if (this.statusConfirming()) return;
    this.statusConfirm.set(null);
  }

  confirmStatusAction(): void {
    const pending = this.statusConfirm();
    if (!pending || this.statusConfirming()) return;
    this.statusConfirming.set(true);
    const msg =
      pending.kind === 'cancel' ? 'Agendamento cancelado.' : 'Agendamento marcado como concluído.';
    const next: AppointmentStatusCode = pending.kind === 'cancel' ? 'CANCELED' : 'COMPLETED';
    this.appointmentService.updateStatus(pending.id, next).subscribe({
      next: () => {
        this.notifications.success(msg);
        this.statusConfirming.set(false);
        this.statusConfirm.set(null);
        this.load();
      },
      error: () => {
        this.statusConfirming.set(false);
        this.notifications.error('Não foi possível atualizar o status.');
      }
    });
  }

  private applyStatus(id: string, status: AppointmentStatusCode, successMsg: string): void {
    if (this.statusUpdatingId()) return;
    this.statusUpdatingId.set(id);
    this.appointmentService.updateStatus(id, status).subscribe({
      next: () => {
        this.notifications.success(successMsg);
        this.statusUpdatingId.set(null);
        this.load();
      },
      error: () => {
        this.statusUpdatingId.set(null);
        this.notifications.error('Não foi possível atualizar o status.');
      }
    });
  }

  onConsultDismissed(): void {
    this.consultModalOpen.set(false);
    this.consultPetId.set(null);
    this.consultAppointmentId.set(null);
  }

  onConsultSaved(): void {
    this.onConsultDismissed();
    this.load();
  }

  statusConfirmTitle(): string {
    const kind = this.statusConfirm()?.kind;
    return kind === 'cancel' ? 'Cancelar agendamento?' : 'Marcar como concluído?';
  }

  statusConfirmLabel(): string {
    const kind = this.statusConfirm()?.kind;
    return kind === 'cancel' ? 'Sim, cancelar' : 'Sim, concluir';
  }

  statusConfirmingLabel(): string {
    const kind = this.statusConfirm()?.kind;
    return kind === 'cancel' ? 'Cancelando…' : 'Concluindo…';
  }

  statusConfirmBody(): string {
    const kind = this.statusConfirm()?.kind;
    return kind === 'cancel'
      ? 'O agendamento ficará com status Cancelado. Você poderá reabri-lo depois.'
      : 'Confirme se o atendimento já foi realizado. Isso não registra prontuário.';
  }

  editAppointment(appointment: Appointment): void {
    this.editingAppointment.set(appointment);
    this.createModalOpen.set(true);
    this.appointmentModal?.openForEdit(appointment);
  }

  deleteAppointment(id: string): void {
    this.appointmentToDelete.set(id);
  }

  cancelDelete(): void {
    this.appointmentToDelete.set(null);
  }

  confirmDelete(): void {
    const id = this.appointmentToDelete();
    if (!id || this.deleting()) return;
    this.deleting.set(true);
    this.appointmentService.remove(id).subscribe({
      next: () => {
        this.notifications.success('Agendamento excluído');
        this.deleting.set(false);
        this.appointmentToDelete.set(null);
        this.load();
      },
      error: () => {
        this.deleting.set(false);
        this.notifications.error('Não foi possível excluir o agendamento.');
      }
    });
  }

  private currentMonthValue(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private parseDate(input: string): Date | null {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private whenOf(a: Appointment): string {
    const anyA = a as unknown as { date?: unknown; scheduledAt?: unknown };
    const d = anyA.date;
    if (typeof d === 'string' && d.trim()) return d;
    const s = anyA.scheduledAt;
    if (typeof s === 'string' && s.trim()) return s;
    return '';
  }

  private hhmm(d: Date): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private dateKey(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private prettyDateTitle(key: string): string {
    const dt = new Date(`${key}T12:00:00`);
    const s = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(dt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
