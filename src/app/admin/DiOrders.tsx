import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import { createSecureOrder, getCreatedOrderReference, type OrderType, type SpiceLevel } from '../../lib/orders'
import { SpiceSelector } from '../../component/SpiceLevel'
import { localized, useLanguage } from '../../lib/language'
import '../Menu.css'
import '../../component/CheckoutModal.css'

interface MenuItem {
  id: string
  item_name_en: string | null
  item_name_ro: string | null
  portion: string
  description_en: string | null
  description_ro: string | null
  price: number
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
  category_name_en: string | null
  category_name_ro: string | null
}

export default function DiOrders({ onOrderCreated }: { onOrderCreated: () => void }) {
  const { language } = useLanguage()
  const t = useCallback((en: string, ro: string) => language === 'ro' ? ro : en, [language])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [savingOrder, setSavingOrder] = useState(false)
  const [message, setMessage] = useState('')
  const [orderType, setOrderType] = useState<OrderType>('Dine In')
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('medium')
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', tableNumber: '', pickupMode: 'asap' as 'asap' | 'scheduled', pickupTime: '', address: '', latitude: '', longitude: '', deliveryInstructions: '', notes: '' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchMenu() {
      setMenuLoading(true)

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, category_name_en, category_name_ro')
        .eq('is_active', true)
        .order('display_order')

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          id,
          item_name_en,
          item_name_ro,
          portion,
          description_en,
          description_ro,
          price,
          category_id
        `)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('display_order')

      if (!categoriesError && categoriesData) {
        setCategories(categoriesData as Category[])
      } else if (categoriesError) {
        console.error('Failed to fetch categories:', categoriesError)
        setMessage(t('Unable to load menu categories right now.', 'Nu am putut încărca categoriile meniului.'))
      }

      if (!menuError && menuData) {
        setMenuItems(menuData as MenuItem[])
      } else if (menuError) {
        console.error('Failed to fetch menu items:', menuError)
        setMessage(t('Unable to load menu items right now.', 'Nu am putut încărca produsele din meniu.'))
      }

      setMenuLoading(false)
    }

    void fetchMenu()
  }, [t])

  const groupedMenu = useMemo(
    () => {
      const categoryNameById = new Map(categories.map((category) => [category.id, localized(language, category.category_name_en, category.category_name_ro) || t('Uncategorized', 'Fără categorie')]))

      return Array.from(
        menuItems.filter(item => !item.category_id || categoryNameById.has(item.category_id))
          .reduce((groups, item) => {
            const categoryKey = item.category_id || 'uncategorized'
            const categoryName = item.category_id
              ? categoryNameById.get(item.category_id) || 'Uncategorized'
              : t('Uncategorized', 'Fără categorie')

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
    [menuItems, categories, language, t]
  )

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)
  const grandTotal = cart.reduce((sum, item) => sum + item.amount * item.qty, 0)
  const filteredMenuItems = menuItems.filter(item =>
    `${item.item_name_en || ''} ${item.item_name_ro || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  )

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
          name: localized(language, menuItem.item_name_en, menuItem.item_name_ro) || t('Unnamed item', 'Produs fără nume'),
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

  async function handleCreateOrder() {
    if (cart.length === 0 || savingOrder) {
      return
    }

    setSavingOrder(true)
    setMessage('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) throw authError

      const customerName = customer.name.trim() ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        ''
      if (!customerName || !customer.phone.trim()) {
        throw new Error('Customer name and phone are required.')
      }
      if (orderType === 'Delivery' && !customer.address.trim()) {
        throw new Error('A delivery address is required.')
      }
      if (orderType === 'Pickup' && customer.pickupMode === 'scheduled' &&
        (!customer.pickupTime || !Number.isFinite(new Date(customer.pickupTime).getTime()) || new Date(customer.pickupTime).getTime() <= Date.now())) {
        throw new Error('Scheduled pickup must be set to a future time.')
      }
      const hasLatitude = customer.latitude.trim() !== ''
      const hasLongitude = customer.longitude.trim() !== ''
      if (orderType === 'Delivery' && hasLatitude !== hasLongitude) {
        throw new Error('Enter both delivery coordinates or leave both blank.')
      }
      const latitude = hasLatitude ? Number(customer.latitude) : undefined
      const longitude = hasLongitude ? Number(customer.longitude) : undefined
      if ((latitude !== undefined && !Number.isFinite(latitude)) || (longitude !== undefined && !Number.isFinite(longitude))) {
        throw new Error('Delivery coordinates must be valid numbers.')
      }

      const result = await createSecureOrder({
        order_type: orderType,
        spice_level: spiceLevel,
        customer_name: customerName,
        phone: customer.phone.trim(),
        email: customer.email.trim() || user?.email || null,
        items: cart.map(item => ({ item_id: item.id, quantity: item.qty, selected_options: [] })),
        ...(customer.notes.trim() ? { notes: customer.notes.trim() } : {}),
        ...(orderType === 'Dine In' && customer.tableNumber.trim() ? { table_number: customer.tableNumber.trim() } : {}),
        ...(orderType === 'Pickup' ? {
          pickup_mode: customer.pickupMode,
          pickup_time: customer.pickupMode === 'scheduled' ? new Date(customer.pickupTime).toISOString() : null,
        } : {}),
        ...(orderType === 'Delivery' ? {
          delivery_address: customer.address.trim(),
          delivery_instructions: customer.deliveryInstructions.trim(),
          ...(latitude !== undefined && longitude !== undefined ? {
            delivery_latitude: latitude,
            delivery_longitude: longitude,
          } : {}),
        } : {}),
      })

      setCart([])
      onOrderCreated()
      setMessage(t(
        `Order ${getCreatedOrderReference(result) ? `#${getCreatedOrderReference(result)} ` : ''}created successfully.`,
        `Comanda ${getCreatedOrderReference(result) ? `#${getCreatedOrderReference(result)} ` : ''}a fost creată cu succes.`
      ))
    } catch (error) {
      console.error('Failed to create admin order:', error)
      const reason = error instanceof Error ? error.message.toLowerCase() : ''
      setMessage(
        reason.includes('name and phone')
          ? t('Customer name and phone are required.', 'Numele și numărul de telefon al clientului sunt obligatorii.')
          : reason.includes('delivery address')
            ? t('A delivery address is required.', 'Adresa de livrare este obligatorie.')
            : reason.includes('scheduled pickup')
              ? t('Choose a valid future pickup time.', 'Alege o oră de ridicare validă, în viitor.')
              : reason.includes('coordinates')
                ? t('Enter valid latitude and longitude together.', 'Introdu împreună latitudinea și longitudinea valide.')
                : reason.includes('auth') || reason.includes('permission')
                  ? t('Your admin session is not authorized. Sign in again and retry.', 'Sesiunea de administrator nu este autorizată. Autentifică-te din nou și încearcă iar.')
                : t('Failed to create order. Review the details and try again.', 'Comanda nu a putut fi creată. Verifică datele și încearcă din nou.')
      )
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="messages-page">
      <div className="admin-section-header">
        <h2 className="admin-section-title">{t('Create Order', 'Creează comandă')}</h2>
      </div>

      <div className="co-form">
        <SpiceSelector value={spiceLevel} onChange={setSpiceLevel} />
        <label className="co-field">{t('Order type', 'Tipul comenzii')}
          <select value={orderType} onChange={event => setOrderType(event.target.value as OrderType)}>
            <option value="Dine In">{t('Dine In', 'La restaurant')}</option>
            <option value="Takeaway">{t('Takeaway', 'La pachet')}</option>
            <option value="Pickup">{t('Pickup', 'Ridicare')}</option>
            <option value="Delivery">{t('Delivery', 'Livrare')}</option>
          </select>
        </label>
        <div className="co-row">
          <label className="co-field">{t('Customer name', 'Numele clientului')}<input value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} /></label>
          <label className="co-field">{t('Phone number', 'Număr de telefon')}<input type="tel" value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} /></label>
          <label className="co-field">{t('Email (optional)', 'E-mail (opțional)')}<input type="email" value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} /></label>
        </div>
        {orderType === 'Dine In' && <label className="co-field">{t('Table number (optional)', 'Numărul mesei (opțional)')}<input value={customer.tableNumber} onChange={event => setCustomer({ ...customer, tableNumber: event.target.value })} /></label>}
        {orderType === 'Pickup' && <>
          <label className="co-field">{t('Pickup time', 'Ora ridicării')}
            <select value={customer.pickupMode} onChange={event => setCustomer({ ...customer, pickupMode: event.target.value as 'asap' | 'scheduled' })}>
              <option value="asap">{t('As soon as possible', 'Cât mai curând')}</option>
              <option value="scheduled">{t('Scheduled', 'Programată')}</option>
            </select>
          </label>
          {customer.pickupMode === 'scheduled' && <label className="co-field">{t('Scheduled date and time', 'Data și ora programată')}<input type="datetime-local" value={customer.pickupTime} onChange={event => setCustomer({ ...customer, pickupTime: event.target.value })} /></label>}
        </>}
        {orderType === 'Delivery' && <>
          <label className="co-field">{t('Delivery address', 'Adresa de livrare')}<textarea value={customer.address} onChange={event => setCustomer({ ...customer, address: event.target.value })} /></label>
          <div className="co-row">
            <label className="co-field">{t('Latitude (optional)', 'Latitudine (opțională)')}<input type="number" step="any" value={customer.latitude} onChange={event => setCustomer({ ...customer, latitude: event.target.value })} /></label>
            <label className="co-field">{t('Longitude (optional)', 'Longitudine (opțională)')}<input type="number" step="any" value={customer.longitude} onChange={event => setCustomer({ ...customer, longitude: event.target.value })} /></label>
          </div>
          <label className="co-field">{t('Delivery instructions (optional)', 'Instrucțiuni de livrare (opțional)')}<textarea value={customer.deliveryInstructions} onChange={event => setCustomer({ ...customer, deliveryInstructions: event.target.value })} /></label>
        </>}
        <label className="co-field">{t('Order notes (optional)', 'Note pentru comandă (opțional)')}<textarea value={customer.notes} onChange={event => setCustomer({ ...customer, notes: event.target.value })} /></label>
        <label className="co-field">{t('Search menu', 'Caută în meniu')}<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </div>

      {cart.length > 0 && (
        <div className="cart-panel">
          <div className="cart-panel-header">
            <span className="cart-panel-title">
              {t('Order cart', 'Coșul comenzii')}
              <span className="cart-total-badge">
                {totalItems} {totalItems === 1 ? t('item', 'produs') : t('items', 'produse')}
              </span>
            </span>

            <button className="cart-clear-btn" onClick={() => setCart([])}>
              {t('Clear all', 'Golește coșul')}
            </button>
          </div>

          <ul className="cart-list">
            {cart.map((item) => (
              <li className="cart-list-item" key={item.id}>
                <div className="cart-item-name">
                  <span>{item.name}</span>
                  <span className="cart-item-unit-price">{formatCurrency(item.amount)} {t('each', 'bucata')}</span>
                </div>

                <div className="cart-item-controls">
                  <button className="cart-qty-btn" aria-label={`${t('Decrease quantity', 'Scade cantitatea')}: ${item.name}`} onClick={() => decrement(item.id)}>
                    -
                  </button>
                  <span className="cart-qty">{item.qty}</span>
                  <button className="cart-qty-btn" aria-label={`${t('Increase quantity', 'Crește cantitatea')}: ${item.name}`} onClick={() => increment(item.id)}>
                    +
                  </button>
                </div>

                <span className="cart-item-subtotal">{formatCurrency(item.amount * item.qty)}</span>

                <button className="cart-remove-btn" aria-label={`${t('Remove', 'Elimină')}: ${item.name}`} onClick={() => removeItem(item.id)}>
                  x
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-panel-footer">
            <div className="cart-grand-total">
            <span>{t('Subtotal estimate', 'Subtotal estimativ')}</span>
              <span className="cart-total-amount">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="checkout-action">
              <button
                className="btn-checkout-full"
                onClick={handleCreateOrder}
                disabled={savingOrder || cart.length === 0}
              >
                {savingOrder ? t('Saving…', 'Se salvează…') : t('Create Order', 'Creează comandă')}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <p className="checkout-message">{message}</p>}

      {menuLoading ? (
        <p style={{ textAlign: 'center', color: '#7a5c3e', padding: '60px 0' }}>
          {t('Loading menu…', 'Se încarcă meniul…')}
        </p>
      ) : groupedMenu.length === 0 ? (
        <div className="empty">{t('No active menu items available.', 'Nu există produse active în meniu.')}</div>
      ) : (
        groupedMenu.map((group) => (
          <section className="menu-section" key={group.key}>
            <h2 className="menu-category">
                {group.name}
            </h2>

            <div className="menu-grid">
              {group.items.filter(item => filteredMenuItems.some(filtered => filtered.id === item.id)).map((menuItem) => (
                <div className="menu-item" key={menuItem.id}>
                  <div className="menu-item-info">
                    <h3>{localized(language, menuItem.item_name_en, menuItem.item_name_ro)}</h3>
                    {menuItem.portion && <span className="menu-item-portion">{menuItem.portion}</span>}
                    <p>{localized(language, menuItem.description_en, menuItem.description_ro)}</p>
                  </div>

                  <div className="menu-item-right">
                    <span className="menu-price">{formatCurrency(menuItem.price)}</span>
                    <div className="menu-item-actions">
                      <button
                        className={`menu-btn-cart ${added[menuItem.id] ? 'added' : ''}`}
                        onClick={() => handleAddToCart(menuItem)}
                      >
                        {added[menuItem.id] ? t('Added', 'Adăugat') : t('+ Cart', '+ Coș')}
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