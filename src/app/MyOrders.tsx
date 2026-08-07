import { useEffect, useState } from 'react'
import './Pages.css'
import './Menu.css'
import { supabase } from '../lib/supabase'

interface OrderItem {
    id: number
    item_name: string
    quantity: number
}

interface Order {
    order_id: number
    order_type: 'Takeaway' | 'Home Delivery'
    total_value: number | string
    order_time: string
    payment_status: boolean
    processing_status: boolean
    is_ready: boolean
    delivery_status: boolean
    order_items: OrderItem[] | null
}

function getPaymentStatus(order: Order) {
    return order.payment_status ? 'Paid' : 'Pending'
}

function getProcessingStatus(order: Order) {
    if (order.is_ready) return 'Completed'
    if (order.processing_status) return 'Preparing'
    return 'Pending'
}

function getDeliveryStatus(order: Order) {
    return order.delivery_status ? 'Delivered' : 'Pending'
}

export default function MyOrders() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [fetchError, setFetchError] = useState('')

    useEffect(() => {
        let isMounted = true

        async function fetchOrders() {
            setLoading(true)
            setFetchError('')

            const {
                data: { user },
                error
            } = await supabase.auth.getUser()

            if (!isMounted) return

            if (error || !user) {
                setIsAuthenticated(false)
                setOrders([])
                setLoading(false)
                return
            }

            setIsAuthenticated(true)

            const { data, error: ordersError } = await supabase
                .from('orders')
                .select(`
                    order_id,
                    order_type,
                    total_value,
                    order_time,
                    payment_status,
                    processing_status,
                    is_ready,
                    delivery_status,
                    order_items(id, item_name, quantity)
                `)
                .eq('user_id', user.id)
                .order('order_time', { ascending: false })

            if (!isMounted) return

            if (!ordersError && data) {
                setOrders(data)
            } else if (ordersError) {
                console.error('Failed to fetch orders:', ordersError)
                setOrders([])
                setFetchError('Could not load your orders right now. Please try again.')
            }

            setLoading(false)
        }

        fetchOrders()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            void fetchOrders()
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [])

    return (
        <main className="page inner-page">
            <div className="page-header">
                <span className="page-eyebrow">Your Orders</span>
                <h1>My Orders</h1>
                <div className="divider" />
                <p className="page-desc">View your order history and current status.</p>
            </div>

            {loading ? (
                <div className="order-history" style={{ textAlign: 'center' }}>
                    <p>Loading orders...</p>
                </div>
            ) : !isAuthenticated ? (
                <div className="order-history" style={{ textAlign: 'center' }}>
                    <p>Please sign in or sign up to view your order history.</p>
                </div>
            ) : fetchError ? (
                <div className="order-history" style={{ textAlign: 'center' }}>
                    <p>{fetchError}</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="order-history" style={{ textAlign: 'center' }}>
                    <p>No orders found.</p>
                </div>
            ) : (
                <div className="order-history">
                    {orders.map((order) => (
                        <div className="order-card" key={order.order_id}>
                            <div className="order-header">
                                <h3>Order #{order.order_id}</h3>
                                <span>{new Date(order.order_time).toLocaleString()}</span>
                            </div>

                            <div className="order-status-row">
                                <span className={`order-status-badge ${order.payment_status ? 'is-paid' : 'is-pending'}`}>
                                    Payment: {getPaymentStatus(order)}
                                </span>
                                <span className={`order-status-badge ${order.is_ready ? 'is-ready' : order.processing_status ? 'is-progress' : 'is-pending'}`}>
                                    Kitchen: {getProcessingStatus(order)}
                                </span>
                                <span className={`order-status-badge ${order.delivery_status ? 'is-ready' : 'is-pending'}`}>
                                    Delivery: {getDeliveryStatus(order)}
                                </span>
                            </div>

                            <p>Type: {order.order_type}</p>
                            <p>Total: ₹{order.total_value}</p>

                            <h4>Items</h4>
                            <ul>
                                {(order.order_items ?? []).map((item) => (
                                    <li key={item.id}>
                                        {item.item_name} × {item.quantity}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </main>
    )
}