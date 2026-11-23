export type KitchenStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled'

export const ACTIVE_KITCHEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] as const

export function isActiveKitchenStatus(status: string): boolean {
  return ACTIVE_KITCHEN_STATUSES.some(active => active === status)
}

export function canAccessKitchen(role: string | null | undefined): boolean {
  return role === 'kitchen' || role === 'admin' || role === 'super_admin'
}

export function nextKitchenStatus(status: string, orderType: string): KitchenStatus | null {
  if (!['Dine In', 'Takeaway', 'Pickup', 'Delivery'].includes(orderType)) return null
  if (status === 'pending' || status === 'confirmed') return 'preparing'
  if (status === 'preparing') return 'ready'
  if (status === 'ready') return orderType === 'Delivery' ? 'out_for_delivery' : 'completed'
  if (status === 'out_for_delivery' && orderType === 'Delivery') return 'completed'
  return null
}
