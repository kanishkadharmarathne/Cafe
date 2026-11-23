import { useCallback, useEffect, useRef, useState } from 'react'
import { localized, useLanguage } from '../../lib/language'
import { SpiceBadge } from '../../component/SpiceLevel'
import { MdRefresh } from 'react-icons/md'
import {
  fetchKitchenAdditions,
  updateOrderAdditionStatusSecure,
  isActiveAdditionStatus,
  nextAdditionStatus,
  type OrderAddition,
  type AdditionStatus,
} from '../../lib/additions'
import './Kitchen.css'

export default function KitchenAdditions() {
  const { language, t } = useLanguage()
  const [additions, setAdditions] = useState<OrderAddition[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [updateError, setUpdateError] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState<Map<string, AdditionStatus>>(new Map())
  const inFlight = useRef(new Map<string, AdditionStatus>())
  const requestId = useRef(0)
  const mounted = useRef(false)

  const refresh = useCallback(async () => {
    const request = ++requestId.current
    try {
      const data = await fetchKitchenAdditions()
      if (mounted.current && request === requestId.current) {
        setAdditions(data)
        setLoadError(false)
      }
    } catch (error) {
      console.error('Failed to load kitchen additions:', error)
      if (mounted.current && request === requestId.current) setLoadError(true)
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    const interval = window.setInterval(() => {
      void refresh()
    }, 30000)
    return () => {
      mounted.current = false
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [refresh])

  async function changeStatus(addition: OrderAddition, next: AdditionStatus) {
    const key = String(addition.addition_id)
    if (inFlight.current.has(key)) return
    if (next === 'completed' && !window.confirm(t('Mark this addition as completed?', 'Marchezi această adăugire ca finalizată?'))) return
    if (next === 'cancelled' && !window.confirm(t('Cancel this addition?', 'Anulezi această adăugire?'))) return
    inFlight.current.set(key, next)
    setSaving(new Map(inFlight.current))
    setSuccess(false)
    setUpdateError(false)
    try {
      await updateOrderAdditionStatusSecure(addition.addition_id, next)
      requestId.current++
      if (mounted.current) {
        setAdditions(current =>
          current.map(item =>
            item.addition_id === addition.addition_id ? { ...item, status: next } : item
          )
        )
        setSuccess(true)
        await refresh()
      }
    } catch (error) {
      console.error('Failed to update addition status:', error)
      if (mounted.current) setUpdateError(true)
    } finally {
      inFlight.current.delete(key)
      if (mounted.current) setSaving(new Map(inFlight.current))
    }
  }

  function displayAdditionStatus(value: string) {
    const labels: Record<string, [string, string]> = {
      submitted: ['Submitted', 'Trimisă'],
      preparing: ['Preparing', 'În pregătire'],
      ready: ['Ready', 'Gata'],
      completed: ['Completed', 'Finalizată'],
      cancelled: ['Cancelled', 'Anulată'],
    }
    const label = labels[value]
    return label ? t(...label) : value
  }

  return (
    <div className="kitchen-section kitchen-additions-section">
      <div className="kitchen-section-heading">
        <div>
          <h2>{t('Additional Items', 'Produse suplimentare')}</h2>
          <p>{t('Separate tickets for order additions', 'Bonuri separate pentru adăugările la comenzi')}</p>
        </div>
        <div className="kitchen-section-controls">
          {!loading && !loadError && <span className="kitchen-count">{additions.length} {t('active', 'active')}</span>}
          <button className="kitchen-refresh" type="button" onClick={() => void refresh()}>
            <MdRefresh aria-hidden="true" /> {t('Refresh additions', 'Actualizează adăugările')}
          </button>
        </div>
      </div>

      {success && (
        <p role="status" className="kitchen-message kitchen-message-success">
          {t('Status updated.', 'Statusul a fost actualizat.')}
        </p>
      )}
      {updateError && (
        <p role="alert" className="kitchen-message kitchen-message-error">
          {t('Status update failed. Refresh to check the addition before trying again.', 'Actualizarea statusului a eșuat. Actualizează lista pentru a verifica adăugarea înainte de a încerca din nou.')}
        </p>
      )}
      {loadError && (
        <p role="alert" className="kitchen-message kitchen-message-error">
          {t('Could not refresh additions. Displayed information may be outdated.', 'Adăugările nu au putut fi actualizate. Informațiile afișate pot fi vechi.')}{' '}
          <button type="button" onClick={() => void refresh()}>
            {t('Retry', 'Reîncearcă')}
          </button>
        </p>
      )}

      {loading ? (
        <p role="status" className="kitchen-empty">{t('Loading additions…', 'Se încarcă adăugările…')}</p>
      ) : additions.length === 0 ? (
        !loadError && <p className="kitchen-empty">{t('No additional items waiting.', 'Nu sunt produse suplimentare în așteptare.')}</p>
      ) : (
        <div className="kitchen-grid">
          {additions.map(addition => {
            const next = nextAdditionStatus(addition.status)
            return (
              <article className="kitchen-card kitchen-addition-card" data-status={addition.status} key={addition.addition_id}>
                <div className="kitchen-card-header">
                  <div>
                    <span className="kitchen-ticket-label">{t('Addition', 'Adăugare')}</span>
                    <h3>#{addition.addition_number || addition.addition_id}</h3>
                  </div>
                  <span className="kitchen-status" data-status={addition.status}>
                    {displayAdditionStatus(addition.status)}
                  </span>
                </div>

                <p className="kitchen-ticket-context">{t('Order', 'Comanda')}: TOC-{addition.order_id}</p>
                {addition.submitted_at && (
                  <p className="kitchen-ticket-meta">
                    <time dateTime={addition.submitted_at}>
                      {new Date(addition.submitted_at).toLocaleString(
                        language === 'ro' ? 'ro-RO' : 'en-GB'
                      )}
                    </time>
                  </p>
                )}

                {addition.items && addition.items.length > 0 && (
                  <>
                  <div className="kitchen-items-label">{t('Items', 'Produse')}</div>
                  <ul className="kitchen-items">
                    {addition.items.map(item => (
                      <li key={item.id}>
                        <div className="kitchen-item-name"><span className="kitchen-quantity">{item.quantity}×</span>
                          <strong>{localized(language, item.item_name_en, item.item_name_ro) || item.item_name}</strong>
                        </div>
                        {item.spice_level && (
                          <div className="kitchen-item-detail">
                            <SpiceBadge level={item.spice_level} />
                          </div>
                        )}
                        {item.item_notes && (
                          <div className="kitchen-item-detail">
                            {t('Item notes', 'Note pentru produs')}: {item.item_notes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  </>
                )}

                {addition.notes && (
                  <p className="kitchen-ticket-notes">
                    <strong>{t('Additional notes', 'Note suplimentare')}</strong>: {addition.notes}
                  </p>
                )}

                <div className="kitchen-card-actions">
                {next && (
                  <button
                    className="kitchen-action"
                    type="button"
                    disabled={saving.has(String(addition.addition_id))}
                    onClick={() => void changeStatus(addition, next)}
                  >
                    {saving.get(String(addition.addition_id)) === next
                      ? t('Updating…', 'Se actualizează…')
                      : `${t('Update status', 'Actualizează statusul')}: ${displayAdditionStatus(next)}`}
                  </button>
                )}

                {isActiveAdditionStatus(addition.status) && (
                  <button
                    className="kitchen-cancel"
                    type="button"
                    disabled={saving.has(String(addition.addition_id))}
                    onClick={() => void changeStatus(addition, 'cancelled')}
                  >
                    {saving.get(String(addition.addition_id)) === 'cancelled'
                      ? t('Cancelling…', 'Se anulează…')
                      : t('Cancel addition', 'Anulează adăugarea')}
                  </button>
                )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
