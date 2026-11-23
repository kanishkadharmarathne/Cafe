import { useEffect, useState } from 'react'
import { formatCurrency } from '../lib/currency'
import { localized, useLanguage } from '../lib/language'
import { fetchOrderAdditions, type OrderAddition } from '../lib/additions'
import { SpiceBadge } from './SpiceLevel'
import OrderStatusTimeline, { type StatusHistory } from '../app/admin/OrderStatusTimeline'
import './OrderAdditions.css'

interface OrderAdditionsProps {
  orderId: string | number
}

export default function OrderAdditions({ orderId }: OrderAdditionsProps) {
  const { t } = useLanguage()
  const [additions, setAdditions] = useState<OrderAddition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await fetchOrderAdditions(orderId)
        if (active) {
          setAdditions(data)
          setError(false)
        }
      } catch (err) {
        console.error('Failed to fetch order additions:', err)
        if (active) {
          setError(true)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [orderId])

  if (loading) {
    return <div className="admin-loading-text">{t('Loading additions…', 'Se încarcă adăugările…')}</div>
  }

  if (error) {
    return <p role="alert" className="admin-error">{t('Could not load additions history.', 'Istoricul adăugărilor nu a putut fi încărcat.')}</p>
  }

  return <AdditionHistory additions={additions} />
}

export function AdditionHistory({ additions }: { additions: OrderAddition[] }) {
  const { language, t } = useLanguage()

  if (additions.length === 0) {
    return <p className="admin-empty">{t('No additions yet.', 'Nu există adăugări.')}</p>
  }

  function displayAdditionStatus(value: string) {
    const labels: Record<string, [string, string]> = {
      draft: ['Draft', 'Schiță'],
      submitted: ['Submitted', 'Trimisă'],
      preparing: ['Preparing', 'În pregătire'],
      ready: ['Ready', 'Gata'],
      completed: ['Completed', 'Finalizată'],
      cancelled: ['Cancelled', 'Anulată'],
    }
    const pair = labels[value.toLowerCase()]
    return pair ? t(pair[0], pair[1]) : value
  }

  return (
    <div className="order-additions">
      <h4 style={{ marginBottom: '12px' }}>{t('Addition History', 'Istoricul adăugărilor')}</h4>
      {additions.map(addition => {
        const recorded = addition.status_history ?? []
        const history: StatusHistory[] = [
          ...recorded.map(entry => ({
            previous_status: entry.old_status,
            new_status: entry.new_status,
            changed_at: entry.changed_at,
            notes: entry.note,
          })),
          ...([
            ['draft', addition.created_at],
            ['submitted', addition.submitted_at],
            ['completed', addition.completed_at],
            ['cancelled', addition.cancelled_at],
          ] as const).flatMap(([status, changedAt]) =>
            changedAt && !recorded.some(entry => entry.new_status === status)
              ? [{ new_status: status, changed_at: changedAt }]
              : []),
        ]
        return <div key={addition.addition_id} className="addition-card" style={{
          marginBottom: '12px',
          padding: '12px',
          background: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <strong style={{ fontSize: '14px' }}>
                {t('Addition', 'Adăugare')} #{addition.addition_number || addition.addition_id}
              </strong>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {addition.created_at && new Date(addition.created_at).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}
              </div>
            </div>
            <span
              className={`status-badge status-${addition.status}`}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                background: addition.status === 'completed' ? '#d4edda' : addition.status === 'cancelled' ? '#f8d7da' : '#e7f3ff',
                color: addition.status === 'completed' ? '#155724' : addition.status === 'cancelled' ? '#721c24' : '#004085',
              }}
            >
              {displayAdditionStatus(addition.status)}
            </span>
          </div>

          {addition.items && addition.items.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ fontSize: '12px' }}>{t('Items', 'Produse')}</strong>:
              <ul style={{ marginTop: '4px', marginLeft: '20px', fontSize: '12px' }}>
                {addition.items.map(item => (
                  <li key={item.id}>
                    {item.quantity} × {localized(language, item.item_name_en, item.item_name_ro) || item.item_name}{' '}
                    <span style={{ color: '#666' }}>({formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.line_total)})</span>
                    {item.spice_level && (
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        <SpiceBadge level={item.spice_level} />
                      </div>
                    )}
                    {item.item_notes && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        {t('Note', 'Notă')}: {item.item_notes}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {addition.notes && (
            <div style={{ marginBottom: '8px', padding: '8px', background: '#fff', borderRadius: '3px', fontSize: '12px' }}>
              <strong>{t('Additional notes', 'Note suplimentare')}</strong>: {addition.notes}
            </div>
          )}

          <h5>{t('Recorded status history', 'Istoricul statusurilor înregistrate')}</h5>
          <OrderStatusTimeline history={history} displayStatus={displayAdditionStatus} />
          <p>{t(
            'Only recorded status changes and available milestone timestamps are shown.',
            'Sunt afișate doar modificările de status înregistrate și datele disponibile ale etapelor.'
          )}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
            <strong>{t('Subtotal', 'Subtotal')}: {formatCurrency(addition.subtotal)}</strong>
            {addition.submitted_at && (
              <span style={{ color: '#666' }}>
                {t('Submitted', 'Trimisă')}: {new Date(addition.submitted_at).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}
              </span>
            )}
          </div>
        </div>
      })}
    </div>
  )
}
