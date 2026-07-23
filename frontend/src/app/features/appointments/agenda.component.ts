import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { Appointment } from '../../core/models/appointment.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { AppointmentCreateModalComponent } from './appointment-create-modal.component';

type AgendaRowView = Appointment & {
  timeLabel: string;
  petName: string;
  tutorName: string;
  typeLabel: string;
  statusLabel: string;
  sortMs: number;
};

type FilterMode = 'month' | 'range';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    NgClass,
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent,
    AppointmentCreateModalComponent,
    LoadErrorComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './agenda.component.html'
})
export class AgendaComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly notifications = inject(NotificationService);
  readonly brand = inject(ClinicBrandingService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly appointments = signal<Appointment[]>([]);
  readonly createModalOpen = signal(false);
  readonly editingAppointment = signal<Appointment | null>(null);
  readonly appointmentToDelete = signal<string | null>(null);
  readonly deleting = signal(false);

  /** Filtro: mês inteiro (padrão) ou intervalo de datas. */
  readonly filterMode = signal<FilterMode>('month');
  readonly monthValue = signal(this.currentMonthValue());
  readonly rangeFrom = signal('');
  readonly rangeTo = signal('');

  @ViewChild(AppointmentCreateModalComponent)
  private readonly appointmentModal?: AppointmentCreateModalComponent;

  readonly filteredAppointments = computed<AgendaRowView[]>(() => {
    const list = this.appointments();
    const mode = this.filterMode();
    const month = this.monthValue();
    const from = this.rangeFrom();
    const to = this.rangeTo();

    return list
      .map((a) => {
        const dt = this.parseDate(this.whenOf(a));
        return {
          appointment: a,
          dt,
          sortMs: dt?.getTime() ?? 0,
          timeLabel: dt ? this.hhmm(dt) : '—',
          petName: a.pet?.name?.trim() || '—',
          tutorName: a.pet?.tutor?.name?.trim() || a.tutor?.name?.trim() || '—',
          typeLabel: this.typeLabelFor(typeof a.type === 'string' ? a.type : ''),
          statusLabel: this.statusLabelFor((a.status as string | null | undefined)?.trim() || '')
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
          typeLabel: row.typeLabel,
          statusLabel: row.statusLabel,
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
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.appointmentService.findAll().subscribe({
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

  private statusLabelFor(apiStatus: string): string {
    const s = apiStatus.trim().toUpperCase();
    if (s === 'SCHEDULED' || s === 'AGENDADO') return 'Agendado';
    if (s === 'COMPLETED' || s === 'CONCLUIDO' || s === 'CONCLUÍDO') return 'Concluído';
    if (s === 'CANCELED' || s === 'CANCELADO' || s === 'CANCELLED') return 'Cancelado';
    return apiStatus?.trim() || 'Agendado';
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
