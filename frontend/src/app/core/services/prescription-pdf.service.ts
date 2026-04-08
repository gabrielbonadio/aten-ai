import { Injectable, inject } from '@angular/core';
import { forkJoin, map, type Observable } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MedicalRecord } from '../models/medical-record.model';
import type { Pet } from '../models/pet.model';
import type { TenantSettings } from '../models/tenant-settings.model';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

@Injectable({ providedIn: 'root' })
export class PrescriptionPdfService {
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);

  /** Carrega configurações da clínica e o usuário logado, monta o PDF e dispara o download. */
  generate(pet: Pet, record: MedicalRecord): Observable<void> {
    return forkJoin({
      settings: this.settings.get(),
      me: this.auth.getMe()
    }).pipe(
      map(({ settings, me }) => {
        this.renderAndSave(pet, record, settings, me.user.name);
      })
    );
  }

  private renderAndSave(
    pet: Pet,
    record: MedicalRecord,
    clinic: TenantSettings,
    loggedVetName: string
  ): void {
    const margin = 18;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as DocWithTable;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const rightX = pageW - margin;
    let y = margin;

    const clinicName = clinic.name?.trim() || 'Clínica';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(clinicName, rightX, y, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const pushRight = (text: string): void => {
      doc.text(text, rightX, y, { align: 'right' });
      y += 4.5;
    };
    const docStr = clinic.document?.trim();
    if (docStr) pushRight(`CNPJ: ${docStr}`);
    const addr = clinic.address?.trim();
    if (addr) {
      const addrLines = doc.splitTextToSize(addr, pageW - margin * 2);
      for (const line of addrLines) {
        pushRight(line);
      }
    }
    const phone = clinic.phone?.trim();
    if (phone) pushRight(`Tel. ${phone}`);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('RECEITUÁRIO VETERINÁRIO', pageW / 2, y, { align: 'center' });
    y += 10;

    const tutorName = pet.tutor?.name?.trim() || '—';
    const petName = pet.name?.trim() || '—';
    const species = pet.species?.trim() || '—';
    const attendedAt = this.formatDateTime(record.createdAt);

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Nome do pet', petName],
        ['Espécie', species],
        ['Nome do tutor', tutorName],
        ['Data do atendimento', attendedAt]
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 52 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable?.finalY ?? y + 28;
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Prescrição', margin, y);
    y += 7;

    const prescription = (record.prescription ?? '').trim() || '—';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    const maxW = pageW - margin * 2;
    const lines = doc.splitTextToSize(prescription, maxW);
    const lineH = 6.2;
    let curY = y;
    for (const line of lines) {
      if (curY > pageH - 38) {
        doc.addPage();
        curY = margin;
      }
      doc.text(line, margin, curY);
      curY += lineH;
    }

    const signatureBlockH = 22;
    if (curY + signatureBlockH > pageH - margin) {
      doc.addPage();
      curY = margin;
    }
    const lineY = curY + 12;
    doc.setDrawColor(55);
    doc.setLineWidth(0.35);
    doc.line(margin, lineY, pageW - margin, lineY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(loggedVetName.trim() || '—', pageW / 2, lineY + 6.5, { align: 'center' });

    const safePet = petName.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'pet';
    const safeDate = (record.createdAt ?? 'doc').replace(/[:.T]/g, '-').slice(0, 16);
    doc.save(`receituario-${safePet}-${safeDate}.pdf`);
  }

  private formatDateTime(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
