import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency } from '../lib/currency'
import { localized, useLanguage } from '../lib/language'
import {
  createOrderAdditionSecure,
  saveOrderAdditionItemsSecure,
  finalizeOrderAdditionSecure,
  type AdditionItem,
  type OrderAddition,
} from '../lib/additions'
import { fetchPublicMenu, type Category, type MenuItem } from '../lib/menu'
import './CheckoutModal.css'

interface AdditionModalProps {
  orderId: string | number
  orderNumber?: string | number | null
  tableNumber?: string | number | null
  orderTotal: number | string
  onClose: () => void
  onSuccess: () => void
}

function ProductImage({ url, name }: { url: string | null; name: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { t } = useLanguage()
  if (!url || failedUrl === url) {
    return <div className="product-image-placeholder">{t('Image unavailable', 'Imagine indisponibilă')}</div>
  }
  return <img className="product-image" src={url} alt={name} loading="lazy" onError={() => setFailedUrl(url)} />
}

export default function AdditionModal({
  orderId,
  orderNumber,
  tableNumber,
  orderTotal,
  onClose,
  onSuccess,
}: AdditionModalProps) {
  const { language, t } = useLanguage()
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')

  const [addition, setAddition] = useState<OrderAddition | null>(null)
  const [cart, setCart] = useState<Record<string, { quantity: number; spiceLevel: 'low' | 'medium' | 'high'; notes: string }>>({})
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [draftCreated, setDraftCreated] = useState(false)

  useEffect(() => {
    let active = true
    fetchPublicMenu()
      .then(({ categories, items }) => {
        if (!active) return
        setCategories(categories)
        setItems(items)
        setError('')
        setLoading(false)
      })
      .catch((err: unknown) => {
        console.error('Failed to load menu:', err)
        if (active) {
          setError(t('Could not load menu items. Try again later.', 'Produsele nu au putut fi încărcate. Încearcă din nou mai târziu.'))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [t])

  const filteredItems = useMemo(() => {
    let result = items
    if (categoryId !== 'all') {
      result = result.filter(item => item.category_id === categoryId)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(item =>
        (item.item_name_en?.toLowerCase().includes(q) ||
          item.item_name_ro?.toLowerCase().includes(q) ||
          item.description_en?.toLowerCase().includes(q) ||
          item.description_ro?.toLowerCase().includes(q))
      )
    }
    return result
  }, [items, categoryId, search])

  const cartSubtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [itemId, { quantity }]) => {
      const item = items.find(i => i.id === itemId)
      return sum + (item ? item.price * quantity : 0)
    }, 0)
  }, [cart, items])

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([itemId, { quantity, spiceLevel, notes: itemNotes }]) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return null
        return {
          itemId,
          item,
          quantity,
          spiceLevel,
          notes: itemNotes,
        }
      })
      .filter((item) => item !== null) as Array<{
        itemId: string
        item: MenuItem
        quantity: number
        spiceLevel: 'low' | 'medium' | 'high'
        notes: string
      }>
  }, [cart, items])

  async function initiateDraft() {
    if (draftCreated || addition) return
    setProcessing(true)
    setError('')
    try {
      const newAddition = await createOrderAdditionSecure(orderId, notes || undefined)
      setAddition(newAddition)
      setDraftCreated(true)
    } catch (err) {
      console.error('Failed to create draft addition:', err)
      setError(t('Could not create addition draft. Try again.', 'Schița adăugirii nu a putut fi creată. Încearcă din nou.'))
    } finally {
      setProcessing(false)
    }
  }

  async function handleAddItem(item: MenuItem) {
    if (!draftCreated && !addition) {
      await initiateDraft()
    }
    setCart(prev => ({
      ...prev,
      [item.id]: {
        quantity: (prev[item.id]?.quantity ?? 0) + 1,
        spiceLevel: prev[item.id]?.spiceLevel ?? 'medium',
        notes: prev[item.id]?.notes ?? '',
      },
    }))
  }

  function handleRemoveItem(itemId: string) {
    setCart(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
  }

  function handleQuantityChange(itemId: string, quantity: number) {
    if (quantity < 1) {
      handleRemoveItem(itemId)
      return
    }
    setCart(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity },
    }))
  }

  async function handleFinalize() {
    if (!addition) {
      setError(t('No draft addition found.', 'Nu a fost găsit niciun draft.'))
      return
    }

    if (cartItems.length === 0) {
      setError(t('Addition cart is empty. Add items before finalizing.', 'Coșul adăugirii este gol. Adaugă produse înainte de finalizare.'))
      return
    }

    setProcessing(true)
    setError('')
    try {
      const itemsToSave: AdditionItem[] = cartItems.map(cartItem => ({
        item_id: cartItem.itemId,
        quantity: cartItem.quantity,
        spice_level: cartItem.spiceLevel,
        ...(cartItem.notes ? { item_notes: cartItem.notes } : {}),
        selected_options: [],
      }))

      await saveOrderAdditionItemsSecure(addition.addition_id, itemsToSave)
      await finalizeOrderAdditionSecure(addition.addition_id)

      setConfirmOpen(false)
      onSuccess()
    } catch (err) {
      console.error('Failed to finalize addition:', err)
      setError(t('Could not finalize addition. Try again.', 'Adăugirea nu a putut fi finalizată. Încearcă din nou.'))
    } finally {
      setProcessing(false)
    }
  }

  return createPortal(
    <div className="admin-modal-overlay">
      <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="addition-modal-title">
        <button
          className="admin-modal-close"
          onClick={onClose}
          disabled={processing}
          aria-label={t('Close', 'Închide')}
        >
          ✕
        </button>

        <h2 className="admin-form-heading" id="addition-modal-title">
          {t('Add Items to Order', 'Adaugă produse la comandă')}
        </h2>

        {/* Order Info */}
        <div className="co-order-summary">
          <div>
            <strong>{t('Order', 'Comanda')}</strong>: TOC-{orderNumber}
          </div>
          {tableNumber && (
            <div>
              <strong>{t('Table', 'Masă')}</strong>: {tableNumber}
            </div>
          )}
          <div>
            <strong>{t('Current total', 'Total curent')}</strong>: {formatCurrency(orderTotal)}
          </div>
        </div>

        {error && <p role="alert" className="admin-error">{error}</p>}

        {/* Menu browser */}
        {!confirmOpen && (
          <>
            <div className="admin-form-group">
              <label htmlFor="addition-search">{t('Search items', 'Caută produse')}</label>
              <input
                id="addition-search"
                type="search"
                placeholder={t('Item name or description', 'Nume sau descriere produs')}
                value={search}
                onChange={event => setSearch(event.target.value)}
                disabled={loading || processing}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="addition-category">{t('Category', 'Categorie')}</label>
              <select
                id="addition-category"
                value={categoryId}
                onChange={event => setCategoryId(event.target.value)}
                disabled={loading || processing}
              >
                <option value="all">{t('All categories', 'Toate categoriile')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {localized(language, cat.category_name_en, cat.category_name_ro)}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="admin-loading-text">{t('Loading menu…', 'Se încarcă meniu…')}</div>
            ) : (
              <div className="menu-items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: '150px', background: '#f5f5f5', overflow: 'hidden' }}>
                      <ProductImage url={item.image_url} name={localized(language, item.item_name_en, item.item_name_ro)} />
                    </div>
                    <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                        {localized(language, item.item_name_en, item.item_name_ro)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', flex: 1 }}>
                        {localized(language, item.description_en, item.description_ro)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#c9a87c' }}>
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => void handleAddItem(item)}
                        disabled={processing || !item.is_available}
                      >
                        {item.is_available ? t('Add to addition', 'Adaugă la adăugire') : t('Unavailable', 'Indisponibil')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <p className="admin-empty">{t('No items found.', 'Nu s-au găsit produse.')}</p>
            )}
          </>
        )}

        {/* Addition cart */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ccc' }}>
          <h3 style={{ marginBottom: '12px' }}>
            {t('Addition items', 'Produsele adăugirii')} ({cartItems.length})
          </h3>

          {cartItems.length === 0 ? (
            <p className="admin-empty">{t('No items added yet.', 'Nu au fost adăugate produse.')}</p>
          ) : (
            <>
              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                {cartItems.map(cartItem => (
                  <div
                    key={cartItem.itemId}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: '#f9f9f9',
                      borderRadius: '4px',
                      borderLeft: '3px solid #c9a87c',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>{localized(language, cartItem.item.item_name_en, cartItem.item.item_name_ro)}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(cartItem.itemId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c9a87c',
                          cursor: 'pointer',
                          fontSize: '16px',
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                          {t('Quantity', 'Cantitate')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={cartItem.quantity}
                          onChange={e => handleQuantityChange(cartItem.itemId, parseInt(e.target.value, 10) || 1)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                          {t('Spice level', 'Nivel de iuțeală')}
                        </label>
                        <select
                          value={cartItem.spiceLevel}
                          onChange={e => {
                            const level = e.target.value as 'low' | 'medium' | 'high'
                            setCart(prev => ({
                              ...prev,
                              [cartItem.itemId]: { ...prev[cartItem.itemId], spiceLevel: level },
                            }))
                          }}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                          }}
                        >
                          <option value="low">{t('Low', 'Redus')}</option>
                          <option value="medium">{t('Medium', 'Mediu')}</option>
                          <option value="high">{t('High', 'Ridicat')}</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                        {t('Notes', 'Note')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('Item instructions', 'Instrucțiuni pentru produs')}
                        value={cartItem.notes}
                        onChange={e => {
                          setCart(prev => ({
                            ...prev,
                            [cartItem.itemId]: { ...prev[cartItem.itemId], notes: e.target.value },
                          }))
                        }}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                        }}
                      />
                    </div>

                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatCurrency(cartItem.item.price * cartItem.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                  {t('Additional notes', 'Note suplimentare')}
                </label>
                <textarea
                  placeholder={t('Instructions for the kitchen', 'Instrucțiuni pentru bucătărie')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #ccc' }}>
                <span style={{ fontWeight: 'bold' }}>
                  {t('Addition subtotal', 'Subtotal adăugare')}: {formatCurrency(cartSubtotal)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Confirmation view */}
        {confirmOpen && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '4px' }}>
            <h3 style={{ marginBottom: '12px' }}>{t('Confirm Addition', 'Confirmă adăugarea')}</h3>
            <div style={{ marginBottom: '12px' }}>
              <strong>{t('Order', 'Comanda')}</strong>: TOC-{orderNumber}
            </div>
            {addition && (
              <div style={{ marginBottom: '12px' }}>
                <strong>{t('Addition number', 'Număr adăugare')}</strong>: {addition.addition_number}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <strong>{t('Items', 'Produse')}</strong>:
              <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                {cartItems.map(item => (
                  <li key={item.itemId}>
                    {item.quantity} × {localized(language, item.item.item_name_en, item.item.item_name_ro)} —{' '}
                    {t('Spice', 'Iuțeală')}: {t(item.spiceLevel === 'low' ? 'Low' : item.spiceLevel === 'high' ? 'High' : 'Medium', item.spiceLevel === 'low' ? 'Redus' : item.spiceLevel === 'high' ? 'Ridicat' : 'Mediu')}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
              <strong>{t('Addition subtotal', 'Subtotal adăugare')}</strong>: {formatCurrency(cartSubtotal)}
            </div>
            {notes && (
              <div style={{ marginBottom: '12px', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                <strong>{t('Additional notes', 'Note suplimentare')}</strong>: {notes}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="admin-form-actions" style={{ marginTop: '20px' }}>
          {!confirmOpen ? (
            <>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => setConfirmOpen(true)}
                disabled={processing || cartItems.length === 0}
              >
                {processing ? t('Processing…', 'Se procesează…') : t('Confirm Addition', 'Confirmă adăugarea')}
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={onClose}
                disabled={processing}
              >
                {t('Cancel', 'Anulare')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => void handleFinalize()}
                disabled={processing}
              >
                {processing ? t('Finalizing…', 'Se finalizează…') : t('Send to Kitchen', 'Trimite la bucătărie')}
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={processing}
              >
                {t('Back', 'Înapoi')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
