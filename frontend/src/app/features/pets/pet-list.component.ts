import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { PaginationMeta } from '../../core/models/pagination.model';
import { UI_PAGE_SIZE } from '../../core/models/pagination.model';
import type { Pet } from '../../core/models/pet.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { AuthService } from '../../core/services/auth.service';
import { PetService } from '../../core/services/pet.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog.component';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';
import { PaginationControlsComponent } from '../../shared/ui/pagination-controls.component';
import { PetCreateModalComponent } from './pet-create-modal.component';

@Component({
  selector: 'app-pet-list',
  standalone: true,
  imports: [
    NgClass,
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent,
    PetCreateModalComponent,
    LoadErrorComponent,
    ConfirmDialogComponent,
    PaginationControlsComponent
  ],
  templateUrl: './pet-list.component.html'
})
export class PetListComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  readonly brand = inject(ClinicBrandingService);

  readonly isAdmin = this.auth.isAdmin();
  readonly pets = signal<Pet[]>([]);
  readonly pageMeta = signal<PaginationMeta | null>(null);
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly petModalOpen = signal(false);
  readonly deleting = signal(false);

  readonly editingPetId = signal<string | null>(null);
  readonly editingPet = signal<Pet | null>(null);

  readonly petToDelete = signal<{ id: string; name: string } | null>(null);

  @ViewChild(PetCreateModalComponent)
  private readonly petModal?: PetCreateModalComponent;

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.petService.invalidateCache();
    this.petService.findPage(this.page(), UI_PAGE_SIZE).subscribe({
      next: (res) => {
        this.pets.set(res.data);
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
    this.loadPets();
  }

  openPetModal(): void {
    this.editingPetId.set(null);
    this.editingPet.set(null);
    this.petModalOpen.set(true);
    this.petModal?.openForCreate();
  }

  onPetModalDismissed(): void {
    this.petModalOpen.set(false);
    this.editingPetId.set(null);
    this.editingPet.set(null);
  }

  onPetCreated(): void {
    this.petModalOpen.set(false);
    this.editingPetId.set(null);
    this.editingPet.set(null);
    this.loadPets();
  }

  speciesBreed(pet: Pet): string {
    const s = pet.species?.trim() || '—';
    const b = pet.breed?.trim() || '—';
    return `${s} · ${b}`;
  }

  formatWeight(pet: Pet): string {
    const w = pet.weight;
    if (w === null || w === undefined || w === '') return '—';
    const num = typeof w === 'string' ? parseFloat(w) : w;
    if (Number.isNaN(num)) return String(w);
    return `${num} kg`;
  }

  tutorName(pet: Pet): string {
    return pet.tutor?.name?.trim() || '—';
  }

  viewProfile(pet: Pet): void {
    void this.router.navigate(['/pets', pet.id]);
  }

  editPet(pet: Pet): void {
    this.editingPetId.set(pet.id);
    this.editingPet.set(pet);
    this.petModalOpen.set(true);
    this.petModal?.openForEdit(pet);
  }

  deletePet(pet: Pet): void {
    if (!this.isAdmin) return;
    this.petToDelete.set({ id: pet.id, name: pet.name ?? '—' });
  }

  cancelDeletePet(): void {
    this.petToDelete.set(null);
  }

  confirmDeletePet(): void {
    const d = this.petToDelete();
    if (!d?.id || this.deleting() || !this.isAdmin) return;
    this.deleting.set(true);
    this.petService.remove(d.id).subscribe({
      next: () => {
        this.notifications.success('Pet excluído com sucesso.');
        this.deleting.set(false);
        this.petToDelete.set(null);
        this.loadPets();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 403) return;
        this.notifications.error('Não foi possível excluir o pet.');
      }
    });
  }
}
