import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { UiBlockService } from './ui-block.service';

/** Overlay fullscreen que bloqueia interação durante operações críticas. */
@Component({
  selector: 'app-ui-block',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (block.active()) {
      <div
        class="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/55 px-6 backdrop-blur-[2px]"
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
        [attr.aria-label]="block.message()"
      >
        <div
          class="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-8 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div
            class="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            <lucide-icon name="loader" class="h-7 w-7 animate-spin" aria-hidden="true"></lucide-icon>
          </div>
          <div>
            <p class="text-base font-semibold text-zinc-900 dark:text-zinc-50">{{ block.message() }}</p>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Aguarde um instante…</p>
          </div>
        </div>
      </div>
    }
  `
})
export class UiBlockComponent {
  readonly block = inject(UiBlockService);
}
