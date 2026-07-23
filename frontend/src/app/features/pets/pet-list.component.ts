import { NgClass } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { Pet } from '../../core/models/pet.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { PetService } from '../../core/services/pet.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ThemeService } from '../../shared/theme/theme.service';
import { PetCreateModalComponent } from './pet-create-modal.component';

@Component({
  selector: 'app-pet-list',
  standalone: true,
  imports: [NgClass, LucideAngularModule, ShellMenuButtonComponent, PetCreateModalComponent],
  templateUrl: './pet-list.component.html'
})
export class PetListComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  readonly theme = inject(ThemeService);
  readonly brand = inject(ClinicBrandingService);

  readonly isDark = computed(() => this.theme.mode() === 'dark');
  readonly pets = signal<Pet[]>([]);
  readonly loading = signal(true);
  readonly petModalOpen = signal(false);

  readonly editingPetId = signal<string | null>(null);
  readonly editingPet = signal<Pet | null>(null);

  readonly petToDelete = signal<{ id: string; name: string } | null>(null);

  @ViewChild(PetCreateModalComponent)
  private readonly petModal?: PetCreateModalComponent;

  ngOnInit(): void {
    this.loadPets();
  }

  private loadPets(): void {
    this.loading.set(true);
    // Garante refresh real mesmo com cache no service.
    this.petService.invalidateCache();
    this.petService.findAll().subscribe((list) => {
      this.pets.set(list);
      this.loading.set(false);
    });
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

  toggleTheme(): void {
    this.theme.toggle();
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
    this.petToDelete.set({ id: pet.id, name: pet.name ?? '—' });
  }

  cancelDeletePet(): void {
    this.petToDelete.set(null);
  }

  confirmDeletePet(): void {
    const d = this.petToDelete();
    if (!d?.id) return;
    this.petService.remove(d.id).subscribe({
      next: () => {
        this.notifications.success('Pet excluído com sucesso.');
        this.petToDelete.set(null);
        this.loadPets();
      },
      error: () => {
        this.notifications.error('Não foi possível excluir o pet.');
      }
    });
  }
}
