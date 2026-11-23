import { supabase } from './supabase'
import type { SpiceLevel } from './orders'

export type AdditionStatus = 'draft' | 'submitted' | 'preparing' | 'ready' | 'completed' | 'cancelled'

export interface AdditionItem {
  item_id: string
  quantity: number
  spice_level: SpiceLevel
  item_notes?: string | null
  selected_options?: unknown[]
}

export interface OrderAddition {
  addition_id: string
  addition_number?: string | number | null
  order_id: string | number
  status: AdditionStatus
  subtotal: number | string
  notes?: string | null
  created_at?: string
  updated_at?: string
  submitted_at?: string
  completed_at?: string
  cancelled_at?: string
  created_by?: string | null
  items?: OrderAdditionItem[]
  status_history?: AdditionStatusHistory[]
}

export interface AdditionStatusHistory {
  history_id: number
  old_status: string | null
  new_status: string
  changed_at: string
  note: string | null
}

export interface OrderAdditionItem {
  id: string
  addition_id: string
  item_id: string
  item_name_en: string | null
  item_name_ro: string | null
  item_name?: string
  quantity: number
  unit_price: number | string
  spice_level?: SpiceLevel | null
  item_notes?: string | null
  selected_options?: unknown
  line_total: number | string
  created_at?: string
}

export async function createOrderAdditionSecure(
  orderId: string | number,
  notes?: string
): Promise<OrderAddition> {
  const { data, error } = await supabase.rpc('create_order_addition_secure', {
    p_order_id: orderId,
    p_notes: notes || null,
  })
  if (error) throw error
  return data as OrderAddition
}

export async function saveOrderAdditionItemsSecure(
  additionId: string,
  items: AdditionItem[]
): Promise<void> {
  const { error } = await supabase.rpc('save_order_addition_items_secure', {
    p_addition_id: additionId,
    p_items: items,
  })
  if (error) throw error
}

export async function finalizeOrderAdditionSecure(
  additionId: string
): Promise<OrderAddition> {
  const { data, error } = await supabase.rpc('finalize_order_addition_secure', {
    p_addition_id: additionId,
  })
  if (error) throw error
  return data as OrderAddition
}

export async function updateOrderAdditionStatusSecure(
  additionId: string,
  newStatus: AdditionStatus
): Promise<void> {
  const { error } = await supabase.rpc('update_order_addition_status_secure', {
    p_addition_id: additionId,
    p_new_status: newStatus,
  })
  if (error) throw error
}

export async function fetchOrderAdditions(
  orderId: string | number
): Promise<OrderAddition[]> {
  const { data, error } = await supabase
    .from('order_additions')
    .select('*, items:order_addition_items(*), status_history:order_addition_status_history(history_id,old_status,new_status,changed_at,note)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as OrderAddition[]
}

export async function fetchKitchenAdditions(): Promise<OrderAddition[]> {
  const { data, error } = await supabase
    .from('order_additions')
    .select('*, items:order_addition_items(*)')
    .in('status', ['submitted', 'preparing', 'ready'])
    .order('submitted_at', { ascending: true })

  if (error) throw error
  return data as OrderAddition[]
}

export function isActiveAdditionStatus(status: string): boolean {
  return ['submitted', 'preparing', 'ready'].includes(status)
}

export function nextAdditionStatus(
  status: AdditionStatus
): AdditionStatus | null {
  if (status === 'submitted') return 'preparing'
  if (status === 'preparing') return 'ready'
  if (status === 'ready') return 'completed'
  return null
}
