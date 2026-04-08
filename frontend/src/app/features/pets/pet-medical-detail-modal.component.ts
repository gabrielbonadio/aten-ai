import { Component, HostListener, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { MedicalRecord } from '../../core/models/medical-record.model';

@Component({
  selector: 'app-pet-medical-detail-modal',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './pet-medical-detail-modal.component.html'
})
export class PetMedicalDetailModalComponent {
  readonly open = input(false);
  readonly record = input<MedicalRecord | null>(null);
  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open()) return;
    this.close();
  }

  formatDate(m: MedicalRecord): string {
    const raw = m.createdAt;
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  vetName(m: MedicalRecord): string {
    return m.veterinarian?.name?.trim() || '—';
  }

  weightLabel(m: MedicalRecord): string {
    const w = m.weight;
    if (w === null || w === undefined || w === '') return '—';
    const n = typeof w === 'string' ? parseFloat(w) : w;
    if (!Number.isFinite(n)) return String(w);
    return `${n} kg`;
  }
}
