import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { Tutor } from '../../core/models/tutor.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { TutorService } from '../../core/services/tutor.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ThemeService } from '../../shared/theme/theme.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { TutorCreateModalComponent } from './tutor-create-modal.component';

@Component({
  selector: 'app-tutors',
  standalone: true,
  imports: [
    LucideAngularModule,
    ShellMenuButtonComponent,
    TutorCreateModalComponent,
    LoadErrorComponent,
    ConfirmDialogComponent
  ],
  templateUrl: './tutors.component.html'
})
export class TutorsComponent implements OnInit {
  private readonly tutorService = inject(TutorService);
  private readonly notifications = inject(NotificationService);
  readonly theme = inject(ThemeService);
  readonly brand = inject(ClinicBrandingService);

  readonly isDark = computed(() => this.theme.mode() === 'dark');
  readonly tutors = signal<Tutor[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly searchQuery = signal('');
  readonly tutorModalOpen = signal(false);
  readonly editingTutor = signal<Tutor | null>(null);
  readonly tutorToDelete = signal<{ id: string; name: string } | null>(null);
  readonly deleting = signal(false);

  readonly filteredTutors = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.tutors();
    if (!q) return list;
    return list.filter((t) => {
      const name = (t.name ?? '').toLowerCase();
      const email = (t.email ?? '').toLowerCase();
      const phone = (t.phone ?? '').toLowerCase().replace(/\s/g, '');
      const addr = (t.address ?? '').toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      const phoneDigits = phone.replace(/\D/g, '');
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        (qDigits.length > 0 && phoneDigits.includes(qDigits)) ||
        addr.includes(q)
      );
    });
  });

  @ViewChild(TutorCreateModalComponent)
  private readonly tutorModal?: TutorCreateModalComponent;

  ngOnInit(): void {
    this.loadTutors();
  }

  loadTutors(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.tutorService.invalidateCache();
    this.tutorService.findAll().subscribe({
      next: (list) => {
        this.tutors.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }

  onSearchInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.searchQuery.set(v);
  }

  openTutorModal(): void {
    this.editingTutor.set(null);
    this.tutorModalOpen.set(true);
    this.tutorModal?.openForCreate();
  }

  onTutorModalDismissed(): void {
    this.tutorModalOpen.set(false);
    this.editingTutor.set(null);
  }

  onTutorSaved(): void {
    this.tutorModalOpen.set(false);
    this.editingTutor.set(null);
    this.loadTutors();
  }

  editTutor(tutor: Tutor): void {
    this.editingTutor.set(tutor);
    this.tutorModalOpen.set(true);
    this.tutorModal?.openForEdit(tutor);
  }

  askDeleteTutor(tutor: Tutor): void {
    this.tutorToDelete.set({ id: tutor.id, name: tutor.name ?? '—' });
  }

  cancelDeleteTutor(): void {
    this.tutorToDelete.set(null);
  }

  confirmDeleteTutor(): void {
    const d = this.tutorToDelete();
    if (!d?.id || this.deleting()) return;
    this.deleting.set(true);
    this.tutorService.remove(d.id).subscribe({
      next: () => {
        this.notifications.success('Tutor excluído com sucesso.');
        this.deleting.set(false);
        this.tutorToDelete.set(null);
        this.loadTutors();
      },
      error: () => {
        this.deleting.set(false);
        this.notifications.error('Não foi possível excluir o tutor.');
      }
    });
  }

  petCount(tutor: Tutor): number {
    return tutor.pets?.length ?? 0;
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
