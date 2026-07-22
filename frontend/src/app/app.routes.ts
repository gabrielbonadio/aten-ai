import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'agenda',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/appointments/agenda.component').then((m) => m.AgendaComponent)
  },
  {
    path: 'pets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/pets/pet-list.component').then((m) => m.PetListComponent)
  },
  {
    path: 'tutors',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tutors/tutors.component').then((m) => m.TutorsComponent)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent)
  },
  {
    path: 'pets/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/pets/pet-profile.component').then((m) => m.PetProfileComponent)
  }
];
