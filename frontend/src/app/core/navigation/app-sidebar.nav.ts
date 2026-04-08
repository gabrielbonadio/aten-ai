import type { SidebarNavItem } from '../../components/ui/sidebar/sidebar.component';

export const APP_SIDEBAR_NAV: SidebarNavItem[] = [
  { label: 'Dashboard', route: '/dashboard', iconName: 'layout-dashboard' },
  { label: 'Agendamentos', route: '/agenda', iconName: 'calendar' },
  { label: 'Pets', route: '/pets', iconName: 'dog' },
  { label: 'Tutores', route: '/tutors', iconName: 'users' },
  { label: 'Configurações', route: '/settings', iconName: 'settings' }
];
