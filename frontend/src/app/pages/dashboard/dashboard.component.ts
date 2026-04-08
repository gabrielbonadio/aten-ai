import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SidebarComponent } from '../../components/ui/sidebar/sidebar.component';
import { APP_SIDEBAR_NAV } from '../../core/navigation/app-sidebar.nav';
import { DashboardService } from '../../core/services/dashboard.service';
import { ThemeService } from '../../shared/theme/theme.service';
import { AppointmentCreateModalComponent } from '../../features/appointments/appointment-create-modal.component';

type StatCardView = {
  label: string;
  hint: string;
  icon: string;
  /** null = em carregamento (mostra skeleton) */
  value: number | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgClass, LucideAngularModule, SidebarComponent, AppointmentCreateModalComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly theme = inject(ThemeService);

  readonly sidebarCollapsed = signal(false);

  readonly navItems = APP_SIDEBAR_NAV;

  readonly clinicName = signal('Clínica Vet');
  readonly planLabel = signal('Clínica Vet v1.0');

  readonly isDark = computed(() => this.theme.mode() === 'dark');

  readonly metricsLoading = signal(true);
  readonly totalPets = signal(0);
  readonly totalTutors = signal(0);
  readonly appointmentsToday = signal(0);

  readonly appointmentModalOpen = signal(false);

  @ViewChild(AppointmentCreateModalComponent)
  private readonly appointmentModal?: AppointmentCreateModalComponent;

  readonly statCards = computed<StatCardView[]>(() => {
    const loading = this.metricsLoading();
    return [
      {
        label: 'Pets cadastrados',
        hint: 'Base do tenant',
        icon: 'dog',
        value: loading ? null : this.totalPets()
      },
      {
        label: 'Tutores',
        hint: 'Clientes ativos',
        icon: 'users',
        value: loading ? null : this.totalTutors()
      },
      {
        label: 'Agendamentos hoje',
        hint: 'Exceto cancelados',
        icon: 'calendar',
        value: loading ? null : this.appointmentsToday()
      }
    ];
  });

  ngOnInit(): void {
    this.dashboardService.getMetrics().subscribe((m) => {
      this.totalPets.set(m.totalPets);
      this.totalTutors.set(m.totalTutors);
      this.appointmentsToday.set(m.appointmentsToday);
      this.metricsLoading.set(false);
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
    this.dashboardService.getMetrics().subscribe((m) => {
      this.totalPets.set(m.totalPets);
      this.totalTutors.set(m.totalTutors);
      this.appointmentsToday.set(m.appointmentsToday);
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
