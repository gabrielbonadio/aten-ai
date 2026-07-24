import { Component, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { PaginationMeta } from '../../core/models/pagination.model';
import { UI_PAGE_SIZE } from '../../core/models/pagination.model';
import type { Tutor } from '../../core/models/tutor.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { TutorService } from '../../core/services/tutor.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { PaginationControlsComponent } from '../../shared/ui/pagination-controls.component';
import { TutorCreateModalComponent } from './tutor-create-modal.component';

@Component({
  selector: 'app-tutors',
  standalone: true,
  imports: [
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent,
    TutorCreateModalComponent,
    LoadErrorComponent,
    ConfirmDialogComponent,
    PaginationControlsComponent
  ],
  templateUrl: './tutors.component.html'
})
export class TutorsComponent implements OnInit, OnDestroy {
  private readonly tutorService = inject(TutorService);
  private readonly notifications = inject(NotificationService);
  readonly brand = inject(ClinicBrandingService);

  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  readonly tutors = signal<Tutor[]>([]);
  readonly pageMeta = signal<PaginationMeta | null>(null);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly searchQuery = signal('');
  readonly tutorModalOpen = signal(false);
  readonly editingTutor = signal<Tutor | null>(null);
  readonly tutorToDelete = signal<{ id: string; name: string } | null>(null);
  readonly deleting = signal(false);

  /** Alias para o template (lista já vem filtrada do servidor). */
  readonly filteredTutors = this.tutors;

  @ViewChild(TutorCreateModalComponent)
  private readonly tutorModal?: TutorCreateModalComponent;

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => {
        this.searchQuery.set(q);
        this.page.set(1);
        this.loadTutors();
      });

    this.loadTutors();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTutors(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.tutorService.invalidateCache();
    this.tutorService.findPage(this.page(), UI_PAGE_SIZE, this.searchQuery()).subscribe({
      next: (res) => {
        this.tutors.set(res.data);
        this.pageMeta.set(res.meta);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }

  onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadTutors();
  }

  onSearchInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.searchInput$.next(v);
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
}
