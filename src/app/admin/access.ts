export type AdminRole = 'kitchen' | 'admin' | 'super_admin'
export type AdminTab = 'menu-items' | 'messages' | 'orders' | 'create-admin' | 'dashboard' | 'kitchen'

export function canAccessAdminTab(role: AdminRole, tab: AdminTab): boolean {
  if (role === 'kitchen') return tab === 'kitchen'
  if (role === 'admin') return tab !== 'dashboard' && tab !== 'create-admin'
  return true
}

export function resolveAdminTab(role: AdminRole, tab: AdminTab): AdminTab {
  return canAccessAdminTab(role, tab) ? tab : role === 'kitchen' ? 'kitchen' : 'menu-items'
}
