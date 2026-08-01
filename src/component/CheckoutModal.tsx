import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './CheckoutModal.css'
import { supabase } from '../lib/supabase';

interface CartEntry { id: string; name: string; qty: number; amount: number }

interface CheckoutModalProps {
  cart: CartEntry[]
  grandTotal: number
  onClose: () => void
  onSuccess: () => void
}

interface CartEntry {
  id: string;
  name: string;
  qty: number;
  amount: number;
}

type Step = 'details' | 'payment' | 'confirm'
type CardType = 'visa' | 'mastercard' | ''

function formatCardNumber(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits
}

export default function CheckoutModal({ cart, grandTotal, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('details')

  const [details, setDetails] = useState({ name: '', email: '', phone: '', order_type: '' })
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({})

  const [cardType, setCardType] = useState<CardType>('')
  const [payment, setPayment] = useState({ holder: '', number: '', expiry: '', cvv: '' })
  const [showCvv, setShowCvv] = useState(false)
  const [payErrors, setPayErrors] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState(false)
  const [orderId, setOrderId] = useState<string>('')

  useEffect(() => {
    async function prefillFromSession() {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser()

      if (error || !user) return

      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        ''

      setDetails((prev) => ({
        ...prev,
        name: prev.name || fullName,
        email: prev.email || user.email || ''
      }))
    }

    prefillFromSession()
  }, [])

  // ── Validation ──
  function validateDetails() {
    const e: Record<string, string> = {}
    if (!details.name.trim()) e.name = 'Full name is required'
    if (!details.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(details.email)) e.email = 'Enter a valid email'
    if (!details.phone) e.phone = 'Phone number is required'
    else if (!/^\d{10}$/.test(details.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit number'
    if (!details.order_type.trim()) e.order_type = 'Order type is required'
    return e
  }

  function validatePayment() {
    const e: Record<string, string> = {}
    if (!cardType) e.cardType = 'Please select a card type'
    if (!payment.holder.trim()) e.holder = 'Card holder name is required'
    const digits = payment.number.replace(/\s/g, '')
    if (!digits) e.number = 'Card number is required'
    else if (digits.length < 16) e.number = 'Enter a valid 16-digit card number'
    if (!payment.expiry) e.expiry = 'Expiry date is required'
    else if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) e.expiry = 'Use MM/YY format'
    if (!payment.cvv) e.cvv = 'CVV is required'
    else if (payment.cvv.length < 3) e.cvv = 'Enter 3-digit CVV'
    return e
  }

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateDetails()
    setDetailsErrors(errs)
    if (Object.keys(errs).length === 0) setStep('payment')
  }

  const stepLabels: { key: Step; label: string }[] = [
    { key: 'details', label: 'Your Details' },
    { key: 'payment', label: 'Payment' },
    { key: 'confirm', label: 'Confirmation' },
  ]



  async function orderSave() {
  const invalidItems = cart.filter(item => !item.id);
  if (invalidItems.length > 0) {
    console.error("Missing item IDs:", invalidItems);
    throw new Error("Some cart items do not have item IDs.");
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("Failed to get current user:", authError)
    throw authError
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      customer_name: details.name,
      email: details.email,
      phone: details.phone,
      order_type: details.order_type,
      total_value: grandTotal,
      payment_status: true
    })
    .select("order_id")
    .single();


  if (orderError) {
    console.error("Order save error:", orderError);
    throw orderError;
  }

  const orderItems = cart.map((item) => ({
    order_id: order.order_id,
    item_id: item.id,          // must exist
    item_name: item.name,
    quantity: item.qty
  }));

  const { error: itemError } = await supabase
    .from("order_items")
    .insert(orderItems);


  if (itemError) {
    console.error("Order items save error:", itemError);
    throw itemError;
  }
  setOrderId(order.order_id);
}
async function handlePaySubmit(e: React.FormEvent) {
  e.preventDefault();

  const errs = validatePayment();
  setPayErrors(errs);

  if (Object.keys(errs).length > 0) return;

  try {
    setProcessing(true);

    await orderSave();

    setProcessing(false);
    setStep("confirm");
  } catch (err) {
    console.error(err);
    setProcessing(false);
    alert("Failed to save order.");
  }
}

  const stepIndex = { details: 0, payment: 1, confirm: 2 }

  const modal = (
    <div className="co-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="co-modal" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="co-header">
          <div className="co-logo">☕ <span>Checkout</span></div>
          {step !== 'confirm' && (
            <button className="co-close" onClick={onClose} aria-label="Close">✕</button>
          )}
        </div>

        {/* Step indicator */}
        <div className="co-steps">
          {stepLabels.map((s, i) => (
            <div key={s.key} className={`co-step ${stepIndex[step] >= i ? 'done' : ''} ${step === s.key ? 'active' : ''}`}>
              <div className="co-step-dot">{stepIndex[step] > i ? '✓' : i + 1}</div>
              <span>{s.label}</span>
              {i < stepLabels.length - 1 && <div className="co-step-line" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Details ── */}
        {step === 'details' && (
          <div className="co-body">
            {/* Order summary */}
            <div className="co-summary">
              <h3 className="co-section-title">Order Summary</h3>
              <ul className="co-order-list">
                {cart.map((item) => (
                  <li key={item.name} className="co-order-item">
                    <span></span>
                    <span>{item.name} <em>×{item.qty}</em></span>
                    <span>₹{item.amount * item.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="co-order-total">
                <span>Total</span><span>₹{grandTotal}</span>
              </div>
            </div>

            <form className="co-form" onSubmit={handleDetailsNext} noValidate>
              <h3 className="co-section-title">Delivery Details</h3>

              <div className="co-row">
                <div className="co-field">
                  <label htmlFor="co-name">Name</label>
                  <input id="co-name" type="text" placeholder="Your full name" autoComplete="name"
                    value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    className={detailsErrors.name ? 'err' : ''} />
                  {detailsErrors.name && <span className="co-err">{detailsErrors.name}</span>}
                </div>
                <div className="co-field">
                  <label htmlFor="co-phone">Phone</label>
                  <input id="co-phone" type="tel" placeholder="10-digit number" autoComplete="tel"
                    value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                    className={detailsErrors.phone ? 'err' : ''} />
                  {detailsErrors.phone && <span className="co-err">{detailsErrors.phone}</span>}
                </div>
              </div>

              <div className="co-field">
                <label htmlFor="co-email">Email</label>
                <input id="co-email" type="email" placeholder="your@email.com" autoComplete="email"
                  value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })}
                  className={detailsErrors.email ? 'err' : ''} />
                {detailsErrors.email && <span className="co-err">{detailsErrors.email}</span>}
              </div>

              <div className="co-field">
                <label>Order Type</label>

                <div className="order-type-container">
                  <div
                    className={`order-type-card ${details.order_type === 'Takeaway' ? 'active' : ''}`}
                    onClick={() => setDetails({ ...details, order_type: 'Takeaway' })}
                  >
                    <span className="order-type-icon">🍱</span>
                    <h4>Takeaway</h4>
                    <p>Pick up your order from the restaurant.</p>
                  </div>

                  <div
                    className={`order-type-card ${details.order_type === 'Dine In' ? 'active' : ''}`}
                    onClick={() => setDetails({ ...details, order_type: 'Dine In' })}
                  >
                    <span className="order-type-icon">🍽️</span>
                    <h4>Dine In</h4>
                    <p>Enjoy your meal at the restaurant.</p>
                  </div>
                </div>

                {detailsErrors.order_type && (
                  <span className="co-err">{detailsErrors.order_type}</span>
                )}
              </div>

              <button type="submit" className="co-submit" >Continue to Payment →</button>
            </form>
          </div>
        )}

        {/* ── Step 2: Payment ── */}
        {step === 'payment' && (
          <div className="co-body">
            <div className="co-pay-total-bar">
              <span>Amount to pay</span>
              <span className="co-pay-amount">₹{grandTotal}</span>
            </div>

            <form className="co-form" onSubmit={handlePaySubmit} noValidate>
              <h3 className="co-section-title">Select Card Type</h3>

              {payErrors.cardType && <span className="co-err">{payErrors.cardType}</span>}
              <div className="co-card-types">
                <button type="button"
                  className={`co-card-option ${cardType === 'visa' ? 'selected' : ''}`}
                  onClick={() => setCardType('visa')}>
                  <div className="co-card-logo visa-logo">
                    <span className="visa-text">VISA</span>
                  </div>
                  <span>Visa</span>
                </button>
                <button type="button"
                  className={`co-card-option ${cardType === 'mastercard' ? 'selected' : ''}`}
                  onClick={() => setCardType('mastercard')}>
                  <div className="co-card-logo mc-logo">
                    <span className="mc-circle mc-left" />
                    <span className="mc-circle mc-right" />
                  </div>
                  <span>Mastercard</span>
                </button>
              </div>

              {/* Card preview */}
              {cardType && (
                <div className={`co-card-preview ${cardType}`}>
                  <div className="cp-top">
                    <span className="cp-chip">▬</span>
                    {cardType === 'visa'
                      ? <span className="cp-brand visa-text-sm">VISA</span>
                      : <div className="cp-mc-circles"><span /><span /></div>
                    }
                  </div>
                  <div className="cp-number">
                    {payment.number || '•••• •••• •••• ••••'}
                  </div>
                  <div className="cp-bottom">
                    <div>
                      <div className="cp-label">Card Holder</div>
                      <div className="cp-value">{payment.holder || 'YOUR NAME'}</div>
                    </div>
                    <div>
                      <div className="cp-label">Expires</div>
                      <div className="cp-value">{payment.expiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>
              )}

              <h3 className="co-section-title" style={{ marginTop: '24px' }}>Card Details</h3>

              <div className="co-field">
                <label htmlFor="co-holder">Card Holder Name</label>
                <input id="co-holder" type="text" placeholder="Name on card" autoComplete="cc-name"
                  value={payment.holder}
                  onChange={(e) => setPayment({ ...payment, holder: e.target.value.toUpperCase() })}
                  className={payErrors.holder ? 'err' : ''} />
                {payErrors.holder && <span className="co-err">{payErrors.holder}</span>}
              </div>

              <div className="co-field">
                <label htmlFor="co-number">Card Number</label>
                <input id="co-number" type="text" placeholder="0000 0000 0000 0000"
                  inputMode="numeric" autoComplete="cc-number"
                  value={payment.number}
                  onChange={(e) => setPayment({ ...payment, number: formatCardNumber(e.target.value) })}
                  className={payErrors.number ? 'err' : ''} />
                {payErrors.number && <span className="co-err">{payErrors.number}</span>}
              </div>

              <div className="co-row">
                <div className="co-field">
                  <label htmlFor="co-expiry">Expiry Date</label>
                  <input id="co-expiry" type="text" placeholder="MM/YY"
                    inputMode="numeric" autoComplete="cc-exp"
                    value={payment.expiry}
                    onChange={(e) => setPayment({ ...payment, expiry: formatExpiry(e.target.value) })}
                    className={payErrors.expiry ? 'err' : ''} />
                  {payErrors.expiry && <span className="co-err">{payErrors.expiry}</span>}
                </div>
                <div className="co-field">
                  <label htmlFor="co-cvv">
                    CVV
                    <button type="button" className="co-toggle-cvv"
                      onClick={() => setShowCvv(!showCvv)}>
                      {showCvv ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  <input id="co-cvv" type={showCvv ? 'text' : 'password'}
                    placeholder="•••" inputMode="numeric" autoComplete="cc-csc" maxLength={3}
                    value={payment.cvv}
                    onChange={(e) => setPayment({ ...payment, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    className={payErrors.cvv ? 'err' : ''} />
                  {payErrors.cvv && <span className="co-err">{payErrors.cvv}</span>}
                </div>
              </div>

              <div className="co-secure-note">
                🔒 Your payment details are encrypted and secure
              </div>

              <div className="co-btn-row">
                <button type="button" className="co-back" onClick={() => setStep('details')}>← Back</button>
                <button type="submit" className="co-submit" disabled={processing} >
                  {processing ? <span className="co-spinner" /> : `Pay ₹${grandTotal}`} 
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === 'confirm' && (
          <div className="co-body co-confirm">
            <div className="co-success-icon">✓</div>
            <h2>Order Placed!</h2>
            <p>Thank you, <strong>{details.name}</strong>. Your order is confirmed.</p>
            <div className="co-order-ref">
              <span>Order ID</span>
              <span className="co-order-id">{orderId}</span>
            </div>
            <div className="co-confirm-summary">
              {cart.map((item) => (
                <div key={item.name} className="co-confirm-item">
                  <span>{item.name} ×{item.qty}</span>
                  <span>₹{item.amount * item.qty}</span>
                </div>
              ))}
              <div className="co-confirm-total">
                <span>Total Paid</span><span>₹{grandTotal}</span>
              </div>
            </div>
            <p className="co-confirm-note">
              A confirmation will be sent to <strong>{details.email}</strong>
            </p>
            <button className="co-submit" onClick={() => { onSuccess(); onClose() }}>
              Back to Menu
            </button>
          </div>
        )}

      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
