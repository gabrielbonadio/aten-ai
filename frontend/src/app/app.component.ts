import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ClinicBrandingService } from './core/services/clinic-branding.service';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/notifications/toast.component';
import { ThemeService } from './shared/theme/theme.service';
import { UiBlockComponent } from './shared/ui/ui-block.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, UiBlockComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly title = 'aten-ai-portal';
  private readonly auth = inject(AuthService);
  private readonly branding = inject(ClinicBrandingService);

  // Mantém o ThemeService vivo para aplicar classe `dark` no <html>.
  constructor(private readonly _theme: ThemeService) {}

  ngOnInit(): void {
    if (this.auth.isTokenValid()) {
      this.branding.refresh();
    }
  }
}
