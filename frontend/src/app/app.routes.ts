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
  }
];
