import { Component } from '@angular/core';
import { ThemeToggleComponent } from '../theme/theme-toggle.component';

/** Envelope visual compartilhado das telas públicas de auth (zinc/emerald + dark). */
@Component({
  selector: 'app-auth-page-shell',
  standalone: true,
  imports: [ThemeToggleComponent],
  template: `
    <div
      class="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 px-4 py-10 dark:bg-zinc-950"
    >
      <div
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_-10%,rgba(16,185,129,0.14),transparent_55%)] dark:bg-[radial-gradient(900px_circle_at_50%_-10%,rgba(52,211,153,0.12),transparent_55%)]"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-100/80 to-transparent dark:from-zinc-900/50"
        aria-hidden="true"
      ></div>

      <div class="absolute right-4 top-4 z-10">
        <app-theme-toggle />
      </div>

      <div class="ui-auth-enter relative z-10 w-full max-w-md">
        <div class="mb-7 flex flex-col items-center text-center">
          <div
            class="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
          >
            <span class="text-base font-semibold tracking-tight">AI</span>
          </div>
          <div class="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Aten-AI
          </div>
          <p class="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Portal para clínicas veterinárias
          </p>
        </div>

        <div
          class="rounded-2xl border border-zinc-200/90 bg-white/95 p-6 shadow-sm shadow-zinc-900/5 backdrop-blur-[2px] sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/85"
        >
          <ng-content />
        </div>
      </div>
    </div>
  `
})
export class AuthPageShellComponent {}
