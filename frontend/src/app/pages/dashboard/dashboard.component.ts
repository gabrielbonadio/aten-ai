import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { AppointmentStatusCode } from '../../core/models/appointment.model';
import type { DashboardMetricsResponse } from '../../core/services/dashboard.service';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { formatCentsAsBRL } from '../../shared/utils/br-masks';
import { AppointmentCreateModalComponent } from '../../features/appointments/appointment-create-modal.component';

type DashboardCardView = {
  label: string;
  icon: string;
  /** Número puro (pets, etc.) ou null em loading. */
  value: number | null;
  /** Texto pronto (ex.: BRL); se setado, tem prioridade no template. */
  display?: string | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgClass,
    RouterLink,
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent,
    AppointmentCreateModalComponent,
    LoadErrorComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly auth = inject(AuthService);
  readonly brand = inject(ClinicBrandingService);

  readonly isAdmin = this.auth.isAdmin();
  readonly metricsLoading = signal(true);
  readonly loadError = signal(false);
  readonly dashboardData = signal<DashboardMetricsResponse | null>(null);

  readonly appointmentModalOpen = signal(false);

  @ViewChild(AppointmentCreateModalComponent)
  private readonly appointmentModal?: AppointmentCreateModalComponent;

  readonly todayAppointments = computed(() => {
    const data = this.dashboardData();
    const list = data?.todayAppointments;
    return Array.isArray(list) ? (list as any[]) : [];
  });

  /**
   * Receita do dia (S7).
   * Preferência: metrics.receivedTodayCents da API.
   * Fallback: soma client-side só dos itens em `todayAppointments` (lista limitada do
   * dashboard — pode subestimar se o BE truncar a lista e não enviar a métrica).
   */
  readonly receivedTodayLabel = computed(() => {
    if (this.metricsLoading()) return null;
    const data = this.dashboardData();
    const fromApi = data?.metrics?.receivedTodayCents;
    if (typeof fromApi === 'number' && Number.isFinite(fromApi)) {
      return formatCentsAsBRL(fromApi) || 'R$ 0,00';
    }
    let sum = 0;
    for (const a of this.todayAppointments()) {
      const status = String(a?.paymentStatus ?? '')
        .trim()
        .toUpperCase();
      const cents = Number(a?.amountCents);
      if ((status === 'PAID' || status === 'PAGO') && Number.isFinite(cents) && cents > 0) {
        sum += cents;
      }
    }
    return formatCentsAsBRL(sum) || 'R$ 0,00';
  });

  appointmentTimeLabel(a: any): string {
    const iso = typeof a?.date === 'string' ? a.date : typeof a?.scheduledAt === 'string' ? a.scheduledAt : '';
    const d = new Date(iso);
    if (!iso || Number.isNaN(d.getTime())) return '—';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  appointmentPetName(a: any): string {
    return a?.pet?.name?.trim?.() || '—';
  }

  appointmentTutorName(a: any): string {
    return a?.pet?.tutor?.name?.trim?.() || '—';
  }

  appointmentTypeLabel(a: any): string {
    const t = String(a?.type ?? '').trim().toUpperCase();
    if (t === 'CONSULTATION') return 'Consulta';
    if (t === 'VACCINE') return 'Vacina';
    if (t === 'SURGERY') return 'Cirurgia';
    if (t === 'OTHER') return 'Outro';
    return t || '—';
  }

  appointmentStatusLabel(a: any): string {
    const code = this.normalizeStatus(a?.status);
    if (code === 'COMPLETED') return 'Concluído';
    if (code === 'CANCELED') return 'Cancelado';
    return 'Agendado';
  }

  appointmentStatusPillClass(a: any): string {
    const code = this.normalizeStatus(a?.status);
    if (code === 'COMPLETED')
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
    if (code === 'CANCELED')
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300';
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200';
  }

  private normalizeStatus(apiStatus: unknown): AppointmentStatusCode {
    const s = String(apiStatus ?? '')
      .trim()
      .toUpperCase();
    if (s === 'COMPLETED' || s === 'CONCLUIDO' || s === 'CONCLUÍDO') return 'COMPLETED';
    if (s === 'CANCELED' || s === 'CANCELADO' || s === 'CANCELLED') return 'CANCELED';
    return 'SCHEDULED';
  }

  typePillClass(a: any): string {
    const t = String(a?.type ?? '').trim().toUpperCase();
    if (t === 'VACCINE') return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300';
    if (t === 'SURGERY') return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  readonly cards = computed<DashboardCardView[]>(() => {
    const loading = this.metricsLoading();
    const data = this.dashboardData();
    const m = data?.metrics;
    return [
      {
        label: 'Pets cadastrados',
        icon: 'paw-print',
        value: loading ? null : (m?.totalPets ?? 0)
      },
      {
        label: 'Tutores',
        icon: 'users',
        value: loading ? null : (m?.totalTutors ?? 0)
      },
      {
        label: 'Agendamentos hoje',
        icon: 'calendar',
        value: loading ? null : (m?.appointmentsTodayCount ?? 0)
      },
      {
        label: 'Recebido hoje',
        icon: 'banknote',
        value: loading ? null : 0,
        display: loading ? null : this.receivedTodayLabel()
      }
    ];
  });

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.metricsLoading.set(false);
      return;
    }
    this.loadMetrics();
  }

  loadMetrics(): void {
    if (!this.isAdmin) return;
    this.metricsLoading.set(true);
    this.loadError.set(false);
    this.dashboardService.getMetrics().subscribe({
      next: (m) => {
        this.dashboardData.set(m);
        this.metricsLoading.set(false);
      },
      error: (err: unknown) => {
        this.metricsLoading.set(false);
        this.loadError.set(true);
        // 403: toast global no interceptor
        void err;
      }
    });
  }

  openAppointmentModal(): void {
    this.appointmentModalOpen.set(true);
    this.appointmentModal?.openForCreate();
  }

  onAppointmentModalDismissed(): void {
    this.appointmentModalOpen.set(false);
  }

  onAppointmentCreated(): void {
    this.loadMetrics();
  }
}
