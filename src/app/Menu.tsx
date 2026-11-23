import { useEffect, useRef, useState } from 'react'
import './Pages.css'
import './Menu.css'
import CheckoutModal from '../component/CheckoutModal'
import AuthModal from '../component/AuthModal'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/currency'
import { localized, useLanguage } from '../lib/language'
import { fetchPublicMenu, type Category, type MenuItem } from '../lib/menu'

function ProductImage({ url, name }: { url: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { t } = useLanguage()
  if (!url || failedUrl === url) {
    return <div className="product-image-placeholder">{t('Image unavailable', 'Imagine indisponibilă')}</div>
  }
  return <img className="product-image" src={url} alt={name} loading="lazy" onError={() => setFailedUrl(url)} />
}

function CategoryImage({ url, name }: { url: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (!url || failedUrl === url) return null
  return <img className="category-image" src={url} alt={name} loading="lazy" onError={() => setFailedUrl(url)} />
}

export default function Menu() {
  const { language, t } = useLanguage()
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('taste-of-ceylon-cart') || '{}') as Record<string, unknown>
      return Object.entries(saved).reduce<Record<string, number>>((cart, [id, quantity]) => {
        if (typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity > 0) {
          cart[id] = quantity
        }
        return cart
      }, {})
    } catch (error) {
      console.error('Failed to restore saved cart:', error)
      return {}
    }
  })
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [continueToCheckout, setContinueToCheckout] = useState(false)
  const [reload, setReload] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('taste-of-ceylon-cart', JSON.stringify(quantities))
  }, [quantities])

  useEffect(() => {
    let active = true
    fetchPublicMenu().then(({ categories, items }) => {
      if (!active) return
      setCategories(categories)
      setItems(items)
      setError(false)
      setLoading(false)
    }).catch((err: unknown) => {
      console.error('Failed to load menu:', err)
      if (active) {
        setError(true)
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    if (!selected) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    modalRef.current?.querySelector<HTMLButtonElement>('.product-modal-close')?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(null)
      if (event.key === 'Tab' && modalRef.current) {
        const buttons = Array.from(modalRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
        if (!buttons.length) return
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault()
          buttons[buttons.length - 1].focus()
        } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
          event.preventDefault()
          buttons[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [selected])

  const nameOf = (item: MenuItem) => localized(language, item.item_name_en, item.item_name_ro) || t('Unnamed item', 'Produs fără nume')
  const visibleItems = items.filter(item => !item.category_id || categories.some(category => category.id === item.category_id))
  const matchingItems = visibleItems.filter(item => {
    const text = `${nameOf(item)} ${localized(language, item.description_en, item.description_ro)} ${localized(language, item.ingredients_en, item.ingredients_ro)}`.toLocaleLowerCase()
    return (categoryId === 'all' || item.category_id === categoryId) && text.includes(search.trim().toLocaleLowerCase())
  })
  const cart = items.filter(item => quantities[item.id] > 0).map(item => ({
    id: item.id, name: nameOf(item), qty: quantities[item.id], amount: Number(item.price), image_url: item.image_url,
  }))
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0)
  const grandTotal = cart.reduce((sum, item) => sum + item.qty * item.amount, 0)
  const hasUnavailableCartItems = cart.some(entry => !items.find(item => item.id === entry.id)?.is_available)

  function changeQuantity(item: MenuItem, change: number) {
    if (change > 0 && !item.is_available) return
    setQuantities(previous => {
      const current = previous[item.id] || 0
      if (change > 0 && current >= Number.MAX_SAFE_INTEGER) return previous
      const quantity = Math.max(0, current + change)
      return { ...previous, [item.id]: quantity }
    })
  }

  async function handleCheckout() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      if (error) console.error('Failed to check sign-in:', error)
      setCheckoutError(true)
      setContinueToCheckout(true)
      setAuthMode('login')
      return
    }
    setCheckoutError(false)
    setShowCheckout(true)
  }

  function productCard(item: MenuItem) {
    const name = nameOf(item)
    return (
      <article className="product-card" key={item.id}>
        <button className="product-detail-button" type="button" onClick={() => setSelected(item)} aria-label={`${t('View details', 'Vezi detalii')}: ${name}`}>
          <ProductImage url={item.image_url} name={name} />
          <span className="product-card-body">
            <strong>{name}</strong>
            {item.is_featured && <span className="product-featured">{t('Featured', 'Recomandat')}</span>}
            {item.portion && <span className="menu-item-portion">{item.portion}</span>}
            <span>{localized(language, item.description_en, item.description_ro)}</span>
          </span>
        </button>
        <div className="product-card-actions">
          <strong>{formatCurrency(item.price)}</strong>
          <button className="menu-btn-cart" type="button" disabled={!item.is_available} onClick={() => changeQuantity(item, 1)}>
            {item.is_available ? t('+ Cart', '+ Coș') : t('Unavailable', 'Indisponibil')}
          </button>
        </div>
      </article>
    )
  }

  const featured = matchingItems.filter(item => item.is_featured)
  return (
    <>
      <main className="page inner-page" lang={language}>
        <div className="page-header">
          <span className="page-eyebrow">{t('Menu', 'Meniu')}</span>
          <h1>{t('The flavours of Ceylon', 'Aromele Ceylonului')}</h1>
          <div className="divider" />
          <p className="page-desc">{t('A place at our table: fragrant spices, wok favourites and Sri Lankan recipes, shared with passion in Arad.', 'Un loc la masa noastră: condimente aromate, preparate la wok și rețete din Sri Lanka, împărtășite cu pasiune în Arad.')}</p>
        </div>

        {cart.length > 0 && (
          <section className="cart-panel" aria-label={t('Your order', 'Comanda ta')}>
            <div className="cart-panel-header">
              <span className="cart-panel-title">{t('Your order', 'Comanda ta')} <span className="cart-total-badge">{totalItems}</span></span>
              <button className="cart-clear-btn" onClick={() => setQuantities({})}>{t('Clear all', 'Golește coșul')}</button>
            </div>
            <ul className="cart-list">
              {cart.map(entry => {
                const item = items.find(product => product.id === entry.id)!
                return <li className="cart-list-item" key={entry.id}>
                  {entry.image_url && <img src={entry.image_url} alt="" width="48" height="48" />}
                  <div className="cart-item-name"><span>{entry.name}</span><span className="cart-item-unit-price">{formatCurrency(entry.amount)} / {t('item', 'bucată')}</span></div>
                  {!item?.is_available && <span className="checkout-message" role="alert">{t('This item is currently unavailable. Remove it before checkout.', 'Acest produs nu este disponibil momentan. Elimină-l înainte de a continua.')}</span>}
                  <div className="cart-item-controls">
                    <button className="cart-qty-btn" aria-label={`${t('Decrease quantity', 'Scade cantitatea')}: ${entry.name}`} onClick={() => setQuantities(previous => ({ ...previous, [entry.id]: Math.max(0, entry.qty - 1) }))}>−</button>
                    <span className="cart-qty">{entry.qty}</span>
                    <button className="cart-qty-btn" aria-label={`${t('Increase quantity', 'Crește cantitatea')}: ${entry.name}`} disabled={!item?.is_available} onClick={() => item && changeQuantity(item, 1)}>+</button>
                  </div>
                  <span className="cart-item-subtotal">{formatCurrency(entry.amount * entry.qty)}</span>
                  <button className="cart-remove-btn" aria-label={`${t('Remove', 'Elimină')}: ${entry.name}`} onClick={() => setQuantities(previous => ({ ...previous, [entry.id]: 0 }))}>✕</button>
                </li>
              })}
            </ul>
            <div className="cart-panel-footer">
              <div className="cart-grand-total"><span>{t('Subtotal estimate', 'Subtotal estimativ')}</span><span className="cart-total-amount">{formatCurrency(grandTotal)}</span></div>
              <div className="checkout-action">
                <button className="btn-checkout-full" disabled={hasUnavailableCartItems} onClick={handleCheckout}>{t('Proceed to checkout', 'Finalizează comanda')} →</button>
                {checkoutError && <p className="checkout-message" role="alert">{t('Please sign in before placing an order.', 'Autentifică-te înainte de a plasa o comandă.')}</p>}
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="menu-skeleton" role="status">{t('Loading menu...', 'Se încarcă meniul...')}<div /><div /><div /></div>
        ) : error ? (
          <div className="menu-message" role="alert"><p>{t('Could not load the menu.', 'Meniul nu a putut fi încărcat.')}</p><button className="btn-outline" onClick={() => { setLoading(true); setReload(value => value + 1) }}>{t('Try again', 'Încearcă din nou')}</button></div>
        ) : (
          <>
            <div className="menu-filters">
              <label htmlFor="menu-search">{t('Search menu', 'Caută în meniu')}</label>
              <input id="menu-search" type="search" value={search} onChange={event => setSearch(event.target.value)} />
              <label htmlFor="menu-category-filter">{t('Category', 'Categorie')}</label>
              <select id="menu-category-filter" value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                <option value="all">{t('All categories', 'Toate categoriile')}</option>
                {categories.map(category => <option key={category.id} value={category.id}>{localized(language, category.category_name_en, category.category_name_ro)}</option>)}
              </select>
            </div>
            {featured.length > 0 && <section className="menu-section"><h2 className="menu-category">{t('Featured', 'Recomandări')}</h2><div className="product-grid">{featured.map(productCard)}</div></section>}
            {matchingItems.length === 0 && (search.trim() || categories.length === 0) && <p className="menu-message">{t('No products found.', 'Nu am găsit produse.')}</p>}
                {categories.map(category => {
                  const categoryItems = matchingItems.filter(item => item.category_id === category.id)
                  if (categoryId !== 'all' && categoryId !== category.id) return null
                  if (!categoryItems.length && search.trim()) return null
                  return <section className="menu-section" key={category.id}>
                    <h2 className="menu-category">{localized(language, category.category_name_en, category.category_name_ro)}</h2>
                    <CategoryImage url={category.image_url} name={localized(language, category.category_name_en, category.category_name_ro)} />
                    <p>{localized(language, category.description_en, category.description_ro)}</p>
                    {categoryItems.length ? <div className="product-grid">{categoryItems.map(productCard)}</div> : <p>{t('No products in this category.', 'Nu există produse în această categorie.')}</p>}
                  </section>
                })}
                {matchingItems.some(item => !item.category_id) && <section className="menu-section"><h2 className="menu-category">{t('Other', 'Altele')}</h2><div className="product-grid">{matchingItems.filter(item => !item.category_id).map(productCard)}</div></section>}
          </>
        )}
      </main>
      {selected && <div className="product-modal-overlay" onClick={event => { if (event.target === event.currentTarget) setSelected(null) }}>
        <div className="product-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="product-title">
          <button className="product-modal-close" onClick={() => setSelected(null)} aria-label={t('Close', 'Închide')}>✕</button>
          <ProductImage url={selected.image_url} name={nameOf(selected)} />
          <h2 id="product-title">{nameOf(selected)}</h2>
          <p>{localized(language, selected.description_en, selected.description_ro)}</p>
          {localized(language, selected.ingredients_en, selected.ingredients_ro) && <p><strong>{t('Ingredients', 'Ingrediente')}:</strong> {localized(language, selected.ingredients_en, selected.ingredients_ro)}</p>}
          {selected.portion && <p><strong>{t('Portion', 'Porție')}:</strong> {selected.portion}</p>}
          <div className="product-card-actions"><strong>{formatCurrency(selected.price)}</strong><button className="menu-btn-cart" disabled={!selected.is_available} onClick={() => changeQuantity(selected, 1)}>{selected.is_available ? t('+ Cart', '+ Coș') : t('Unavailable', 'Indisponibil')}</button></div>
        </div>
      </div>}
      {showCheckout && <CheckoutModal cart={cart} grandTotal={grandTotal} onClose={() => setShowCheckout(false)} onSuccess={() => setQuantities({})} />}
      {authMode && <AuthModal
        initialMode={authMode}
        onClose={() => { setAuthMode(null); setContinueToCheckout(false) }}
        onSuccess={() => {
          setAuthMode(null)
          setCheckoutError(false)
          if (continueToCheckout) setShowCheckout(true)
          setContinueToCheckout(false)
        }}
      />}
    </>
  )
}
