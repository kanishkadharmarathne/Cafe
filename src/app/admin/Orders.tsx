import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import './AdminPanel.css'

type PaymentStatus = 'Pending' | 'Paid'
type ProcessingStatus = 'Pending' | 'Preparing' | 'Completed'
type DeliveryStatus = 'Pending' | 'Delivered'

const PAYMENT_STATUSES: PaymentStatus[] = ['Pending', 'Paid']
const PROCESSING_STATUSES: ProcessingStatus[] = ['Pending', 'Preparing', 'Completed']
const DELIVERY_STATUSES: DeliveryStatus[] = ['Pending', 'Delivered']

interface OrderItem {
  id: number
  item_name: string
  quantity: number
}

interface Order {
  order_id: number
  customer_name: string
  phone: string
  order_type: 'Takeaway' | 'Dine In'
  total_value: number | string
  payment_status: boolean
  order_time: string
  processing_status: boolean
  is_ready: boolean
  delivery_status: boolean
  order_items: OrderItem[] | null
}

function getPaymentStatus(order: Order): PaymentStatus {
  return order.payment_status ? 'Paid' : 'Pending'
}

function getProcessingStatus(order: Order): ProcessingStatus {
  if (order.is_ready) return 'Completed'
  if (order.processing_status) return 'Preparing'
  return 'Pending'
}

function getDeliveryStatus(order: Order): DeliveryStatus {
  return order.delivery_status ? 'Delivered' : 'Pending'
}

function formatAmount(value: number | string) {
  return `₹${Number(value).toFixed(2)}`
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        order_id,
        customer_name,
        phone,
        order_type,
        total_value,
        payment_status,
        order_time,
        processing_status,
        is_ready,
        delivery_status,
        order_items(id, item_name, quantity)
      `)
      .order('order_time', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }

    setLoading(false)
  }

  async function updateOrder(orderId: number, values: Partial<Order>, field: string) {
    const nextKey = `${orderId}:${field}`
    setSavingKey(nextKey)

    const { error } = await supabase
      .from('orders')
      .update(values)
      .eq('order_id', orderId)

    setSavingKey('')

    if (error) {
      console.error(error)
      return
    }

    fetchOrders()
  }

  async function handlePaymentChange(order: Order, nextStatus: PaymentStatus) {
    await updateOrder(
      order.order_id,
      { payment_status: nextStatus === 'Paid' },
      'payment'
    )
  }

  async function handleProcessingChange(order: Order, nextStatus: ProcessingStatus) {
    const nextValues =
      nextStatus === 'Pending'
        ? { processing_status: false, is_ready: false }
        : nextStatus === 'Preparing'
          ? { processing_status: true, is_ready: false }
          : { processing_status: true, is_ready: true }

    await updateOrder(order.order_id, nextValues, 'processing')
  }

  async function handleDeliveryChange(order: Order, nextStatus: DeliveryStatus) {
    await updateOrder(
      order.order_id,
      { delivery_status: nextStatus === 'Delivered' },
      'delivery'
    )
  }

  const pendingPayments = orders.filter((order) => !order.payment_status).length
  const preparingOrders = orders.filter((order) => order.processing_status && !order.is_ready).length
  const readyOrders = orders.filter((order) => order.is_ready).length

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Orders</h2>

        <span className="admin-section-count">
          {orders.length} orders
        </span>
      </div>

      <div className="admin-orders-stats">
        <div className="admin-orders-stat-card">
          <span className="admin-orders-stat-label">Pending Payment</span>
          <strong>{pendingPayments}</strong>
        </div>

        <div className="admin-orders-stat-card">
          <span className="admin-orders-stat-label">Preparing</span>
          <strong>{preparingOrders}</strong>
        </div>

        <div className="admin-orders-stat-card">
          <span className="admin-orders-stat-label">Completed</span>
          <strong>{readyOrders}</strong>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-text">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty">
          No orders found.
        </div>
      ) : (
        <div className="admin-orders-list">
          {orders.map((order) => (
            <article key={order.order_id} className="admin-order-card">
              <div className="admin-order-top">
                <div>
                  <div className="admin-order-kicker">
                    Order #{order.order_id}
                  </div>

                  <h3 className="admin-order-name">
                    {order.customer_name}
                  </h3>

                  <div className="admin-order-meta">
                    <span>{order.phone}</span>
                    <span>{order.order_type}</span>
                    <span>{new Date(order.order_time).toLocaleString()}</span>
                  </div>
                </div>

                <div className="admin-order-total-block">
                  <span className="admin-order-total-label">Total</span>
                  <strong className="admin-order-total-value">
                    {formatAmount(order.total_value)}
                  </strong>
                </div>
              </div>

              <div className="admin-order-body">
                <div className="admin-order-items">
                  <h4>Items</h4>

                  <ul>
                    {(order.order_items ?? []).map((item) => (
                      <li key={item.id}>
                        <span>{item.item_name}</span>
                        <span>×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="admin-order-controls">
                  <div className="admin-order-field">
                    <label>Payment</label>
                    <div className="admin-status-buttons" role="group" aria-label={`Payment status for order ${order.order_id}`}>
                      {PAYMENT_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`admin-status-btn ${getPaymentStatus(order) === status ? 'active' : ''}`}
                          disabled={savingKey === `${order.order_id}:payment`}
                          onClick={() => handlePaymentChange(order, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="admin-order-field">
                    <label>Processing</label>
                    <div className="admin-status-buttons" role="group" aria-label={`Processing status for order ${order.order_id}`}>
                      {PROCESSING_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`admin-status-btn ${getProcessingStatus(order) === status ? 'active' : ''}`}
                          disabled={savingKey === `${order.order_id}:processing`}
                          onClick={() => handleProcessingChange(order, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="admin-order-field">
                    <label>Delivery</label>
                    <div className="admin-status-buttons" role="group" aria-label={`Delivery status for order ${order.order_id}`}>
                      {DELIVERY_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`admin-status-btn ${getDeliveryStatus(order) === status ? 'active' : ''}`}
                          disabled={savingKey === `${order.order_id}:delivery`}
                          onClick={() => handleDeliveryChange(order, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}