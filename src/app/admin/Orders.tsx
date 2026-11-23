import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../../lib/currency'
import { useLanguage } from '../../lib/language'
import { fetchAdminOrders } from '../../lib/orders'
import { SpiceBadge } from '../../component/SpiceLevel'
import OrderAdditions from '../../component/OrderAdditions'
import AdditionModal from '../../component/AdditionModal'
import DiOrders from './DiOrders'
import { matchesOrderFilters } from './orderFilters'
import OrderStatusTimeline, { type StatusHistory } from './OrderStatusTimeline'
import './AdminPanel.css'

interface OrderItem {
  id: string | number
  item_name: string
  quantity: number
  unit_price?: number | string
  line_total?: number | string
  item_notes?: string | null
  selected_options?: unknown
}

interface Order {
  order_id: string | number
  order_number?: string | number | null
  customer_name: string
  phone: string
  email?: string | null
  order_type: string
  spice_level: string | null
  order_status: string
  payment_status: string
  subtotal: number | string
  total_value: number | string
  order_time: string
  pickup_mode?: string | null
  pickup_time?: string | null
  table_number?: string | number | null
  delivery_address?: string | null
  delivery_instructions?: string | null
  notes?: string | null
  order_items: OrderItem[] | null
  order_status_history: StatusHistory[] | null
}

const ORDER_TYPES = ['Dine In', 'Takeaway', 'Pickup', 'Delivery']
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']
const PAYMENT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded']

export function AddItemsButton({ orderType, orderStatus, onClick }: {
  orderType: string
  orderStatus: string
  onClick: () => void
}) {
  const { t } = useLanguage()
  if (orderType !== 'Dine In') return null
  const cancelled = orderStatus === 'cancelled'
  return <button type="button" className="admin-btn-secondary" disabled={cancelled}
    title={cancelled ? t('Cannot add items to cancelled orders.', 'Nu poți adăuga produse la comenzile anulate.') : undefined}
    onClick={onClick}>{t('Add Items', 'Adaugă produse')}</button>
}

