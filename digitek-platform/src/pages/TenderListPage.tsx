import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenderList } from '../modules/tenders/hooks/useTenderList'
import { createTender } from '../modules/tenders/hooks/useTender'
import { getStage } from '../modules/tenders/data/stagesBaseline'
import type { AmountBand, Tender, TenderStage } from '../modules/tenders/types'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import styles from './TenderListPage.module.css'

const BAND_LABELS: Record<AmountBand, string> = {
  lt_200k: 'עד 200K',
  '200k_1m': '200K-1M',
  '1m_5m': '1M-5M',
  gt_5m: 'מעל 5M',
}

const STAGE_FILTER_OPTIONS: { value: TenderStage | 'all'; label: string }[] = [
  { value: 'all', label: 'כל השלבים' },
  { value: 'T0_brief_protocol', label: '0. בריף ופרוטוקול' },
  { value: 'T1_budget_approval', label: '1. אישור תקציבי' },
  { value: 'T2_committee_outbound', label: '2. ועדת יציאה' },
  { value: 'T3_signatures_outbound', label: '3. חתימות יציאה' },
  { value: 'T4_minhal_rechesh', label: '4. מינהל הרכש' },
  { value: 'T5_winner_protocol_upload', label: '5. פרוטוקול זכייה' },
  { value: 'T6_committee_winner', label: '6. ועדת זכייה' },
  { value: 'T7_signatures_winner', label: '7. חתימות זכייה' },
  { value: 'T8_engagement', label: '8. התקשרות' },
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
  const { user, isAdmin } = useAuth()
  const [stageFilter, setStageFilter] = useState<TenderStage | 'all'>('all')
  const [search, setSearch] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filters = useMemo(() => ({ stage: stageFilter, search }), [stageFilter, search])
  const { tenders, loading, error, refresh } = useTenderList(filters)

  useEffect(() => {
    if (!menuOpenId) return
    const close = () => setMenuOpenId(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [menuOpenId])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(id)
  }, [toast])

  const canDelete = (t: Tender) => isAdmin || (user?.id != null && t.owner_id === user.id)

  const handleShare = async (t: Tender) => {
    const url = `${window.location.origin}/tenders/${t.id}`
    try {
      await navigator.clipboard.writeText(url)
      setToast('הקישור להליך הועתק')
    } catch {
      setToast(url)
    }
  }

  const handleDuplicate = async (t: Tender) => {
    setBusyId(t.id)
    const res = await createTender({
      title: `עותק של ${t.title}`,
      ministry: t.ministry,
      estimated_amount: t.estimated_amount,
      selection_type: t.selection_type,
      service_cluster: t.service_cluster,
      requires_tender_editor: t.requires_tender_editor,
      brief_id: t.brief_id,
      calculation_id: t.calculation_id,
    })
    setBusyId(null)
    if (!res.ok) {
      setToast(`שגיאה בשכפול: ${res.error ?? 'לא ידוע'}`)
      return
    }
    if (res.id) navigate(`/tenders/${res.id}`)
  }

  const handleDelete = async (t: Tender) => {
    const ok = window.confirm(`למחוק את ההליך "${t.title}"?\nפעולה זו בלתי הפיכה ותמחק את כל המסמכים, הבקשות, האישורים והאודיט.`)
    if (!ok) return
    setBusyId(t.id)
    const { error: delErr } = await supabase.from('tenders').delete().eq('id', t.id)
    setBusyId(null)
    if (delErr) {
      setToast(`שגיאה במחיקה: ${delErr.message}`)
      return
    }
    setToast('ההליך נמחק')
    await refresh()
  }

  const stats = useMemo(() => {
    const active = tenders.filter(t => t.current_stage !== 'closed' && t.current_stage !== 'cancelled').length
    const pendingCommittee = tenders.filter(t => t.current_stage === 'T2_committee_outbound' || t.current_stage === 'T6_committee_winner').length
    const inExecution = tenders.filter(t => t.current_stage === 'T8_engagement').length
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
        {tenders.length > 0 && (
          <button className={styles.newBtn} onClick={() => navigate('/tenders/new')}>
            + הליך חדש
          </button>
        )}
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
              <div className={styles.menuWrap} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className={styles.menuBtn}
                  aria-label="פעולות נוספות"
                  disabled={busyId === t.id}
                  onClick={e => {
                    e.stopPropagation()
                    setMenuOpenId(menuOpenId === t.id ? null : t.id)
                  }}
                >
                  <span className={styles.dots}>⋮</span>
                </button>
                {menuOpenId === t.id && (
                  <div className={styles.menuPopup} role="menu">
                    <button
                      type="button"
                      className={styles.menuItem}
                      role="menuitem"
                      onClick={() => { setMenuOpenId(null); void handleShare(t) }}
                    >
                      <span className={styles.menuIcon}>🔗</span>
                      שתף תהליך
                    </button>
                    <button
                      type="button"
                      className={styles.menuItem}
                      role="menuitem"
                      onClick={() => { setMenuOpenId(null); void handleDuplicate(t) }}
                    >
                      <span className={styles.menuIcon}>📄</span>
                      שכפל תהליך
                    </button>
                    {canDelete(t) && (
                      <>
                        <div className={styles.menuDivider} />
                        <button
                          type="button"
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          role="menuitem"
                          onClick={() => { setMenuOpenId(null); void handleDelete(t) }}
                        >
                          <span className={styles.menuIcon}>🗑</span>
                          מחק תהליך
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
