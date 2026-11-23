import { useCallback, useEffect, useState } from 'react'
import './Pages.css'
import './Menu.css'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/currency'
import { useLanguage } from '../lib/language'
import { fetchCustomerOrders } from '../lib/orders'
import { SpiceBadge } from '../component/SpiceLevel'

interface OrderItem {
  id: string | number
  item_name: string
  quantity: number
  unit_price?: number | string
  line_total?: number | string
  item_notes?: string | null
}

interface StatusHistory {
  status?: string
  new_status?: string
  order_status?: string
  changed_at?: string
  created_at?: string
  status_time?: string
}

interface Order {
  order_id: string | number
  order_number?: string | number | null
  order_type: string
  spice_level: string | null
  order_status: string
  payment_status: string
  subtotal: number | string
  total_value: number | string
  order_time: string
  pickup_mode?: string | null
  pickup_time?: string | null
  delivery_address?: string | null
  delivery_instructions?: string | null
  order_items: OrderItem[] | null
  order_status_history: StatusHistory[] | null
}

const TRACKED_STAGES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed']

export default function MyOrders() {
  const { language } = useLanguage()
  const t = useCallback((en: string, ro: string) => language === 'ro' ? ro : en, [language])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const fetchOrders = useCallback(async () => {
    setFetchError('')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('Failed to retrieve current user:', authError)
      setFetchError(t('Could not verify your account. Please refresh and try again.', 'Nu am putut verifica contul. Reîncarcă pagina și încearcă din nou.'))
      setLoading(false)
      return
    }
    if (!user) {
      setIsAuthenticated(false)
      setOrders([])
      setLoading(false)
      return
    }
    setIsAuthenticated(true)
    try {
      const data = await fetchCustomerOrders(user.id)
      setOrders(data as Order[])
    } catch (error) {
      console.error('Failed to fetch customer orders:', error)
      setFetchError(t('Could not load your orders. Please try again.', 'Nu am putut încărca comenzile. Încearcă din nou.'))
      setOrders([])
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!active) return
      setLoading(true)
      await fetchOrders()
    }
    void load()
    const interval = window.setInterval(() => { void fetchOrders() }, 30000)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load() })
    return () => {
      active = false
      window.clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [fetchOrders])

  function displayStatus(value: string) {
    const labels: Record<string, [string, string]> = {
      pending: ['Pending', 'În așteptare'],
      confirmed: ['Confirmed', 'Confirmată'],
      preparing: ['Preparing', 'În pregătire'],
      ready: ['Ready', 'Gata'],
      out_for_delivery: ['Out for delivery', 'În curs de livrare'],
      completed: ['Completed', 'Finalizată'],
      cancelled: ['Cancelled', 'Anulată'],
      failed: ['Failed', 'Eșuată'],
      paid: ['Paid', 'Plătită'],
      processing: ['Processing', 'În procesare'],
      refunded: ['Refunded', 'Rambursată'],
      partially_refunded: ['Partially refunded', 'Rambursată parțial'],
    }
    const pair = labels[value.toLowerCase()]
    return pair ? t(pair[0], pair[1]) : value
  }

  function displayOrderType(value: string) {
    const labels: Record<string, [string, string]> = {
      'Dine In': ['Dine In', 'La restaurant'],
      Takeaway: ['Takeaway', 'La pachet'],
      Pickup: ['Pickup', 'Ridicare'],
      Delivery: ['Delivery', 'Livrare'],
    }
    const pair = labels[value]
    return pair ? t(pair[0], pair[1]) : value
  }

  return (
    <main className="page inner-page" lang={language}>
      <div className="page-header">
        <span className="page-eyebrow">{t('Your Orders', 'Comenzile tale')}</span>
        <h1>{t('Order history', 'Istoricul comenzilor')}</h1>
        <div className="divider" />
        <p className="page-desc">{t('View your orders and follow their progress.', 'Vezi comenzile și urmărește evoluția lor.')}</p>
      </div>
      {loading ? <div className="order-history" role="status">{t('Loading orders…', 'Se încarcă comenzile…')}</div>
        : fetchError ? <div className="order-history" role="alert">{fetchError}</div>
          : !isAuthenticated ? <div className="order-history">{t('Please sign in to view your order history.', 'Autentifică-te pentru a vedea istoricul comenzilor.')}</div>
            : orders.length === 0 ? <div className="order-history">{t('No orders found.', 'Nu există comenzi.')}</div>
              : <div className="order-history">
                {orders.map(order => {
                  const currentStage = order.order_status.toLowerCase()
                  const currentIndex = TRACKED_STAGES.indexOf(currentStage)
                  const history = order.order_status_history ?? []
                  return (
                    <article className="order-card" key={order.order_id}>
                      <div className="order-header">
                        <h3>{t('Order', 'Comanda')} #{order.order_number || order.order_id}</h3>
                        <span>{new Date(order.order_time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}</span>
                      </div>
                      <div className="order-status-row">
                        <span className="order-status-badge">{displayStatus(currentStage)}</span>
                        <span className="order-status-badge">{t('Payment', 'Plată')}: {displayStatus(order.payment_status)}</span>
                      </div>
                      <p>{t('Type', 'Tip')}: {displayOrderType(order.order_type)}</p>
                      <p><SpiceBadge level={order.spice_level} /></p>
                      <p>{t('Subtotal', 'Subtotal')}: {formatCurrency(order.subtotal)}</p>
                      <p>{t('Total', 'Total')}: {formatCurrency(order.total_value)}</p>
                      {order.pickup_mode && <p>{t('Pickup', 'Ridicare')}: {order.pickup_mode === 'asap' ? t('As soon as possible', 'Cât mai curând') : t('Scheduled', 'Programată')} {order.pickup_time ? new Date(order.pickup_time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB') : ''}</p>}
                      {order.delivery_address && <p>{t('Delivery address', 'Adresa de livrare')}: {order.delivery_address}</p>}
                      {order.delivery_instructions && <p>{t('Instructions', 'Instrucțiuni')}: {order.delivery_instructions}</p>}
                      <h4>{t('Order progress', 'Evoluția comenzii')}</h4>
                      {currentStage === 'cancelled' ? (() => {
                        const event = history.find(entry => (entry.new_status || entry.order_status || entry.status)?.toLowerCase() === 'cancelled')
                        const time = event?.changed_at || event?.created_at || event?.status_time
                        return <p>{displayStatus(currentStage)}{time && ` — ${new Date(time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}`}</p>
                      })() : (
                        <ol>
                          {TRACKED_STAGES.filter(stage => stage !== 'out_for_delivery' || order.order_type === 'Delivery').map((stage, index) => {
                            const event = history.find(entry => (entry.new_status || entry.order_status || entry.status)?.toLowerCase() === stage)
                            const time = event?.changed_at || event?.created_at || event?.status_time
                            return <li key={stage} aria-current={currentStage === stage ? 'step' : undefined}>
                              {displayStatus(stage)}
                              {time && <time> — {new Date(time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}</time>}
                              {!time && index <= currentIndex && <span> ✓</span>}
                            </li>
                          })}
                        </ol>
                      )}
                      <details>
                        <summary>{t('Order details', 'Detalii comandă')}</summary>
                        <p><SpiceBadge level={order.spice_level} /></p>
                        <ul>
                          {(order.order_items ?? []).map(item => (
                            <li key={item.id}>
                              {item.item_name} × {item.quantity}
                              {item.unit_price !== undefined && ` · ${formatCurrency(item.unit_price)} ${t('each', 'bucata')}`}
                              {item.line_total !== undefined && ` — ${formatCurrency(item.line_total)}`}
                              {item.item_notes && ` (${item.item_notes})`}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </article>
                  )
                })}
              </div>}
    </main>
  )
}
