import { Injectable, signal } from '@angular/core';

export type NotificationVariant = 'success' | 'error' | 'warning';

export interface NotificationState {
  message: string;
  variant: NotificationVariant;
}

/**
 * Serviço global de notificações (toasts). Usado com {@link ToastComponent}.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly state = signal<NotificationState | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  success(message: string, durationMs = 4200): void {
    this.show({ message, variant: 'success' }, durationMs);
  }

  error(message: string, durationMs = 5200): void {
    this.show({ message, variant: 'error' }, durationMs);
  }

  warning(message: string, durationMs = 4800): void {
    this.show({ message, variant: 'warning' }, durationMs);
  }

  private show(payload: NotificationState, durationMs: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.set(payload);
    this.timer = setTimeout(() => {
      this.state.set(null);
      this.timer = null;
    }, durationMs);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.set(null);
  }
}
