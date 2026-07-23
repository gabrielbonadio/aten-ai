import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { Appointment } from '../../core/models/appointment.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { ThemeService } from '../../shared/theme/theme.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { AppointmentCreateModalComponent } from './appointment-create-modal.component';

type AgendaRowView = Appointment & {
  timeLabel: string;
  petName: string;
  tutorName: string;
  typeLabel: string;
  statusLabel: string;
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    NgClass,
    DatePipe,
    LucideAngularModule,
    ShellMenuButtonComponent,
    AppointmentCreateModalComponent
  ],
  templateUrl: './agenda.component.html'
})
export class AgendaComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly notifications = inject(NotificationService);
  readonly theme = inject(ThemeService);
  readonly brand = inject(ClinicBrandingService);

  readonly isDark = computed(() => this.theme.mode() === 'dark');

  readonly loading = signal(true);
  readonly appointments = signal<Appointment[]>([]);
  readonly createModalOpen = signal(false);
  readonly editingAppointment = signal<Appointment | null>(null);
  readonly appointmentToDelete = signal<string | null>(null);

  @ViewChild(AppointmentCreateModalComponent)
  private readonly appointmentModal?: AppointmentCreateModalComponent;

  readonly upcomingAppointments = computed<AgendaRowView[]>(() => {
    const list = this.appointments();

    return list
      .sort((a, b) => {
        const da = this.parseDate(this.whenOf(a))?.getTime() ?? 0;
        const db = this.parseDate(this.whenOf(b))?.getTime() ?? 0;
        return da - db;
      })
      .map((a) => {
        const dt = this.parseDate(this.whenOf(a));
        const timeLabel = dt ? this.hhmm(dt) : '—';
        const petName = a.pet?.name?.trim() || '—';
        const tutorName = a.pet?.tutor?.name?.trim() || a.tutor?.name?.trim() || '—';
        const typeLabel = this.typeLabelFor(typeof a.type === 'string' ? a.type : '');
        const statusLabel = this.statusLabelFor((a.status as string | null | undefined)?.trim() || '');
        return { ...a, timeLabel, petName, tutorName, typeLabel, statusLabel };
      });
  });

  readonly groupedUpcoming = computed(() => {
    const groups = new Map<string, AgendaRowView[]>();
    for (const a of this.upcomingAppointments()) {
      const dt = this.parseDate(this.whenOf(a));
      const key = dt ? this.dateKey(dt) : 'Sem data';
      const bucket = groups.get(key) ?? [];
      bucket.push(a);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      title: key === 'Sem data' ? key : this.prettyDateTitle(key),
      items
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.appointmentService.findAll().subscribe((list) => {
      this.appointments.set(Array.isArray(list) ? list : []);
      this.loading.set(false);
    });
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

  toggleTheme(): void {
    this.theme.toggle();
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
    // fallback
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
    if (!id) return;
    this.appointmentService.remove(id).subscribe({
      next: () => {
        this.notifications.success('Agendamento cancelado');
        this.load();
        this.appointmentToDelete.set(null);
      },
      error: () => {
        this.notifications.error('Não foi possível cancelar o agendamento.');
      }
    });
  }

  private parseDate(input: string): Date | null {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private whenOf(a: Appointment): string {
    // Compatibilidade: alguns backends usam `date`; outros `scheduledAt`
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
    // key: YYYY-MM-DD
    const dt = new Date(`${key}T12:00:00.000Z`);
    const s = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    }).format(dt);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

}

