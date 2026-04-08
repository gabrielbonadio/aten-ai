import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly mode = signal<ThemeMode>('light');

  constructor() {
    const saved = this.safeGet('aten-ai.theme');
    if (saved === 'dark' || saved === 'light') {
      this.mode.set(saved);
    }

    effect(() => {
      const mode = this.mode();
      this.safeSet('aten-ai.theme', mode);
      const root = this.document.documentElement;
      if (mode === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    });
  }

  toggle(): void {
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private safeGet(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
}

