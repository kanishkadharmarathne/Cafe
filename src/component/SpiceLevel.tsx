import { useId } from 'react'
import { useLanguage } from '../lib/language'
import type { SpiceLevel } from '../lib/orders'
import './SpiceLevel.css'

export function SpiceBadge({ level }: { level: string | null | undefined }) {
  const { t } = useLanguage()
  const labels: Record<string, string> = {
    low: t('Low', 'Redus'),
    medium: t('Medium', 'Mediu'),
    high: t('High', 'Ridicat'),
  }
  const normalized = level?.toLowerCase() ?? ''
  const label = labels[normalized]
  return <span className={`spice-badge spice-${label ? normalized : 'unknown'}`}>
    {t('Spice level', 'Nivel de iuțeală')}: {label ?? t('Not specified', 'Nespecificat')}
  </span>
}

export function SpiceSelector({ value, onChange }: { value: SpiceLevel; onChange: (value: SpiceLevel) => void }) {
  const { t } = useLanguage()
  const id = useId()
  return <div className="co-field">
    <label htmlFor={id}>{t('Spice level', 'Nivel de iuțeală')}</label>
    <select id={id} required value={value} onChange={event => {
      const next = event.target.value
      if (next === 'low' || next === 'medium' || next === 'high') onChange(next)
    }}>
      <option value="low">{t('Low', 'Redus')}</option>
      <option value="medium">{t('Medium', 'Mediu')}</option>
      <option value="high">{t('High', 'Ridicat')}</option>
    </select>
    <SpiceBadge level={value} />
  </div>
}
