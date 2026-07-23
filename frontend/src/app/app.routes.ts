import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/signup/signup.component').then((m) => m.SignupComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/authenticated-shell.component').then((m) => m.AuthenticatedShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./features/appointments/agenda.component').then((m) => m.AgendaComponent)
      },
      {
        path: 'pets',
        loadComponent: () =>
          import('./features/pets/pet-list.component').then((m) => m.PetListComponent)
      },
      {
        path: 'tutors',
        loadComponent: () =>
          import('./features/tutors/tutors.component').then((m) => m.TutorsComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent)
      },
      {
        path: 'pets/:id',
        loadComponent: () =>
          import('./features/pets/pet-profile.component').then((m) => m.PetProfileComponent)
      }
    ]
  }
];
