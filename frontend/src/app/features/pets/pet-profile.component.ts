import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import type { MedicalRecord } from '../../core/models/medical-record.model';
import type { Pet } from '../../core/models/pet.model';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { PrescriptionPdfService } from '../../core/services/prescription-pdf.service';
import { PetService } from '../../core/services/pet.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { PetConsultModalComponent } from './pet-consult-modal.component';
import { PetMedicalDetailModalComponent } from './pet-medical-detail-modal.component';
import { PetVaccinationsSectionComponent } from './pet-vaccinations-section.component';

type PetProfileView = Pet & { medicalRecords?: MedicalRecord[] };

@Component({
  selector: 'app-pet-profile',
  standalone: true,
  imports: [
    RouterLink,
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent,
    PetConsultModalComponent,
    PetMedicalDetailModalComponent,
    PetVaccinationsSectionComponent
  ],
  templateUrl: './pet-profile.component.html'
})
export class PetProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly petService = inject(PetService);
  private readonly prescriptionPdf = inject(PrescriptionPdfService);
  private readonly notify = inject(NotificationService);
  readonly brand = inject(ClinicBrandingService);

  readonly loading = signal(true);
  readonly pet = signal<PetProfileView | null>(null);
  readonly petId = signal<string | null>(null);

  readonly consultModalOpen = signal(false);
  readonly detailModalOpen = signal(false);
  readonly selectedRecord = signal<MedicalRecord | null>(null);

  readonly medicalRecordsSorted = computed(() => {
    const p = this.pet();
    const list = p?.medicalRecords;
    if (!Array.isArray(list) || list.length === 0) return [];
    return [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.pet.set(null);
      return;
    }
    this.petId.set(id);
    this.reloadPet();
  }

  reloadPet(): void {
    const id = this.petId();
    if (!id) return;
    this.loading.set(true);
    this.petService.findById(id).subscribe((p) => {
      this.pet.set(p as PetProfileView);
      this.loading.set(false);
    });
  }

  openConsultModal(): void {
    this.consultModalOpen.set(true);
  }

  onConsultDismissed(): void {
    this.consultModalOpen.set(false);
  }

  onConsultSaved(): void {
    this.reloadPet();
  }

  openDetail(record: MedicalRecord): void {
    this.selectedRecord.set(record);
    this.detailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.detailModalOpen.set(false);
    this.selectedRecord.set(null);
  }

  printPrescription(record: MedicalRecord): void {
    const p = this.pet();
    if (!p) return;
    this.prescriptionPdf.generate(p, record).subscribe({
      next: () => this.notify.success('Receituário gerado para download.'),
      error: () =>
        this.notify.error('Não foi possível gerar o PDF. Verifique a conexão e tente novamente.')
    });
  }

  recordDateLabel(m: MedicalRecord): string {
    const raw = m.createdAt;
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  vetName(m: MedicalRecord): string {
    return m.veterinarian?.name?.trim() || '—';
  }

  diagnosisPreview(m: MedicalRecord): string {
    const t = (m.diagnosis ?? '').trim();
    if (!t) return '—';
    if (t.length <= 140) return t;
    return `${t.slice(0, 140)}…`;
  }

  backToList(): void {
    void this.router.navigate(['/pets']);
  }

  subtitle(p: PetProfileView): string {
    const s = p.species?.trim() || '—';
    const b = p.breed?.trim() || '—';
    return `${s} · ${b}`;
  }

  birthLabel(p: PetProfileView): string | null {
    const raw = p.birthDate;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR');
  }

  ageLabel(p: PetProfileView): string | null {
    const raw = p.birthDate;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    if (years < 0) return null;
    if (years === 0) return 'Menos de 1 ano';
    return years === 1 ? '1 ano' : `${years} anos`;
  }

  whatsappLink(phone: string | null | undefined): string | null {
    const raw = (phone ?? '').toString();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    return `https://wa.me/${digits}`;
  }
}
