import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency } from '../lib/currency'
import { createSecureOrder, getCreatedOrderReference, type OrderType, type SpiceLevel } from '../lib/orders'
import { SpiceSelector } from './SpiceLevel'
import { useLanguage } from '../lib/language'
import { supabase } from '../lib/supabase'
import './CheckoutModal.css'

interface CartEntry {
  id: string
  name: string
  qty: number
  amount: number
  image_url?: string | null
}

interface CheckoutModalProps {
  cart: CartEntry[]
  grandTotal: number
  onClose: () => void
  onSuccess: () => void
}

type CustomerOrderType = Exclude<OrderType, 'Dine In'>

export default function CheckoutModal({ cart, grandTotal, onClose, onSuccess }: CheckoutModalProps) {
  const { t, language } = useLanguage()
  const [details, setDetails] = useState({
    name: '',
    email: '',
    phone: '',
    orderType: '' as CustomerOrderType | '',
    pickupMode: 'asap' as 'asap' | 'scheduled',
    pickupTime: '',
    deliveryAddress: '',
    deliveryInstructions: '',
    notes: '',
  })
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [orderReference, setOrderReference] = useState('')
  const [created, setCreated] = useState(false)
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('medium')

  useEffect(() => {
    async function prefillFromSession() {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Failed to prefill checkout details:', error)
        return
      }
      if (!user) return
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || ''
      setDetails(previous => ({
        ...previous,
        name: previous.name || fullName,
        phone: previous.phone || user.phone || '',
        email: previous.email || user.email || '',
      }))
    }
    void prefillFromSession()
  }, [])

  function getErrorMessage(reason: unknown) {
    const message = reason instanceof Error ? reason.message.toLowerCase() : ''
    if (message.includes('not authenticated') || message.includes('jwt') || message.includes('permission')) {
      return t('Please sign in again before placing your order.', 'Autentifică-te din nou înainte de a plasa comanda.')
    }
    if (message.includes('unavailable') || message.includes('price') || message.includes('menu item')) {
      return t('A menu item is unavailable or has changed price. Please review your cart and try again.', 'Un produs nu mai este disponibil sau și-a schimbat prețul. Verifică coșul și încearcă din nou.')
    }
    return t('We could not create your order. Please review your details and try again.', 'Comanda nu a putut fi creată. Verifică datele și încearcă din nou.')
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setError(t('Location is not supported by this browser.', 'Acest browser nu permite accesul la locație.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationCoords({ lat: coords.latitude, lng: coords.longitude })
        setError('')
      },
      () => setError(t('Unable to get your location. You can enter the address manually.', 'Locația nu a putut fi preluată. Poți introduce adresa manual.')),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (processing) return
    setError('')

    if (!cart.length || cart.some(item => !item.id || !Number.isInteger(item.qty) || item.qty < 1)) {
      setError(t('Your cart contains no valid items. Please review it.', 'Coșul nu conține produse valide. Verifică-l, te rog.'))
      return
    }
    if (!details.name.trim() || !details.phone.trim() || !details.orderType) {
      setError(t('Name, phone number and order type are required.', 'Numele, numărul de telefon și tipul comenzii sunt obligatorii.'))
      return
    }
    if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      setError(t('Enter a valid email address.', 'Introdu o adresă de e-mail validă.'))
      return
    }
    if (details.orderType === 'Pickup' && details.pickupMode === 'scheduled') {
      const pickupDate = new Date(details.pickupTime)
      if (!details.pickupTime || !Number.isFinite(pickupDate.getTime()) || pickupDate.getTime() <= Date.now()) {
        setError(t('Choose a valid future pickup time.', 'Alege o oră de ridicare validă, în viitor.'))
        return
      }
    }
    if (details.orderType === 'Delivery' && !details.deliveryAddress.trim()) {
      setError(t('A delivery address is required.', 'Adresa de livrare este obligatorie.'))
      return
    }

    setProcessing(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        setError(t('Please sign in before placing your order.', 'Autentifică-te înainte de a plasa comanda.'))
        return
      }

      const result = await createSecureOrder({
        order_type: details.orderType,
        spice_level: spiceLevel,
        customer_name: details.name.trim(),
        phone: details.phone.trim(),
        email: details.email.trim() || null,
        items: cart.map(item => ({
          item_id: item.id,
          quantity: item.qty,
          selected_options: [],
          ...(itemNotes[item.id]?.trim() ? { item_notes: itemNotes[item.id].trim() } : {}),
        })),
        ...(details.notes.trim() ? { notes: details.notes.trim() } : {}),
        ...(details.orderType === 'Pickup' ? {
          pickup_mode: details.pickupMode,
          pickup_time: details.pickupMode === 'scheduled' ? new Date(details.pickupTime).toISOString() : null,
        } : {}),
        ...(details.orderType === 'Delivery' ? {
          delivery_address: details.deliveryAddress.trim(),
          delivery_instructions: details.deliveryInstructions.trim(),
          ...(locationCoords ? {
            delivery_latitude: locationCoords.lat,
            delivery_longitude: locationCoords.lng,
          } : {}),
        } : {}),
      })
      setOrderReference(getCreatedOrderReference(result))
      setCreated(true)
      onSuccess()
    } catch (reason) {
      console.error('Failed to create order:', reason)
      setError(getErrorMessage(reason))
    } finally {
      setProcessing(false)
    }
  }

  const modal = (
    <div className="co-overlay" onClick={event => event.target === event.currentTarget && !processing && onClose()}>
      <div className="co-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" lang={language}>
        <div className="co-header">
          <div className="co-logo">☕ <span id="checkout-title">{t('Checkout', 'Finalizare comandă')}</span></div>
          <button type="button" className="co-close" onClick={onClose} disabled={processing} aria-label={t('Close', 'Închide')}>✕</button>
        </div>
        {created ? (
          <div className="co-body co-confirm">
            <div className="co-success-icon">✓</div>
            <h2>{t('Order placed!', 'Comanda a fost plasată!')}</h2>
            <p>{t('Thank you. Your order is awaiting confirmation.', 'Îți mulțumim. Comanda ta așteaptă confirmarea.')}</p>
            {orderReference && <p className="co-order-ref">{t('Order number', 'Număr comandă')}: {orderReference}</p>}
            <button type="button" className="co-submit" onClick={onClose}>{t('Back to menu', 'Înapoi la meniu')}</button>
          </div>
        ) : (
          <div className="co-body">
            <div className="co-summary">
              <h3 className="co-section-title">{t('Order summary', 'Sumarul comenzii')}</h3>
              <ul className="co-order-list">
                {cart.map(item => (
                  <li key={item.id} className="co-order-item">
                    {item.image_url && <img src={item.image_url} alt="" width="44" height="44" />}
                    <span>{item.name} <em>×{item.qty}</em></span>
                    <span>{formatCurrency(item.amount * item.qty)}</span>
                    <label>
                      {t('Item notes (optional)', 'Note pentru produs (opțional)')}
                      <input maxLength={200} value={itemNotes[item.id] ?? ''} onChange={event => setItemNotes({ ...itemNotes, [item.id]: event.target.value })} />
                    </label>
                  </li>
                ))}
              </ul>
              <div className="co-order-total">
                <span>{t('Subtotal (estimate)', 'Subtotal estimativ')}</span><span>{formatCurrency(grandTotal)}</span>
              </div>
              <SpiceSelector value={spiceLevel} onChange={setSpiceLevel} />
            </div>
            <form className="co-form" onSubmit={handleSubmit}>
              <h3 className="co-section-title">{t('Contact details', 'Date de contact')}</h3>
              <div className="co-field">
                <label htmlFor="co-name">{t('Full name', 'Nume complet')}</label>
                <input id="co-name" autoComplete="name" required value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} />
              </div>
              <div className="co-row">
                <div className="co-field">
                  <label htmlFor="co-phone">{t('Phone number', 'Număr de telefon')}</label>
                  <input id="co-phone" type="tel" autoComplete="tel" required value={details.phone} onChange={event => setDetails({ ...details, phone: event.target.value })} />
                </div>
                <div className="co-field">
                  <label htmlFor="co-email">{t('Email (optional)', 'E-mail (opțional)')}</label>
                  <input id="co-email" type="email" autoComplete="email" value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} />
                </div>
              </div>
              <div className="co-field">
                <label htmlFor="co-order-type">{t('Order type', 'Tipul comenzii')}</label>
                <select id="co-order-type" required value={details.orderType} onChange={event => setDetails({ ...details, orderType: event.target.value as CustomerOrderType | '' })}>
                  <option value="">{t('Select an order type', 'Selectează tipul comenzii')}</option>
                  <option value="Takeaway">{t('Takeaway', 'La pachet')}</option>
                  <option value="Pickup">{t('Pickup', 'Ridicare')}</option>
                  <option value="Delivery">{t('Delivery', 'Livrare')}</option>
                </select>
              </div>
              {details.orderType === 'Pickup' && (
                <>
                  <div className="co-field">
                    <label htmlFor="co-pickup-mode">{t('Pickup time', 'Ora ridicării')}</label>
                    <select id="co-pickup-mode" value={details.pickupMode} onChange={event => setDetails({ ...details, pickupMode: event.target.value as 'asap' | 'scheduled' })}>
                      <option value="asap">{t('As soon as possible', 'Cât mai curând')}</option>
                      <option value="scheduled">{t('Schedule pickup', 'Programează ridicarea')}</option>
                    </select>
                  </div>
                  {details.pickupMode === 'scheduled' && (
                    <div className="co-field">
                      <label htmlFor="co-pickup-time">{t('Scheduled date and time', 'Data și ora programată')}</label>
                      <input id="co-pickup-time" type="datetime-local" required value={details.pickupTime} onChange={event => setDetails({ ...details, pickupTime: event.target.value })} />
                    </div>
                  )}
                </>
              )}
              {details.orderType === 'Delivery' && (
                <>
                  <div className="co-field">
                    <label htmlFor="co-address">{t('Delivery address', 'Adresa de livrare')}</label>
                    <textarea id="co-address" required value={details.deliveryAddress} onChange={event => setDetails({ ...details, deliveryAddress: event.target.value })} />
                    <button type="button" className="co-location-btn" onClick={handleUseCurrentLocation}>{t('Use current location', 'Folosește locația curentă')}</button>
                    {locationCoords && <span>{t('Location added', 'Locație adăugată')}</span>}
                    {locationCoords && <div className="co-map-preview">
                      <iframe
                        title={t('Selected delivery location', 'Locația de livrare selectată')}
                        src={`https://maps.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}&z=16&output=embed`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>}
                  </div>
                  <div className="co-field">
                    <label htmlFor="co-instructions">{t('Delivery instructions (optional)', 'Instrucțiuni de livrare (opțional)')}</label>
                    <textarea id="co-instructions" value={details.deliveryInstructions} onChange={event => setDetails({ ...details, deliveryInstructions: event.target.value })} />
                  </div>
                </>
              )}
              <div className="co-field">
                <label htmlFor="co-notes">{t('Order notes (optional)', 'Note pentru comandă (opțional)')}</label>
                <textarea id="co-notes" value={details.notes} onChange={event => setDetails({ ...details, notes: event.target.value })} />
              </div>
              <p>{t('Payment is not collected online. Payment status will remain pending.', 'Plata nu se efectuează online. Statusul plății va rămâne în așteptare.')}</p>
              {error && <p className="co-err" role="alert">{error}</p>}
              <button type="submit" className="co-submit" disabled={processing || cart.length === 0}>
                {processing ? t('Placing order…', 'Se plasează comanda…') : t('Place order', 'Plasează comanda')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
