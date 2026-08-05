import type { SidebarNavItem } from '../../components/ui/sidebar/sidebar.component';

export const APP_SIDEBAR_NAV: SidebarNavItem[] = [
  { label: 'Dashboard', route: '/dashboard', iconName: 'layout-dashboard', adminOnly: true },
  { label: 'Agendamentos', route: '/agenda', iconName: 'calendar' },
  { label: 'Pets', route: '/pets', iconName: 'dog', exact: false },
  { label: 'Tutores', route: '/tutors', iconName: 'users' },
  { label: 'Configurações', route: '/settings', iconName: 'settings' }
];

/** Filtra itens da sidebar conforme o papel do usuário. */
export function sidebarNavForRole(isAdmin: boolean): SidebarNavItem[] {
  return APP_SIDEBAR_NAV.filter((item) => !item.adminOnly || isAdmin);
}
