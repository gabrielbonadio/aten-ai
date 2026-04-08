import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { SidebarComponent } from '../../components/ui/sidebar/sidebar.component';
import type { Pet } from '../../core/models/pet.model';
import { APP_SIDEBAR_NAV } from '../../core/navigation/app-sidebar.nav';
import { PetService } from '../../core/services/pet.service';
import { ThemeService } from '../../shared/theme/theme.service';
import { PetCreateModalComponent } from './pet-create-modal.component';

@Component({
  selector: 'app-pet-list',
  standalone: true,
  imports: [NgClass, LucideAngularModule, SidebarComponent, PetCreateModalComponent],
  templateUrl: './pet-list.component.html'
})
export class PetListComponent implements OnInit {
  private readonly petService = inject(PetService);
  readonly theme = inject(ThemeService);

  readonly sidebarCollapsed = signal(false);
  readonly navItems = APP_SIDEBAR_NAV;

  readonly clinicName = signal('Clínica Vet');
  readonly planLabel = signal('Clínica Vet v1.0');

  readonly isDark = computed(() => this.theme.mode() === 'dark');
  readonly pets = signal<Pet[]>([]);
  readonly loading = signal(true);
  readonly petModalOpen = signal(false);

  ngOnInit(): void {
    this.loadPets();
  }

  private loadPets(): void {
    this.loading.set(true);
    this.petService.findAll().subscribe((list) => {
      this.pets.set(list);
      this.loading.set(false);
    });
  }

  openPetModal(): void {
    this.petModalOpen.set(true);
  }

  onPetModalDismissed(): void {
    this.petModalOpen.set(false);
  }

  onPetCreated(): void {
    this.loadPets();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
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

  editPet(pet: Pet): void {
    void pet;
  }

  deletePet(pet: Pet): void {
    void pet;
  }
}
