import { useState, useEffect } from 'react'
import './Pages.css'
import './Menu.css'
import CheckoutModal from '../component/CheckoutModal'
import { supabase } from '../lib/supabase'

const CATEGORY_ICONS: Record<string, string> = {
  'Espresso & Coffee': '☕',
  'Specialty Drinks': '✨',
  'Food & Bakes': '🥐',
}

interface MenuItem {
  id: string
  category: string
  item: string
  portion: string
  description: string
  price: number
}

export default function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [added, setAdded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('id, category, item, portion, description, price')
      .eq('status', true)
      .order('category')
      .order('item')
      .then(({ data }) => {
        if (data) setMenuItems(data)
        setMenuLoading(false)
      })
  }, [])

  const priceMap: Record<string, number> = Object.fromEntries(
    menuItems.map((i) => [i.item, i.price])
  )

  const categories = Array.from(new Set(menuItems.map((i) => i.category)))

  function handleAddToCart(name: string) {
    setCart((prev) => ({ ...prev, [name]: (prev[name] ?? 0) + 1 }))
    setAdded((prev) => ({ ...prev, [name]: true }))
    setTimeout(() => setAdded((prev) => ({ ...prev, [name]: false })), 1200)
  }

  function increment(name: string) {
    setCart((prev) => ({ ...prev, [name]: prev[name] + 1 }))
  }

  function decrement(name: string) {
    setCart((prev) => {
      const qty = prev[name] - 1
      if (qty <= 0) {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return { ...prev, [name]: qty }
    })
  }

  function removeItem(name: string) {
    setCart((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const cartEntries = Object.entries(cart)
  const totalItems = cartEntries.reduce((a, [, qty]) => a + qty, 0)
  const grandTotal = cartEntries.reduce((a, [name, qty]) => a + (priceMap[name] ?? 0) * qty, 0)
  const [showCheckout, setShowCheckout] = useState(false)

  const cartForModal = cartEntries.map(([name, qty]) => ({ name, qty, amount: priceMap[name] ?? 0 }))

  return (
    <>
    <main className="page inner-page">
      <div className="page-header">
        <span className="page-eyebrow">What We Serve</span>
        <h1>Menu</h1>
        <div className="divider" />
        <p className="page-desc">Seasonal, honest, and made with care.</p>
      </div>

      {/* ── Cart panel ── */}
      {cartEntries.length > 0 && (
        <div className="cart-panel">
          <div className="cart-panel-header">
            <span className="cart-panel-title">
              🛒 Your Order
              <span className="cart-total-badge">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
            </span>
            <button className="cart-clear-btn" onClick={() => setCart({})}>Clear all</button>
          </div>

          <ul className="cart-list">
            {cartEntries.map(([name, qty]) => (
              <li className="cart-list-item" key={name}>
                <div className="cart-item-name">
                  <span>{name}</span>
                  <span className="cart-item-unit-price">₹{priceMap[name]} each</span>
                </div>
                <div className="cart-item-controls">
                  <button className="cart-qty-btn" onClick={() => decrement(name)} aria-label="Decrease">−</button>
                  <span className="cart-qty">{qty}</span>
                  <button className="cart-qty-btn" onClick={() => increment(name)} aria-label="Increase">+</button>
                </div>
                <span className="cart-item-subtotal">₹{priceMap[name] * qty}</span>
                <button className="cart-remove-btn" onClick={() => removeItem(name)} aria-label="Remove">✕</button>
              </li>
            ))}
          </ul>

          <div className="cart-panel-footer">
            <div className="cart-grand-total">
              <span>Total</span>
              <span className="cart-total-amount">₹{grandTotal}</span>
            </div>
            <button className="btn-checkout-full" onClick={() => setShowCheckout(true)}>Proceed to Checkout →</button>
          </div>
        </div>
      )}

      {menuLoading ? (
        <p style={{ textAlign: 'center', color: '#7a5c3e', padding: '60px 0' }}>Loading menu…</p>
      ) : (
        categories.map((category) => {
          const items = menuItems.filter((i) => i.category === category)
          return (
            <section className="menu-section" key={category}>
              <h2 className="menu-category">
                <span>{CATEGORY_ICONS[category] ?? '☕'}</span> {category}
              </h2>
              <div className="menu-grid">
                {items.map((menuItem) => (
                  <div className="menu-item" key={menuItem.id}>
                    <div className="menu-item-info">
                      <h3>{menuItem.item}</h3>
                      {menuItem.portion && <span className="menu-item-portion">{menuItem.portion}</span>}
                      <p>{menuItem.description}</p>
                    </div>
                    <div className="menu-item-right">
                      <span className="menu-price">₹{menuItem.price}</span>
                      <div className="menu-item-actions">
                        <button
                          className={`menu-btn-cart ${added[menuItem.item] ? 'added' : ''}`}
                          onClick={() => handleAddToCart(menuItem.item)}
                        >
                          {added[menuItem.item] ? '✓ Added' : '+ Cart'}
                        </button>
                        <button className="menu-btn-buy">Buy Now</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}
    </main>

      {showCheckout && (
        <CheckoutModal
          cart={cartForModal}
          grandTotal={grandTotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => setCart({})}
        />
      )}
    </>
  )
}
