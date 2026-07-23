import { Injectable, signal } from '@angular/core';

export type NotificationVariant = 'success' | 'error' | 'warning';

export interface NotificationItem {
  id: number;
  message: string;
  variant: NotificationVariant;
}

const MAX_VISIBLE = 3;

/**
 * Serviço global de notificações (toasts) com fila curta.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly items = signal<NotificationItem[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** @deprecated Preferir `items`; mantido para compat. */
  readonly state = signal<{ message: string; variant: NotificationVariant } | null>(null);

  success(message: string, durationMs = 4200): void {
    this.enqueue({ message, variant: 'success' }, durationMs);
  }

  error(message: string, durationMs = 5200): void {
    this.enqueue({ message, variant: 'error' }, durationMs);
  }

  warning(message: string, durationMs = 4800): void {
    this.enqueue({ message, variant: 'warning' }, durationMs);
  }

  dismiss(id?: number): void {
    if (id === undefined) {
      for (const timer of this.timers.values()) clearTimeout(timer);
      this.timers.clear();
      this.items.set([]);
      this.state.set(null);
      return;
    }
    this.clearTimer(id);
    this.items.update((list) => list.filter((t) => t.id !== id));
    this.syncLegacyState();
  }

  private enqueue(
    payload: { message: string; variant: NotificationVariant },
    durationMs: number
  ): void {
    const id = this.nextId++;
    const item: NotificationItem = { id, ...payload };

    this.items.update((list) => {
      const next = [...list, item];
      if (next.length <= MAX_VISIBLE) return next;
      const dropped = next.slice(0, next.length - MAX_VISIBLE);
      for (const d of dropped) this.clearTimer(d.id);
      return next.slice(-MAX_VISIBLE);
    });

    this.syncLegacyState();
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), durationMs)
    );
  }

  private clearTimer(id: number): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
  }

  private syncLegacyState(): void {
    const last = this.items().at(-1) ?? null;
    this.state.set(last ? { message: last.message, variant: last.variant } : null);
  }
}
