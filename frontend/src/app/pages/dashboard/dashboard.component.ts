import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { DashboardMetricsResponse } from '../../core/services/dashboard.service';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { ThemeService } from '../../shared/theme/theme.service';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { AppointmentCreateModalComponent } from '../../features/appointments/appointment-create-modal.component';

type DashboardCardView = {
  label: string;
  icon: string;
  value: number | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgClass,
    LucideAngularModule,
    ShellMenuButtonComponent,
    AppointmentCreateModalComponent,
    LoadErrorComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly theme = inject(ThemeService);
  readonly brand = inject(ClinicBrandingService);

  readonly isDark = computed(() => this.theme.mode() === 'dark');

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
      }
    ];
  });

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.metricsLoading.set(true);
    this.loadError.set(false);
    this.dashboardService.getMetrics().subscribe({
      next: (m) => {
        this.dashboardData.set(m);
        this.metricsLoading.set(false);
      },
      error: () => {
        this.metricsLoading.set(false);
        this.loadError.set(true);
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

  toggleTheme(): void {
    this.theme.toggle();
  }
}
