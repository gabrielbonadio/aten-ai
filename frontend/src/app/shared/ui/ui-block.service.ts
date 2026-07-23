import { Injectable, computed, signal } from '@angular/core';

/**
 * Bloqueio de UI global (overlay) para operações críticas:
 * login, logout, signup, etc.
 */
@Injectable({ providedIn: 'root' })
export class UiBlockService {
  private readonly depth = signal(0);
  private readonly messageSignal = signal('Carregando…');

  readonly active = computed(() => this.depth() > 0);
  readonly message = this.messageSignal.asReadonly();

  show(message = 'Carregando…'): void {
    this.messageSignal.set(message);
    this.depth.update((d) => d + 1);
  }

  hide(): void {
    this.depth.update((d) => Math.max(0, d - 1));
  }

  /** Substitui a mensagem sem alterar o contador (se já estiver ativo). */
  update(message: string): void {
    if (this.depth() > 0) {
      this.messageSignal.set(message);
    }
  }

  /** Força limpeza (ex.: erro inesperado). */
  reset(): void {
    this.depth.set(0);
  }
}
