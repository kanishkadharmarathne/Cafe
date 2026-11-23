export interface SearchableOrder {
  order_id: string | number
  order_number?: string | number | null
  customer_name: string
  phone: string
  email?: string | null
  order_type: string
  order_status: string
  payment_status: string
  order_time: string
}

export interface OrderFilters {
  search: string
  type: string
  status: string
  payment: string
  fromDate: string
  toDate: string
}

export function matchesOrderFilters(order: SearchableOrder, filters: OrderFilters): boolean {
  const term = filters.search.trim().toLocaleLowerCase()
  const matchesSearch = !term || [
    String(order.order_number ?? order.order_id),
    order.customer_name,
    order.phone,
    order.email ?? '',
  ].some(value => value.toLocaleLowerCase().includes(term))
  const day = order.order_time.slice(0, 10)
  return matchesSearch &&
    (!filters.type || order.order_type === filters.type) &&
    (!filters.status || order.order_status === filters.status) &&
    (!filters.payment || order.payment_status === filters.payment) &&
    (!filters.fromDate || day >= filters.fromDate) &&
    (!filters.toDate || day <= filters.toDate)
}