export default function Orders() {
  const { language } = useLanguage()
  const t = useCallback((en: string, ro: string) => language === 'ro' ? ro : en, [language])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpened, setCreateOpened] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | number | null>(null)
  const [additionModalOpen, setAdditionModalOpen] = useState<string | number | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const data = await fetchAdminOrders()
      setOrders(data as Order[])
    } catch (error) {
      console.error('Failed to fetch admin orders:', error)
      setFetchError(t('Could not load orders. Check your access and try again.', 'Comenzile nu au putut fi încărcate. Verifică accesul și încearcă din nou.'))
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchOrders() }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchOrders])

  function displayStatus(value: string) {
    const labels: Record<string, [string, string]> = {
      pending: ['Pending', 'În așteptare'], confirmed: ['Confirmed', 'Confirmată'],
      preparing: ['Preparing', 'În pregătire'], ready: ['Ready', 'Gata'],
      out_for_delivery: ['Out for delivery', 'În curs de livrare'],
      completed: ['Completed', 'Finalizată'], cancelled: ['Cancelled', 'Anulată'],
      processing: ['Processing', 'În procesare'], paid: ['Paid', 'Plătită'],
      failed: ['Failed', 'Eșuată'], refunded: ['Refunded', 'Rambursată'],
      partially_refunded: ['Partially refunded', 'Rambursată parțial'],
    }
    const pair = labels[value.toLowerCase()]
    return pair ? t(pair[0], pair[1]) : value
  }

  function displayType(value: string) {
    const labels: Record<string, [string, string]> = {
      'Dine In': ['Dine In', 'La restaurant'],
      Takeaway: ['Takeaway', 'La pachet'],
      Pickup: ['Pickup', 'Ridicare'],
      Delivery: ['Delivery', 'Livrare'],
    }
    const pair = labels[value]
    return pair ? t(pair[0], pair[1]) : value
  }

  const filteredOrders = useMemo(() => orders.filter(order => matchesOrderFilters(order, {
    search, type: typeFilter, status: statusFilter, payment: paymentFilter, fromDate, toDate,
  })), [orders, search, typeFilter, statusFilter, paymentFilter, fromDate, toDate])

  return (
    <div className="admin-section" lang={language}>
      <div className="admin-section-header">
        <h2 className="admin-section-title">{t('Orders', 'Comenzi')}</h2>
        {!creating && <span className="admin-section-count">{filteredOrders.length} {t('orders', 'comenzi')}</span>}
      </div>
      <div className="admin-top-actions">
        <button type="button" className={creating ? 'admin-btn-secondary' : 'admin-btn-primary'} onClick={() => setCreating(false)}>{t('View orders', 'Vezi comenzile')}</button>
        <button type="button" className={creating ? 'admin-btn-primary' : 'admin-btn-secondary'} onClick={() => {
          setCreateOpened(true)
          setCreating(true)
        }}>{t('Create order', 'Creează comandă')}</button>
      </div>
      {createOpened && <div hidden={!creating}><DiOrders onOrderCreated={() => void fetchOrders()} /></div>}
      <div hidden={creating}>
      <div className="admin-order-filters">
        <div className="admin-form-group">
          <label htmlFor="order-search">{t('Search orders', 'Caută comenzi')}</label>
          <input id="order-search" type="search" placeholder={t('Order number, customer, phone or email', 'Numărul comenzii, client, telefon sau e-mail')} value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="admin-order-filter-grid">
          <div className="admin-form-group">
            <label htmlFor="order-type-filter">{t('Order type', 'Tipul comenzii')}</label>
            <select id="order-type-filter" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="">{t('All types', 'Toate tipurile')}</option>
              {ORDER_TYPES.map(value => <option key={value} value={value}>{displayType(value)}</option>)}
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="order-status-filter">{t('Order status', 'Statusul comenzii')}</label>
            <select id="order-status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">{t('All statuses', 'Toate statusurile')}</option>
              {ORDER_STATUSES.map(value => <option key={value} value={value}>{displayStatus(value)}</option>)}
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="payment-status-filter">{t('Payment status', 'Statusul plății')}</label>
            <select id="payment-status-filter" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}>
              <option value="">{t('All statuses', 'Toate statusurile')}</option>
              {PAYMENT_STATUSES.map(value => <option key={value} value={value}>{displayStatus(value)}</option>)}
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="order-from-date">{t('From date', 'De la data')}</label>
            <input id="order-from-date" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="order-to-date">{t('To date', 'Până la data')}</label>
            <input id="order-to-date" type="date" value={toDate} onChange={event => setToDate(event.target.value)} />
          </div>
        </div>
      </div>
      {fetchError && <p role="alert">{fetchError} <button type="button" onClick={() => void fetchOrders()}>{t('Retry', 'Reîncearcă')}</button></p>}
      {loading ? <div className="admin-loading-text" role="status">{t('Loading orders…', 'Se încarcă comenzile…')}</div>
        : !fetchError && filteredOrders.length === 0 ? <div className="admin-empty">{t('No orders found.', 'Nu există comenzi.')}</div>
          : (filteredOrders.length > 0 || !fetchError) && <div className="admin-table-wrapper admin-orders-table-wrapper" tabIndex={0} aria-label={t('Orders table', 'Tabelul comenzilor')}>
            <table className="admin-table admin-orders-table">
              <thead><tr>
                <th scope="col">{t('Order', 'Comandă')}</th>
                <th scope="col">{t('Order type', 'Tipul comenzii')}</th>
                <th scope="col">{t('Customer', 'Client')}</th>
                <th scope="col">{t('Order time', 'Data comenzii')}</th>
                <th scope="col">{t('Spice level', 'Nivel de iuțeală')}</th>
                <th scope="col">{t('Total', 'Total')}</th>
                <th scope="col">{t('Payment status', 'Statusul plății')}</th>
                <th scope="col">{t('Order status', 'Statusul comenzii')}</th>
                <th scope="col">{t('Actions', 'Acțiuni')}</th>
              </tr></thead>
              <tbody>
            {filteredOrders.map(order => (
              <Fragment key={order.order_id}>
                <tr>
                  <td>#{order.order_number ?? order.order_id}</td>
                  <td><span className="admin-order-type" data-order-type={order.order_type}>{displayType(order.order_type)}</span>{order.order_type === 'Dine In' && order.table_number != null && <div>{t('Table', 'Masă')}: {order.table_number}</div>}</td>
                  <td>{order.customer_name}<div>{order.phone}</div></td>
                  <td>{new Date(order.order_time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}</td>
                  <td><SpiceBadge level={order.spice_level} /></td>
                  <td>{formatCurrency(order.total_value)}</td>
                  <td>{displayStatus(order.payment_status)}</td>
                  <td>{displayStatus(order.order_status)}</td>
                  <td><div className="admin-order-actions">
                    <button type="button" className="admin-btn-secondary" aria-expanded={selectedOrderId === order.order_id}
                      aria-controls={selectedOrderId === order.order_id ? `order-details-${order.order_id}` : undefined}
                      aria-label={`${selectedOrderId === order.order_id ? t('Close order', 'Închide comanda') : t('View order', 'Vezi comanda')} #${order.order_number ?? order.order_id}`}
                      onClick={() => setSelectedOrderId(selectedOrderId === order.order_id ? null : order.order_id)}>
                      {selectedOrderId === order.order_id ? t('Close', 'Închide') : t('View', 'Vezi')}
                    </button>
                    <AddItemsButton orderType={order.order_type} orderStatus={order.order_status} onClick={() => setAdditionModalOpen(order.order_id)} />
                  </div></td>
                </tr>
                {selectedOrderId === order.order_id && <tr id={`order-details-${order.order_id}`}><td colSpan={9}><div className="admin-order-details">
                  <h3>{t('Order details and status history', 'Detalii comandă și istoric')} #{order.order_number ?? order.order_id}</h3>
                  {order.email && <p>{t('Email', 'E-mail')}: {order.email}</p>}
                  <p>{t('Subtotal', 'Subtotal')}: {formatCurrency(order.subtotal)}</p>
                  {order.table_number != null && <p>{t('Table', 'Masă')}: {order.table_number}</p>}
                  {order.pickup_mode && <p>{t('Pickup', 'Ridicare')}: {order.pickup_mode} {order.pickup_time ? new Date(order.pickup_time).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB') : ''}</p>}
                  {order.delivery_address && <p>{t('Delivery address', 'Adresa de livrare')}: {order.delivery_address}</p>}
                  {order.delivery_instructions && <p>{t('Instructions', 'Instrucțiuni')}: {order.delivery_instructions}</p>}
                  {order.notes && <p>{t('Order notes', 'Note pentru comandă')}: {order.notes}</p>}
                  <h4>{t('Items', 'Produse')}</h4>
                  <ul>{(order.order_items ?? []).map(item => <li key={item.id}>
                    {item.item_name} × {item.quantity}
                    {item.unit_price !== undefined && ` · ${formatCurrency(item.unit_price)}`}
                    {item.line_total !== undefined && ` · ${formatCurrency(item.line_total)}`}
                    {item.item_notes && ` (${item.item_notes})`}
                    {item.selected_options != null && (!Array.isArray(item.selected_options) || item.selected_options.length > 0) &&
                      <div>{t('Selected options', 'Opțiuni selectate')}: {typeof item.selected_options === 'string' ? item.selected_options : JSON.stringify(item.selected_options)}</div>}
                  </li>)}</ul>
                  <h4>{t('Status history', 'Istoricul statusului')}</h4>
                  <OrderStatusTimeline history={order.order_status_history} displayStatus={displayStatus} />
                  
                  {order.order_type === 'Dine In' && (
                    <OrderAdditions orderId={order.order_id} />
                  )}
                </div></td></tr>}
              </Fragment>
            ))}
              </tbody>
            </table>
          </div>}
      </div>
      
      {additionModalOpen && (
        <AdditionModal
          orderId={additionModalOpen}
          orderNumber={orders.find(o => o.order_id === additionModalOpen)?.order_number}
          tableNumber={orders.find(o => o.order_id === additionModalOpen)?.table_number}
          orderTotal={orders.find(o => o.order_id === additionModalOpen)?.total_value || 0}
          onClose={() => setAdditionModalOpen(null)}
          onSuccess={() => {
            setAdditionModalOpen(null)
            void fetchOrders()
          }}
        />
      )}
    </div>
  )
}
