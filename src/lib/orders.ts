import { supabase } from './supabase'
import { ACTIVE_KITCHEN_STATUSES, type KitchenStatus } from './kitchenWorkflow'

export type OrderType = 'Dine In' | 'Takeaway' | 'Pickup' | 'Delivery'
export type SpiceLevel = 'low' | 'medium' | 'high'

export interface SecureOrderItem {
  item_id: string
  quantity: number
  item_notes?: string
  selected_options?: unknown[]
}

export interface SecureOrderPayload {
  order_type: OrderType
  spice_level: SpiceLevel
  customer_name: string
  phone: string
  email?: string | null
  items: SecureOrderItem[]
  notes?: string
  pickup_mode?: 'asap' | 'scheduled'
  pickup_time?: string | null
  table_number?: string | number | null
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  delivery_instructions?: string
}

export async function createSecureOrder(payload: SecureOrderPayload): Promise<unknown> {
  if (!['low', 'medium', 'high'].includes(payload.spice_level)) {
    throw new Error('Invalid spice level.')
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!payload.items.length || payload.items.some(item =>
    !uuidPattern.test(item.item_id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1
  )) {
    throw new Error('The cart contains an invalid menu item ID or quantity.')
  }

  if (payload.order_type === 'Delivery') {
    if (!payload.delivery_address?.trim()) {
      throw new Error('A delivery address is required.')
    }
    const hasLatitude = payload.delivery_latitude !== undefined
    const hasLongitude = payload.delivery_longitude !== undefined
    if (hasLatitude !== hasLongitude) {
      throw new Error('Delivery coordinates must be provided together.')
    }
    if (
      (hasLatitude && (!Number.isFinite(payload.delivery_latitude) || Math.abs(payload.delivery_latitude!) > 90)) ||
      (hasLongitude && (!Number.isFinite(payload.delivery_longitude) || Math.abs(payload.delivery_longitude!) > 180))
    ) {
      throw new Error('Delivery coordinates are invalid.')
    }
  }

  if (payload.order_type === 'Pickup' && !payload.pickup_mode) {
    throw new Error('A pickup preference is required.')
  }

  if (payload.order_type === 'Pickup' && payload.pickup_mode === 'scheduled') {
    if (!payload.pickup_time || !Number.isFinite(Date.parse(payload.pickup_time)) ||
      Date.parse(payload.pickup_time) <= Date.now()) {
      throw new Error('Scheduled pickup must be set to a future time.')
    }
  }

  const { data, error } = await supabase.rpc('create_order_secure', {
    p_payload: payload,
  })
  if (error) throw error
  return data
}

export async function fetchCustomerOrders(userId: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('order_id, order_number, order_type, spice_level, order_status, payment_status, subtotal, total_value, order_time, pickup_mode, pickup_time, delivery_address, delivery_instructions, order_items(*), order_status_history(*)')
    .eq('user_id', userId)
    .order('order_time', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown[]
}

export interface KitchenOrderItem {
  id: string | number
  item_name: string
  item_name_en: string | null
  item_name_ro: string | null
  quantity: number
  item_notes: string | null
  selected_options: unknown
}

export interface KitchenOrder {
  order_id: string | number
  order_number: string | number | null
  order_type: OrderType
  customer_name: string
  order_time: string
  order_status: string
  spice_level: string | null
  table_number: string | number | null
  pickup_mode: string | null
  pickup_time: string | null
  delivery_address: string | null
  delivery_instructions: string | null
  notes: string | null
  order_items: KitchenOrderItem[] | null
}

export async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const { data, error } = await supabase.from('orders')
    .select('order_id,order_number,order_type,customer_name,order_time,order_status,spice_level,table_number,pickup_mode,pickup_time,delivery_address,delivery_instructions,notes,order_items(id,item_name,item_name_en,item_name_ro,quantity,item_notes,selected_options)')
    .in('order_status', [...ACTIVE_KITCHEN_STATUSES, 'completed', 'cancelled'])
    .order('order_time', { ascending: true })
  if (error) throw error
  return data as KitchenOrder[]
}

export async function updateKitchenOrderStatus(orderId: string | number, status: KitchenStatus): Promise<void> {
  const { error } = await supabase.rpc('update_order_status_secure', {
    p_order_id: orderId,
    p_new_status: status,
    p_note: null,
  })
  if (error) throw error
}

export async function fetchAdminOrders(): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_status_history(*)')
    .order('order_time', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown[]
}

export function getCreatedOrderReference(result: unknown): string {
  const value = Array.isArray(result) ? result[0] : result
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const reference = record.order_number ?? record.order_id
    if (typeof reference === 'string' || typeof reference === 'number') return String(reference)
  }
  return ''
}
