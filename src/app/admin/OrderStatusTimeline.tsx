import { useLanguage } from '../../lib/language'

export interface StatusHistory {
  previous_status?: string | null
  new_status?: string
  status?: string
  order_status?: string
  changed_at?: string
  created_at?: string
  status_time?: string
  notes?: string | null
}

interface OrderStatusTimelineProps {
  history: StatusHistory[] | null
  displayStatus: (status: string) => string
}

export default function OrderStatusTimeline({ history, displayStatus }: OrderStatusTimelineProps) {
  const { language, t } = useLanguage()
  const events = (history ?? []).map((entry, index) => {
    const changed = entry.changed_at || entry.created_at || entry.status_time
    const timestamp = changed ? Date.parse(changed) : NaN
    return { entry, index, changed, timestamp }
  }).sort((a, b) => {
    const aTime = Number.isFinite(a.timestamp) ? a.timestamp : Infinity
    const bTime = Number.isFinite(b.timestamp) ? b.timestamp : Infinity
    return aTime - bTime || a.index - b.index
  })

  if (!events.length) return <p className="admin-status-history-empty">{t('No status history available.', 'Nu există istoric al statusului.')}</p>

  return <ol className="admin-status-timeline">
    {events.map(({ entry, index, changed, timestamp }) => {
      const status = entry.new_status || entry.order_status || entry.status || ''
      return <li className={`admin-status-event${status.toLowerCase() === 'cancelled' ? ' is-cancelled' : ''}`} key={index}>
        <div className="admin-status-event-title">{status ? displayStatus(status) : t('Unknown status', 'Status necunoscut')}</div>
        {changed && Number.isFinite(timestamp)
          ? <time className="admin-status-event-time" dateTime={changed}>{new Date(timestamp).toLocaleString(language === 'ro' ? 'ro-RO' : 'en-GB')}</time>
          : <div className="admin-status-event-time">{changed || t('Time unavailable', 'Ora nu este disponibilă')}</div>}
        {entry.previous_status && <div className="admin-status-event-detail">{t('Previous status', 'Status anterior')}: {displayStatus(entry.previous_status)}</div>}
        {entry.notes && <div className="admin-status-event-detail">{entry.notes}</div>}
      </li>
    })}
  </ol>
}
