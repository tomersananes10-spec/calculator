import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenderList } from '../modules/tenders/hooks/useTenderList'
import { getStage } from '../modules/tenders/data/stagesBaseline'
import type { AmountBand, Tender, TenderStage } from '../modules/tenders/types'
import styles from './TenderListPage.module.css'

const BAND_LABELS: Record<AmountBand, string> = {
  lt_200k: 'עד 200K',
  '200k_1m': '200K-1M',
  '1m_5m': '1M-5M',
  gt_5m: 'מעל 5M',
}

const STAGE_FILTER_OPTIONS: { value: TenderStage | 'all'; label: string }[] = [
  { value: 'all', label: 'כל השלבים' },
  { value: 'S0_preconditions', label: '0. מקדים' },
  { value: 'S1_initiation_budget', label: '1. ייזום ותקצוב' },
  { value: 'S2_olma_approval', label: '2. אישור מינהל הרכש' },
  { value: 'S3_committee_outbound', label: '3. ועדה — יציאה' },
  { value: 'S4_system_input_review', label: '4. בדיקה במערכת' },
  { value: 'S5_distribution_response', label: '5. הפצה ומענה' },
  { value: 'S6_proposal_evaluation', label: '6. בדיקת הצעות' },
  { value: 'S7_committee_winner', label: '7. ועדה — זכיה' },
  { value: 'S8_contract', label: '8. התקשרות' },
  { value: 'S9_purchase_order', label: '9. הזמנת רכש' },
  { value: 'S10_execution_m1', label: '10. ביצוע 1' },
  { value: 'S11_execution_m2', label: '11. ביצוע 2' },
  { value: 'S12_closure_evaluation', label: '12. סגירה והערכה' },
  { value: 'closed', label: 'סגור' },
  { value: 'cancelled', label: 'מבוטל' },
]

function formatAmount(n: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function stageBadgeClass(stage: TenderStage): string {
  if (stage === 'closed') return `${styles.stageBadge} ${styles.terminal}`
  if (stage === 'cancelled') return `${styles.stageBadge} ${styles.cancelled}`
  return styles.stageBadge
}

function stageLabel(stage: TenderStage): string {
  if (stage === 'closed') return 'סגור'
  if (stage === 'cancelled') return 'מבוטל'
  const def = getStage(stage)
  return def ? `${def.stageNumber}. ${def.label}` : stage
}

export function TenderListPage() {
  const navigate = useNavigate()
  const [stageFilter, setStageFilter] = useState<TenderStage | 'all'>('all')
  const [search, setSearch] = useState('')

  const filters = useMemo(() => ({ stage: stageFilter, search }), [stageFilter, search])
  const { tenders, loading, error } = useTenderList(filters)

  const stats = useMemo(() => {
    const active = tenders.filter(t => t.current_stage !== 'closed' && t.current_stage !== 'cancelled').length
    const pendingCommittee = tenders.filter(t => t.current_stage === 'S3_committee_outbound' || t.current_stage === 'S7_committee_winner').length
    const inExecution = tenders.filter(t => t.current_stage === 'S10_execution_m1' || t.current_stage === 'S11_execution_m2').length
    const closed = tenders.filter(t => t.current_stage === 'closed').length
    return { active, pendingCommittee, inExecution, closed }
  }, [tenders])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>מורשי חתימה — הליכי מכרז דיגיטק</h1>
          <p className={styles.sub}>ניהול מקצה-לקצה לפי תכ"מ 16.2.19</p>
        </div>
        <button className={styles.newBtn} onClick={() => navigate('/tenders/new')}>
          + הליך חדש
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.active}</div>
          <div className={styles.statLabel}>הליכים פעילים</div>
        </div>
        <div className={`${styles.statCard} ${styles.stat_amber}`}>
          <div className={styles.statValue}>{stats.pendingCommittee}</div>
          <div className={styles.statLabel}>בועדה</div>
        </div>
        <div className={`${styles.statCard} ${styles.stat_green}`}>
          <div className={styles.statValue}>{stats.inExecution}</div>
          <div className={styles.statLabel}>בביצוע</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.closed}</div>
          <div className={styles.statLabel}>סגורים</div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          className={styles.search}
          placeholder="חיפוש לפי שם הליך…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value as TenderStage | 'all')}
        >
          {STAGE_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.errorBox}>שגיאה בטעינה: {error}</div>}
      {loading && <div className={styles.loading}>טוען הליכים…</div>}

      {!loading && tenders.length === 0 && !error && (
        <div className={styles.empty}>
          <h3>אין הליכים פעילים</h3>
          <p>פתח הליך מכרז ראשון כדי להתחיל</p>
          <button className={styles.newBtn} onClick={() => navigate('/tenders/new')}>
            + הליך חדש
          </button>
        </div>
      )}

      {!loading && tenders.length > 0 && (
        <div className={styles.cardList}>
          {tenders.map((t: Tender) => (
            <div
              key={t.id}
              className={styles.tenderCard}
              onClick={() => navigate(`/tenders/${t.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') navigate(`/tenders/${t.id}`) }}
            >
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <code className={styles.tenderId}>{t.tender_number ?? t.id.slice(0, 8)}</code>
                  <span className={`${styles.bandBadge} ${styles[`band_${t.amount_band}`]}`}>{BAND_LABELS[t.amount_band]}</span>
                  <span className={stageBadgeClass(t.current_stage)}>{stageLabel(t.current_stage)}</span>
                </div>
                <div className={styles.cardTitle}>{t.title}</div>
                <div className={styles.cardDetails}>
                  <span>משרד: {t.ministry || '—'}</span>
                  <span>סוג: {t.selection_type === 'price_only' ? 'מחיר בלבד' : 'איכות + מחיר'}</span>
                  {t.requires_olma && <span>אישור מינהל הרכש נדרש</span>}
                </div>
              </div>
              <div className={styles.cardRight}>
                <div className={styles.amount}>{formatAmount(t.estimated_amount)}</div>
                <div className={styles.amountLabel}>סכום משוער</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
