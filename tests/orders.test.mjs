import { strict as assert } from 'node:assert'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const calls = []
const reads = []
let rpcError = null
const originalFetch = globalThis.fetch
globalThis.fetch = () => Promise.reject(new Error('Network access is disabled in order tests'))
globalThis.orderTestSupabase = {
  async rpc(name, args) {
    calls.push({ name, args })
    return { data: { order_id: 'test-order' }, error: rpcError }
  },
  from(table) {
    return {
      select() {
        return {
          in(column, values) {
            reads.push({ table, column, values })
            return { async order() { return { data: [], error: null } } }
          },
        }
      },
    }
  },
}

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
  plugins: [{
    name: 'mock-supabase',
    enforce: 'pre',
    resolveId(source) {
      if (source === './supabase') return '\0mock-supabase'
    },
    load(id) {
      if (id === '\0mock-supabase') return 'export const supabase = globalThis.orderTestSupabase'
    },
  }],
})
const { createSecureOrder, fetchKitchenOrders, updateKitchenOrderStatus } = await server.ssrLoadModule('/src/lib/orders.ts')
const { SpiceSelector, SpiceBadge } = await server.ssrLoadModule('/src/component/SpiceLevel.tsx')
const { default: OrderStatusTimeline } = await server.ssrLoadModule('/src/app/admin/OrderStatusTimeline.tsx')
const { LanguageContext } = await server.ssrLoadModule('/src/lib/language.ts')
after(async () => {
  await server.close()
  globalThis.fetch = originalFetch
  delete globalThis.orderTestSupabase
})

test('order creation sends spice and item identifiers without prices', async () => {
  calls.length = 0
  for (const [type, spice] of [['Takeaway', 'low'], ['Pickup', 'medium'], ['Delivery', 'high'], ['Dine In', 'medium']]) {
    const payload = {
      order_type: type,
      spice_level: spice,
      customer_name: 'Test',
      phone: '123',
      items: [{ item_id: 'a305c812-3d30-448b-94d8-ed56b0663181', quantity: 2 }],
      ...(type === 'Pickup' ? { pickup_mode: 'asap', pickup_time: null } : {}),
      ...(type === 'Delivery' ? { delivery_address: 'Test address' } : {}),
    }
    await createSecureOrder(payload)
    assert.deepEqual(calls.at(-1), { name: 'create_order_secure', args: { p_payload: payload } })
    assert.equal('unit_price' in calls.at(-1).args.p_payload.items[0], false)
    assert.equal('total_value' in calls.at(-1).args.p_payload, false)
  }
})

test('invalid spice or quantity never reaches the RPC', async () => {
  const before = calls.length
  const payload = {
    order_type: 'Takeaway',
    spice_level: 'extreme',
    customer_name: 'Test',
    phone: '123',
    items: [{ item_id: 'a305c812-3d30-448b-94d8-ed56b0663181', quantity: 1 }],
  }
  await assert.rejects(createSecureOrder(payload), /spice level/)
  await assert.rejects(createSecureOrder({ ...payload, spice_level: 'medium', items: [{ ...payload.items[0], quantity: 0 }] }), /quantity/)
  assert.equal(calls.length, before)
})

test('kitchen changes use the status RPC and propagate backend errors', async () => {
  calls.length = 0
  await updateKitchenOrderStatus('order-1', 'preparing')
  assert.deepEqual(calls[0], {
    name: 'update_order_status_secure',
    args: { p_order_id: 'order-1', p_new_status: 'preparing', p_note: null },
  })

  rpcError = new Error('Rejected')
  try {
    await assert.rejects(updateKitchenOrderStatus('order-1', 'ready'), /Rejected/)
  } finally {
    rpcError = null
  }
})

test('cancelled kitchen orders remain available after refresh', async () => {
  calls.length = 0
  reads.length = 0
  await updateKitchenOrderStatus('order-1', 'cancelled')
  assert.deepEqual(calls[0], {
    name: 'update_order_status_secure',
    args: { p_order_id: 'order-1', p_new_status: 'cancelled', p_note: null },
  })
  await fetchKitchenOrders()
  assert.equal(reads[0].table, 'orders')
  assert.equal(reads[0].column, 'order_status')
  assert.ok(reads[0].values.includes('cancelled'))
})

test('spice selection and historical badges support English and Romanian', () => {
  for (const [language, heading, medium, unknown] of [
    ['en', 'Spice level', 'Medium', 'Not specified'],
    ['ro', 'Nivel de iuțeală', 'Mediu', 'Nespecificat'],
  ]) {
    const context = { language, setLanguage() {}, t: (en, ro) => language === 'ro' ? ro : en }
    const render = element => renderToStaticMarkup(createElement(LanguageContext.Provider, { value: context }, element))
    const selector = render(createElement(SpiceSelector, { value: 'medium', onChange() {} }))
    assert.ok(selector.includes(heading))
    assert.ok(selector.includes(medium))
    assert.ok(selector.includes('value="medium" selected'))
    assert.ok(render(createElement(SpiceBadge, { level: null })).includes(unknown))
  }
})

test('order status timeline sorts recorded events and preserves transitions and notes', () => {
  const context = { language: 'en', setLanguage() {}, t: (en, ro) => en }
  const history = [
    { new_status: 'completed', changed_at: '2026-03-15T12:02:00Z' },
    { new_status: 'preparing', previous_status: 'pending', created_at: '2026-03-15T12:01:00Z', notes: 'Started cooking' },
    { status: 'pending', status_time: '2026-03-15T12:00:00Z' },
    { new_status: 'cancelled', changed_at: 'invalid time' },
  ]
  const html = renderToStaticMarkup(createElement(LanguageContext.Provider, { value: context },
    createElement(OrderStatusTimeline, { history, displayStatus: status => status.toUpperCase() })))
  assert.ok(html.indexOf('PENDING') < html.indexOf('PREPARING'))
  assert.ok(html.indexOf('PREPARING') < html.indexOf('COMPLETED'))
  assert.ok(html.indexOf('COMPLETED') < html.indexOf('CANCELLED'))
  assert.ok(html.includes('Previous status: PENDING'))
  assert.ok(html.includes('Started cooking'))
  assert.ok(html.includes('dateTime="2026-03-15T12:00:00Z"'))
  assert.ok(html.includes('invalid time'))
  assert.ok(html.includes('is-cancelled'))
})

test('order status timeline handles empty and undated history in Romanian', () => {
  const context = { language: 'ro', setLanguage() {}, t: (en, ro) => ro }
  const render = history => renderToStaticMarkup(createElement(LanguageContext.Provider, { value: context },
    createElement(OrderStatusTimeline, { history, displayStatus: status => status })))
  assert.ok(render(null).includes('Nu există istoric al statusului.'))
  const html = render([{ new_status: 'pending' }, {}])
  assert.ok(html.includes('Ora nu este disponibilă'))
  assert.ok(html.includes('Status necunoscut'))
  assert.equal((html.match(/admin-status-event-title/g) ?? []).length, 2)
})
