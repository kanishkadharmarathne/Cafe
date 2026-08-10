import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import '../Menu.css'

interface MenuItem {
  id: string
  item: string
  portion: string
  description: string
  price: number
  status: boolean
  category_id: string | null
}

interface CartEntry {
  id: string
  name: string
  qty: number
  amount: number
}

interface Category {
  id: string
  category_name: string
}

export default function DiOrders() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [savingOrder, setSavingOrder] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchMenu() {
      setMenuLoading(true)

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, category_name')
        .order('category_name')

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          id,
          item,
          portion,
          description,
          price,
          status,
          category_id
        `)
        .eq('status', true)
        .order('item')

      if (!categoriesError && categoriesData) {
        setCategories(categoriesData as Category[])
      } else if (categoriesError) {
        console.error('Failed to fetch categories:', categoriesError)
      }

      if (!menuError && menuData) {
        setMenuItems(menuData as MenuItem[])
      } else if (menuError) {
        console.error('Failed to fetch menu items:', menuError)
        setMessage('Unable to load menu items right now.')
      }

      setMenuLoading(false)
    }

    void fetchMenu()
  }, [])

  const groupedMenu = useMemo(
    () => {
      const categoryNameById = new Map(categories.map((category) => [category.id, category.category_name]))

      return Array.from(
        menuItems
          .reduce((groups, item) => {
            const categoryKey = item.category_id || 'uncategorized'
            const categoryName = item.category_id
              ? categoryNameById.get(item.category_id) || 'Uncategorized'
              : 'Uncategorized'

            if (!groups.has(categoryKey)) {
              groups.set(categoryKey, {
                key: categoryKey,
                name: categoryName,
                items: [] as MenuItem[],
              })
            }

            groups.get(categoryKey)?.items.push(item)
            return groups
          }, new Map<string, { key: string; name: string; items: MenuItem[] }>())
          .values()
      )
    },
    [menuItems, categories]
  )

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)
  const grandTotal = cart.reduce((sum, item) => sum + item.amount * item.qty, 0)

  function handleAddToCart(menuItem: MenuItem) {
    setMessage('')
    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === menuItem.id)
      if (existing) {
        return prev.map((entry) =>
          entry.id === menuItem.id ? { ...entry, qty: entry.qty + 1 } : entry
        )
      }

      return [
        ...prev,
        {
          id: menuItem.id,
          name: menuItem.item,
          qty: 1,
          amount: menuItem.price,
        },
      ]
    })

    setAdded((prev) => ({ ...prev, [menuItem.id]: true }))
    setTimeout(() => {
      setAdded((prev) => ({ ...prev, [menuItem.id]: false }))
    }, 900)
  }

  function increment(id: string) {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)))
  }

  function decrement(id: string) {
    setCart((prev) => prev
      .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
      .filter((item) => item.qty > 0))
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleCreateDineInOrder() {
    if (cart.length === 0 || savingOrder) {
      return
    }

    setSavingOrder(true)
    setMessage('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const customerName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        'Dine In Customer'

      const orderPayload = {
        user_id: user?.id ?? null,
        customer_name: customerName,
        email: user?.email ?? 'dinein@local',
        phone: user?.phone ?? '0000000000',
        order_type: 'Dine In',
        delivery_address: 'restrurant',
        delivery_latitude: null,
        delivery_longitude: null,
        total_value: grandTotal,
        payment_status: false,
      }

      let orderResponse = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('order_id')
        .single()

      // Support schemas that do not have delivery_latitude/delivery_longitude columns.
      if (
        orderResponse.error &&
        /delivery_latitude|delivery_longitude|column/i.test(orderResponse.error.message)
      ) {
        const { delivery_latitude: _deliveryLatitude, delivery_longitude: _deliveryLongitude, ...payloadWithoutCoords } = orderPayload
        orderResponse = await supabase
          .from('orders')
          .insert(payloadWithoutCoords)
          .select('order_id')
          .single()
      }

      // Some constraints may validate exact spelling/casing for dine-in location.
      if (
        orderResponse.error &&
        orderResponse.error.code === '23514' &&
        /delivery_location_check/i.test(orderResponse.error.message)
      ) {
        const { delivery_latitude: _deliveryLatitude, delivery_longitude: _deliveryLongitude, ...payloadWithoutCoords } = orderPayload
        orderResponse = await supabase
          .from('orders')
          .insert({ ...payloadWithoutCoords, delivery_address: 'restaurant' })
          .select('order_id')
          .single()
      }

      const { data: order, error: orderError } = orderResponse

      if (orderError || !order) {
        if (
          orderError?.code === '23514' &&
          /delivery_location_check/i.test(orderError.message)
        ) {
          throw new Error('orders.delivery_location_check rejected this Dine In payload. Please update the DB constraint to allow order_type = Dine In with delivery_address = restrurant (or restaurant).')
        }

        throw orderError || new Error('Failed to create order')
      }

      const orderItemsPayload = cart.map((item) => ({
        order_id: order.order_id,
        item_id: item.id,
        item_name: item.name,
        quantity: item.qty,
      }))

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)

      if (orderItemsError) {
        await supabase.from('orders').delete().eq('order_id', order.order_id)
        throw orderItemsError
      }

      setCart([])
      setMessage(`Dine in order #${order.order_id} created successfully.`)
    } catch (error) {
      console.error('Failed to create dine in order:', error)
      setMessage('Failed to create dine in order. Please try again.')
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="messages-page">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Dine In Orders</h2>
      </div>

      {cart.length > 0 && (
        <div className="cart-panel">
          <div className="cart-panel-header">
            <span className="cart-panel-title">
              Dine In Cart
              <span className="cart-total-badge">
                {totalItems} item{totalItems > 1 ? 's' : ''}
              </span>
            </span>

            <button className="cart-clear-btn" onClick={() => setCart([])}>
              Clear all
            </button>
          </div>

          <ul className="cart-list">
            {cart.map((item) => (
              <li className="cart-list-item" key={item.id}>
                <div className="cart-item-name">
                  <span>{item.name}</span>
                  <span className="cart-item-unit-price">Rs {item.amount} each</span>
                </div>

                <div className="cart-item-controls">
                  <button className="cart-qty-btn" onClick={() => decrement(item.id)}>
                    -
                  </button>
                  <span className="cart-qty">{item.qty}</span>
                  <button className="cart-qty-btn" onClick={() => increment(item.id)}>
                    +
                  </button>
                </div>

                <span className="cart-item-subtotal">Rs {item.amount * item.qty}</span>

                <button className="cart-remove-btn" onClick={() => removeItem(item.id)}>
                  x
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-panel-footer">
            <div className="cart-grand-total">
              <span>Total</span>
              <span className="cart-total-amount">Rs {grandTotal}</span>
            </div>

            <div className="checkout-action">
              <button
                className="btn-checkout-full"
                onClick={handleCreateDineInOrder}
                disabled={savingOrder || cart.length === 0}
              >
                {savingOrder ? 'Saving...' : 'Create Dine In Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="checkout-message">{message}</p>}

      {menuLoading ? (
        <p style={{ textAlign: 'center', color: '#7a5c3e', padding: '60px 0' }}>
          Loading menu...
        </p>
      ) : groupedMenu.length === 0 ? (
        <div className="empty">No active menu items available.</div>
      ) : (
        groupedMenu.map((group) => (
          <section className="menu-section" key={group.key}>
            <h2 className="menu-category">
              {group.name}
            </h2>

            <div className="menu-grid">
              {group.items.map((menuItem) => (
                <div className="menu-item" key={menuItem.id}>
                  <div className="menu-item-info">
                    <h3>{menuItem.item}</h3>
                    {menuItem.portion && <span className="menu-item-portion">{menuItem.portion}</span>}
                    <p>{menuItem.description}</p>
                  </div>

                  <div className="menu-item-right">
                    <span className="menu-price">Rs {menuItem.price}</span>
                    <div className="menu-item-actions">
                      <button
                        className={`menu-btn-cart ${added[menuItem.id] ? 'added' : ''}`}
                        onClick={() => handleAddToCart(menuItem)}
                      >
                        {added[menuItem.id] ? 'Added' : '+ Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}