import { useCallback, useEffect, useRef, useState } from 'react'
import { localized, useLanguage } from '../../lib/language'
import { fetchKitchenOrders, updateKitchenOrderStatus, type KitchenOrder } from '../../lib/orders'
import { isActiveKitchenStatus, nextKitchenStatus, type KitchenStatus } from '../../lib/kitchenWorkflow'
import { SpiceBadge } from '../../component/SpiceLevel'
import { MdRefresh, MdRestaurant } from 'react-icons/md'
import KitchenAdditions from './KitchenAdditions'
import './Kitchen.css'

type Filter = 'active' | KitchenStatus
const FILTERS: Filter[] = ['active', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']

function statusLabel(status: string, t: (en: string, ro: string) => string): string {
  const labels: Record<string, [string, string]> = {
    active: ['Active orders', 'Comenzi active'],
    pending: ['New orders', 'Comenzi noi'],
    confirmed: ['Confirmed', 'Confirmate'],
    preparing: ['Preparing', 'În pregătire'],
    ready: ['Ready', 'Gata'],
    out_for_delivery: ['Out for delivery', 'În curs de livrare'],
    completed: ['Completed', 'Finalizate'],
    cancelled: ['Cancelled', 'Anulate'],
  }
  const label = labels[status]
  return label ? t(...label) : status
}

function typeLabel(type: string, t: (en: string, ro: string) => string): string {
  const labels: Record<string, [string, string]> = {
    'Dine In': ['Dine In', 'La restaurant'],
    Takeaway: ['Takeaway', 'La pachet'],
    Pickup: ['Pickup', 'Ridicare'],
    Delivery: ['Delivery', 'Livrare'],
  }
  const label = labels[type]
  return label ? t(...label) : type
}

export default function Kitchen() {
  const { language, t } = useLanguage()
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [updateError, setUpdateError] = useState(false)
  const [success, setSuccess] = useState(false)
  const [filter, setFilter] = useState<Filter>('active')
  const [saving, setSaving] = useState<Map<string, KitchenStatus>>(new Map())
  const inFlight = useRef(new Map<string, KitchenStatus>())
  const requestId = useRef(0)
  const mounted = useRef(false)

  const refresh = useCallback(async () => {
    const request = ++requestId.current
    try {
      const data = await fetchKitchenOrders()
      if (mounted.current && request === requestId.current) {
        setOrders(data)
        setLoadError(false)
      }
    } catch (error) {
      console.error('Failed to load kitchen orders:', error)
      if (mounted.current && request === requestId.current) setLoadError(true)
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const timer = window.setTimeout(() => { void refresh() }, 0)
    const interval = window.setInterval(() => { void refresh() }, 30000)
    return () => {
      mounted.current = false
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [refresh])

  async function changeStatus(order: KitchenOrder, next: KitchenStatus) {
    const key = String(order.order_id)
    if (inFlight.current.has(key)) return
    if (next === 'completed' && !window.confirm(t('Mark this order as completed?', 'Marchezi această comandă ca finalizată?'))) return
    if (next === 'cancelled' && !window.confirm(t('Cancel this order?', 'Anulezi această comandă?'))) return
    inFlight.current.set(key, next)
    setSaving(new Map(inFlight.current))
    setSuccess(false)
    setUpdateError(false)
    try {
      await updateKitchenOrderStatus(order.order_id, next)
      requestId.current++
      if (mounted.current) {
        setOrders(current => current.map(item => item.order_id === order.order_id ? { ...item, order_status: next } : item))
        setSuccess(true)
        await refresh()
      }
    } catch (error) {
      console.error('Failed to update kitchen order status:', error)
      if (mounted.current) setUpdateError(true)
    } finally {
      inFlight.current.delete(key)
      if (mounted.current) setSaving(new Map(inFlight.current))
    }
  }

  const visible = orders.filter(order => filter === 'active'
    ? isActiveKitchenStatus(order.order_status)
    : order.order_status === filter)

  return <section className="kitchen-board" aria-labelledby="kitchen-title">
    <div className="kitchen-heading">
      <div>
        <div className="kitchen-eyebrow"><MdRestaurant aria-hidden="true" /> Taste of Ceylon</div>
        <h1 id="kitchen-title">{t('Kitchen Dashboard', 'Panoul bucătăriei')}</h1>
        <p>{t('Keep track of orders and additions in one place.', 'Urmărește comenzile și adăugările într-un singur loc.')}</p>
      </div>
      <button className="kitchen-refresh" type="button" onClick={() => void refresh()}><MdRefresh aria-hidden="true" /> {t('Refresh orders', 'Actualizează comenzile')}</button>
    </div>

    <div className="kitchen-section">
      <div className="kitchen-section-heading">
        <div><h2>{t('Orders', 'Comenzi')}</h2><p>{t('Original order tickets', 'Bonurile comenzilor originale')}</p></div>
        {!loading && !loadError && <span className="kitchen-count">{visible.length} {t('shown', 'afișate')}</span>}
      </div>
      <div className="kitchen-filters" aria-label={t('Filter orders', 'Filtrează comenzile')}>
        {FILTERS.map(value => {
          const count = orders.filter(order => value === 'active' ? isActiveKitchenStatus(order.order_status) : order.order_status === value).length
          return <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {statusLabel(value, t)} {!loading && !loadError && <span className="kitchen-filter-count">{count}</span>}
          </button>
        })}
      </div>
      {success && <p className="kitchen-message kitchen-message-success" role="status">{t('Status updated.', 'Statusul a fost actualizat.')}</p>}
      {updateError && <p className="kitchen-message kitchen-message-error" role="alert">{t('Status update failed. Refresh to check the order before trying again.', 'Actualizarea statusului a eșuat. Actualizează lista pentru a verifica comanda înainte de a încerca din nou.')}</p>}
      {loadError && <p className="kitchen-message kitchen-message-error" role="alert">{t('Could not refresh orders. Displayed information may be outdated.', 'Comenzile nu au putut fi actualizate. Informațiile afișate pot fi vechi.')} <button type="button" onClick={() => void refresh()}>{t('Retry', 'Reîncearcă')}</button></p>}
      {loading ? <p className="kitchen-empty" role="status">{t('Loading orders…', 'Se încarcă comenzile…')}</p> : visible.length === 0 && !loadError
        ? <p className="kitchen-empty">{t('No orders in this view.', 'Nu există comenzi în această categorie.')}</p>
        : <div className="kitchen-grid">{visible.map(order => {
          const next = nextKitchenStatus(order.order_status, order.order_type)
          return <article className="kitchen-card" data-status={order.order_status} key={order.order_id}>
            <div className="kitchen-card-header">
              <div><span className="kitchen-ticket-label">{t('Order', 'Comandă')}</span>
                <h3>#{order.order_number ?? order.order_id}</h3></div>
              <span className="kitchen-status" data-status={order.order_status}>{statusLabel(order.order_status, t)}</span>
            </div>
            <p className="kitchen-ticket-context"><strong>{typeLabel(order.order_type, t)}</strong> · {order.customer_name}</p>
            <p className="kitchen-ticket-meta"><time dateTime={order.order_time}>{new Date(order.order_time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}</time></p>
            <p><SpiceBadge level={order.spice_level} /></p>
            {order.order_type === 'Dine In' && order.table_number != null && <p className="kitchen-table">{t('Table', 'Masă')}: <strong>{order.table_number}</strong></p>}
            {order.order_type === 'Pickup' && order.pickup_mode === 'scheduled' && order.pickup_time && <p>{t('Scheduled pickup', 'Ridicare programată')}: {new Date(order.pickup_time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}</p>}
            {order.order_type === 'Delivery' && order.delivery_address && <p>{t('Delivery address', 'Adresa de livrare')}: {order.delivery_address}</p>}
            {order.order_type === 'Delivery' && order.delivery_instructions && <p>{t('Delivery instructions', 'Instrucțiuni de livrare')}: {order.delivery_instructions}</p>}
            {order.notes && <p className="kitchen-ticket-notes"><strong>{t('Order notes', 'Note pentru comandă')}:</strong> {order.notes}</p>}
            <div className="kitchen-items-label">{t('Items', 'Produse')}</div>
            <ul className="kitchen-items">
              {(order.order_items ?? []).map(item => <li key={item.id}>
                <div className="kitchen-item-name"><span className="kitchen-quantity">{item.quantity}×</span><strong>{localized(language, item.item_name_en, item.item_name_ro) || item.item_name}</strong></div>
                {item.item_notes && <div className="kitchen-item-detail">{t('Item notes', 'Note pentru produs')}: {item.item_notes}</div>}
                {item.selected_options != null && (!Array.isArray(item.selected_options) || item.selected_options.length > 0) &&
                  <div className="kitchen-item-detail">{t('Selected options', 'Opțiuni selectate')}: {typeof item.selected_options === 'string' ? item.selected_options : JSON.stringify(item.selected_options)}</div>}
              </li>)}
            </ul>
            <div className="kitchen-card-actions">
              {next && <button className="kitchen-action" type="button" disabled={saving.has(String(order.order_id))} onClick={() => void changeStatus(order, next)}>
                {saving.get(String(order.order_id)) === next ? t('Updating…', 'Se actualizează…') : `${t('Update status', 'Actualizează statusul')}: ${statusLabel(next, t)}`}
              </button>}
              {isActiveKitchenStatus(order.order_status) && <button className="kitchen-cancel" type="button" disabled={saving.has(String(order.order_id))} onClick={() => void changeStatus(order, 'cancelled')}>
                {saving.get(String(order.order_id)) === 'cancelled' ? t('Cancelling…', 'Se anulează…') : t('Cancel order', 'Anulează comanda')}
              </button>}
            </div>
          </article>
        })}</div>}
    </div>

    <KitchenAdditions />
  </section>
}
