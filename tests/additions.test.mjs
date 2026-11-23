import { strict as assert } from 'node:assert'
import { after, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const reads = []
const addition = {
  addition_id: 'addition-1',
  addition_number: 'TOA-000001',
  order_id: 'order-1',
  status: 'completed',
  subtotal: 16,
  created_at: '2026-11-23T09:00:00Z',
  submitted_at: '2026-11-23T09:01:00Z',
  completed_at: '2026-11-23T09:10:00Z',
  status_history: [
    { history_id: 1, old_status: 'submitted', new_status: 'preparing', changed_at: '2026-11-23T09:02:00Z', note: 'Started' },
    { history_id: 2, old_status: 'preparing', new_status: 'ready', changed_at: '2026-11-23T09:05:00Z', note: null },
  ],
  items: [{
    id: 'item-1', item_name_en: 'Cheese Kottu', item_name_ro: 'Kottu cu brânză',
    quantity: 2, unit_price: 8, line_total: 16, spice_level: 'high', item_notes: 'Extra lime',
  }],
}

globalThis.additionTestSupabase = {
  from(table) {
    const read = { table }
    reads.push(read)
    return {
      select(columns) {
        read.columns = columns
        return {
          eq(column, value) {
            read.filter = { column, value }
            return { async order() { return { data: [addition], error: null } } }
          },
          in(column, values) {
            read.filter = { column, values }
            return { async order() { return { data: [addition], error: null } } }
          },
        }
      },
    }
  },
}

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  plugins: [{
    name: 'mock-supabase',
    enforce: 'pre',
    resolveId(source) {
      if (source === './supabase') return '\0mock-additions-supabase'
    },
    load(id) {
      if (id === '\0mock-additions-supabase') return 'export const supabase = globalThis.additionTestSupabase'
    },
  }],
})
const { fetchOrderAdditions, fetchKitchenAdditions } = await server.ssrLoadModule('/src/lib/additions.ts')
const { AdditionHistory } = await server.ssrLoadModule('/src/component/OrderAdditions.tsx')
const { AddItemsButton } = await server.ssrLoadModule('/src/app/admin/Orders.tsx')
const { LanguageContext } = await server.ssrLoadModule('/src/lib/language.ts')

after(async () => {
  await server.close()
  delete globalThis.additionTestSupabase
})

test('add-items action permits completed dine-in orders but not cancelled or other order types', () => {
  for (const language of ['en', 'ro']) {
    const context = { language, setLanguage() {}, t: (en, ro) => language === 'ro' ? ro : en }
    const render = (orderType, orderStatus) => renderToStaticMarkup(
      createElement(LanguageContext.Provider, { value: context },
        createElement(AddItemsButton, { orderType, orderStatus, onClick() {} })))

    for (const status of ['pending', 'confirmed', 'preparing', 'ready', 'completed']) {
      const html = render('Dine In', status)
      assert.match(html, /<button/)
      assert.doesNotMatch(html, /\sdisabled/)
    }
    const cancelled = render('Dine In', 'cancelled')
    assert.match(cancelled, /\sdisabled/)
    assert.ok(cancelled.includes(language === 'ro' ? 'comenzile anulate' : 'cancelled orders'))
    for (const type of ['Takeaway', 'Pickup', 'Delivery']) assert.equal(render(type, 'completed'), '')
  }
})

test('admin and kitchen requests select addition items under the UI field', async () => {
  reads.length = 0
  const admin = await fetchOrderAdditions('order-1')
  const kitchen = await fetchKitchenAdditions()
  assert.equal(admin[0].items[0].item_name_en, 'Cheese Kottu')
  assert.equal(kitchen[0].items[0].quantity, 2)
  assert.ok(reads.every(read => read.columns.includes('items:order_addition_items(*)')))
  assert.ok(reads[0].columns.includes('status_history:order_addition_status_history(history_id,old_status,new_status,changed_at,note)'))
  assert.ok(!reads[1].columns.includes('status_history:'))
  assert.deepEqual(reads[0].filter, { column: 'order_id', value: 'order-1' })
  assert.deepEqual(reads[1].filter, { column: 'status', values: ['submitted', 'preparing', 'ready'] })
})

test('addition history renders items, recorded transitions and milestone fallback in both languages', () => {
  for (const [language, name, history, completed] of [
    ['en', 'Cheese Kottu', 'Recorded status history', 'Completed'],
    ['ro', 'Kottu cu brânză', 'Istoricul statusurilor înregistrate', 'Finalizată'],
  ]) {
    const context = { language, setLanguage() {}, t: (en, ro) => language === 'ro' ? ro : en }
    const html = renderToStaticMarkup(createElement(LanguageContext.Provider, { value: context },
      createElement(AdditionHistory, { additions: [addition] })))
    assert.ok(html.includes(name))
    assert.ok(html.includes('Extra lime'))
    assert.ok(html.includes(history))
    assert.ok(html.includes(completed))
    assert.ok(html.includes('2026-11-23T09:01:00Z'))
    assert.ok(html.includes('2026-11-23T09:10:00Z'))
    assert.ok(html.includes('2026-11-23T09:02:00Z'))
    assert.ok(html.includes('2026-11-23T09:05:00Z'))
    assert.ok(html.includes('Started'))
    assert.ok(html.indexOf('2026-11-23T09:02:00Z') < html.indexOf('2026-11-23T09:05:00Z'))
  }
})

test('milestones do not invent intermediate transitions or duplicate recorded events', () => {
  const context = { language: 'en', setLanguage() {}, t: en => en }
  const data = { ...addition, status_history: [
    { history_id: 3, old_status: 'draft', new_status: 'submitted', changed_at: addition.submitted_at, note: null },
  ] }
  const html = renderToStaticMarkup(createElement(LanguageContext.Provider, { value: context },
    createElement(AdditionHistory, { additions: [data] })))
  assert.equal((html.match(/class="admin-status-event-title">Submitted/g) ?? []).length, 1)
  assert.ok(!html.includes('Preparing</div>'))
  assert.ok(!html.includes('Ready</div>'))
})
