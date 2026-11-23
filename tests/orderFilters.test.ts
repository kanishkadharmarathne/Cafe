import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { matchesOrderFilters, type OrderFilters, type SearchableOrder } from '../src/app/admin/orderFilters.ts'

const order: SearchableOrder = {
  order_id: 'id-1',
  order_number: 'ORD-123',
  customer_name: 'Alex Pop',
  phone: '0700123456',
  email: 'alex@example.com',
  order_type: 'Dine In',
  order_status: 'preparing',
  payment_status: 'pending',
  order_time: '2026-03-15T12:00:00Z',
}
const filters: OrderFilters = { search: '', type: '', status: '', payment: '', fromDate: '', toDate: '' }

test('search finds order numbers and customer contact information case-insensitively', () => {
  for (const search of [' ord-123 ', 'ALEX', '123456', 'EXAMPLE.COM']) {
    assert.equal(matchesOrderFilters(order, { ...filters, search }), true)
  }
  assert.equal(matchesOrderFilters(order, { ...filters, search: 'other' }), false)
  assert.equal(matchesOrderFilters({ ...order, order_number: null }, { ...filters, search: 'ID-1' }), true)
})

test('type, status, payment and date filters combine and include date boundaries', () => {
  const matching = { ...filters, type: 'Dine In', status: 'preparing', payment: 'pending', fromDate: '2026-03-15', toDate: '2026-03-15' }
  assert.equal(matchesOrderFilters(order, matching), true)
  assert.equal(matchesOrderFilters(order, { ...matching, type: 'Delivery' }), false)
  assert.equal(matchesOrderFilters(order, { ...matching, status: 'ready' }), false)
  assert.equal(matchesOrderFilters(order, { ...matching, payment: 'paid' }), false)
  assert.equal(matchesOrderFilters(order, { ...matching, fromDate: '2026-03-16' }), false)
  assert.equal(matchesOrderFilters(order, { ...matching, toDate: '2026-03-14' }), false)
})
