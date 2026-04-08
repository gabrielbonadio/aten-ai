import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'agenda',
    loadComponent: () =>
      import('./features/appointments/agenda.component').then((m) => m.AgendaComponent)
  },
  {
    path: 'pets',
    loadComponent: () => import('./features/pets/pet-list.component').then((m) => m.PetListComponent)
  },
  {
    path: 'tutors',
    loadComponent: () => import('./features/tutors/tutors.component').then((m) => m.TutorsComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.SettingsComponent)
  },
  {
    path: 'pets/:id',
    loadComponent: () =>
      import('./features/pets/pet-profile.component').then((m) => m.PetProfileComponent)
  }
];
