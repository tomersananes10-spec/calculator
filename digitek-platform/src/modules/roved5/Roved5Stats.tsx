import s from './Roved5.module.css'
import type { CloudFilter, TypeFilter } from './types'

interface Props {
  total: number
  awsCount: number
  gcpCount: number
  saasCount: number
  nonSaasCount: number
  cloudFilter: CloudFilter
  typeFilter: TypeFilter
  updated: string | null
  onCloud: (c: CloudFilter) => void
  onType: (t: TypeFilter) => void
}

export function Roved5Stats({
  total, awsCount, gcpCount, saasCount, nonSaasCount,
  cloudFilter, typeFilter, updated, onCloud, onType,
}: Props) {
  return (
    <div className={s.hero}>
      <h1 className={s.heroTitle}>רובד 5 · השוק הדיגיטלי</h1>
      <p className={s.heroSub}>
        קטלוג שירותי הענן המאושרים לרכישה · LIBA
        {updated ? ` · עודכן ${updated}` : ''}
      </p>
      <div className={s.heroKpis}>
        <button
          className={`${s.hk} ${cloudFilter === 'all' && typeFilter === 'all' ? s.hkActive : ''}`}
          onClick={() => { onCloud('all'); onType('all') }}
        >
          <span className={s.hkNum}>{total.toLocaleString()}</span>
          <span className={s.hkLabel}>סה״כ שירותים</span>
        </button>
        <button
          className={`${s.hk} ${cloudFilter === 'AWS' ? s.hkActive : ''}`}
          onClick={() => onCloud(cloudFilter === 'AWS' ? 'all' : 'AWS')}
        >
          <span className={s.hkNum}>{awsCount.toLocaleString()}</span>
          <span className={s.hkLabel}>שירותי AWS</span>
        </button>
        <button
          className={`${s.hk} ${cloudFilter === 'GCP' ? s.hkActive : ''}`}
          onClick={() => onCloud(cloudFilter === 'GCP' ? 'all' : 'GCP')}
        >
          <span className={s.hkNum}>{gcpCount.toLocaleString()}</span>
          <span className={s.hkLabel}>שירותי GCP</span>
        </button>
        <button
          className={`${s.hk} ${typeFilter === 'SaaS' ? s.hkActive : ''}`}
          onClick={() => onType(typeFilter === 'SaaS' ? 'all' : 'SaaS')}
        >
          <span className={s.hkNum}>{saasCount.toLocaleString()}</span>
          <span className={s.hkLabel}>SaaS</span>
        </button>
        <button
          className={`${s.hk} ${typeFilter === 'non-SaaS' ? s.hkActive : ''}`}
          onClick={() => onType(typeFilter === 'non-SaaS' ? 'all' : 'non-SaaS')}
        >
          <span className={s.hkNum}>{nonSaasCount.toLocaleString()}</span>
          <span className={s.hkLabel}>Non-SaaS</span>
        </button>
      </div>
    </div>
  )
}
