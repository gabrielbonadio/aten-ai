import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/notifications/toast.component';
import { ThemeService } from './shared/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly title = 'aten-ai-portal';
  // Mantém o ThemeService vivo para aplicar classe `dark` no <html>.
  constructor(private readonly _theme: ThemeService) {}
}
