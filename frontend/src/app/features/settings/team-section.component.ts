import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import type { TeamMember, TeamMemberRole } from '../../core/models/team-member.model';
import { TeamService } from '../../core/services/team.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { LoadErrorComponent } from '../../shared/ui/load-error.component';

@Component({
  selector: 'app-team-section',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, LoadErrorComponent],
  templateUrl: './team-section.component.html'
})
export class TeamSectionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly team = inject(TeamService);
  private readonly notifications = inject(NotificationService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly inviting = signal(false);
  readonly members = signal<TeamMember[]>([]);

  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: this.fb.nonNullable.control<TeamMemberRole>('MEMBER')
  });

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.team.listMembers().subscribe({
      next: (list) => {
        this.members.set(Array.isArray(list) ? list : []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      }
    });
  }

  roleLabel(role: string | undefined): string {
    const r = (role ?? '').toUpperCase();
    if (r === 'ADMIN') return 'Administrador';
    if (r === 'MEMBER') return 'Membro';
    return role?.trim() || '—';
  }

  memberStatusLabel(m: TeamMember): string | null {
    if (m.active === false) return 'Convite pendente';
    const name = (m.name ?? '').trim();
    if (!name || name === '-' || /^convidado/i.test(name)) return 'Convite pendente';
    return null;
  }

  showInviteError(control: 'email' | 'role'): boolean {
    const c = this.inviteForm.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  submitInvite(): void {
    if (this.inviting()) return;
    this.inviteForm.markAllAsTouched();
    if (this.inviteForm.invalid) {
      this.notifications.warning('Informe um e-mail válido e o papel do convidado.');
      return;
    }

    const { email, role } = this.inviteForm.getRawValue();
    this.inviting.set(true);
    this.team.invite({ email, role }).subscribe({
      next: () => {
        this.inviting.set(false);
        this.inviteForm.reset({ email: '', role: 'MEMBER' });
        this.notifications.success('Convite enviado. O colega receberá um e-mail para definir a senha.');
        this.loadMembers();
      },
      error: (err: unknown) => {
        this.inviting.set(false);
        if (err instanceof HttpErrorResponse && err.status === 403) return;
        this.notifications.error(this.extractApiMessage(err));
      }
    });
  }

  private extractApiMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Não foi possível enviar o convite.';
    }
    if (err.status === 403) {
      return 'Apenas administradores podem convidar membros.';
    }
    if (err.status === 409) {
      return 'Este e-mail já faz parte da equipe ou já foi convidado.';
    }
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m.trim();
    }
    if (typeof body === 'string' && body.trim() && !/<(html|!doctype)/i.test(body)) {
      return body.trim();
    }
    return 'Não foi possível enviar o convite. Tente novamente.';
  }
}
