import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/** Estado de erro de carregamento com ação de retry. */
@Component({
  selector: 'app-load-error',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50/60 px-8 py-12 text-center dark:border-red-500/30 dark:bg-red-950/20"
      role="alert"
    >
      <div
        class="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white text-red-600 shadow-sm dark:bg-zinc-900 dark:text-red-300"
      >
        <lucide-icon name="circle-alert" class="h-6 w-6" aria-hidden="true"></lucide-icon>
      </div>
      <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {{ title() }}
      </p>
      <p class="mt-1 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        {{ message() }}
      </p>
      <button
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        (click)="retry.emit()"
      >
        Tentar novamente
      </button>
    </div>
  `
})
export class LoadErrorComponent {
  readonly title = input('Não foi possível carregar');
  readonly message = input('Verifique sua conexão e tente novamente.');
  readonly retry = output<void>();
}
