import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ExpertiseCluster } from './types'
import { resolveSupplierCluster, domainLabel, type SupplierClusterRef } from './clusterMapping'
import styles from './SuppliersDrawer.module.css'

// שורה מצומצמת מתוך public.v_winning_suppliers_flat
interface FlatRow {
  supplier_id: string
  supplier_name: string
  manof_number: string | null
  sigma_agreement_no: string | null
  valid_to: string | null
  specialization_id: string
  specialization_name: string
  size: 'גדול' | 'קטן' | 'ל.ר' | null
}

interface SupplierSummary {
  id: string
  name: string
  manof: string | null
  agreement: string | null
  validTo: string | null
  specs: string[]
  large: number
  small: number
}

interface Props {
  open: boolean
  cluster: ExpertiseCluster | null
  specName: string | null
  onClose: () => void
  /** מעבר למודול הספקים המלא עם הפרמטרים שנשמרו */
  onGoToModule: (ref: SupplierClusterRef) => void
}

export function SuppliersDrawer({ open, cluster, specName, onClose, onGoToModule }: Props) {
  const ref = cluster ? resolveSupplierCluster(cluster.cluster_id) : null

  const [rows, setRows] = useState<FlatRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  // chip נשמר עד שמנקים אותו במפורש
  const [clusterChip, setClusterChip] = useState(true)

  // ESC סוגר
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // בכל פתיחה מחדש — אפס חיפוש והחזר את ה-chip
  useEffect(() => {
    if (open) { setQ(''); setClusterChip(true) }
  }, [open, cluster?.cluster_id])

  // שליפת הספקים של האשכול הממופה
  useEffect(() => {
    if (!open || !ref) return
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('v_winning_suppliers_flat')
      .select('supplier_id,supplier_name,manof_number,sigma_agreement_no,valid_to,specialization_id,specialization_name,size')
      .eq('domain', ref.domain)
      .eq('cluster_slug', ref.clusterSlug)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setError(error.message); setLoading(false); return }
        setRows((data ?? []) as FlatRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [open, ref?.domain, ref?.clusterSlug])

  const suppliers = useMemo<SupplierSummary[]>(() => {
    const map = new Map<string, SupplierSummary>()
    rows.forEach(r => {
      let s = map.get(r.supplier_id)
      if (!s) {
        s = { id: r.supplier_id, name: r.supplier_name, manof: r.manof_number,
              agreement: r.sigma_agreement_no, validTo: r.valid_to, specs: [], large: 0, small: 0 }
        map.set(r.supplier_id, s)
      }
      if (!s.specs.includes(r.specialization_name)) s.specs.push(r.specialization_name)
      if (r.size === 'גדול') s.large++
      else if (r.size === 'קטן') s.small++
    })
    return Array.from(map.values()).sort((a, b) => b.specs.length - a.specs.length)
  }, [rows])

  const filtered = useMemo(() => {
    const t = q.trim()
    if (!t) return suppliers
    return suppliers.filter(s =>
      s.name.includes(t) || s.specs.some(x => x.includes(t)) || (s.agreement ?? '').includes(t),
    )
  }, [suppliers, q])

  function validity(validTo: string | null): { label: string; cls: string } {
    if (!validTo) return { label: 'ללא תאריך', cls: styles.badgeGrey }
    const days = Math.floor((new Date(validTo).getTime() - Date.now()) / 86400000)
    if (days < 0) return { label: 'פג תוקף', cls: styles.badgeRed }
    if (days < 90) return { label: `פג בעוד ${days} ימים`, cls: styles.badgeAmber }
    return { label: `בתוקף עד ${new Date(validTo).getFullYear()}`, cls: styles.badgeGreen }
  }

  const accent = cluster ? `hsl(${cluster.hue} 60% 48%)` : 'var(--primary)'
  const accentBg = cluster ? `hsl(${cluster.hue} 60% 96%)` : 'var(--primary-bg)'

  return (
    <>
      <div className={`${styles.overlay} ${open ? styles.on : ''}`} onClick={onClose} />
      <aside
        className={`${styles.drawer} ${open ? styles.on : ''}`}
        style={{ ['--accent' as string]: accent, ['--accentBg' as string]: accentBg }}
        role="dialog"
        aria-hidden={!open}
      >
        {ref && cluster && (
          <>
            <div className={styles.head}>
              <div className={styles.topRow}>
                <div>
                  <div className={styles.kicker}>🏆 ספקים זוכים · {domainLabel(ref.domain)}</div>
                  <div className={styles.title}>{cluster.name.replace('אשכול ', 'אשכול ')}</div>
                </div>
                <button className={styles.close} onClick={onClose} aria-label="סגור">✕</button>
              </div>

              <div className={styles.chips}>
                {clusterChip && (
                  <span className={styles.chip}>
                    אשכול: {ref.clusterName}
                    <button className={styles.chipX} onClick={() => setClusterChip(false)} aria-label="הסר">✕</button>
                  </span>
                )}
                {specName && <span className={styles.chipMuted}>מתוך: {specName}</span>}
                {!clusterChip && (
                  <button className={styles.chipReset} onClick={() => setClusterChip(true)}>↺ החזר אשכול</button>
                )}
              </div>

              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  className={styles.searchInput}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="חיפוש בתוך הספקים…"
                />
                {q && <button className={styles.searchClear} onClick={() => setQ('')}>✕</button>}
              </div>
            </div>

            <div className={styles.body}>
              {loading ? (
                <div className={styles.state}>טוען ספקים…</div>
              ) : error ? (
                <div className={styles.state}>שגיאה בטעינה: {error}</div>
              ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <div>{suppliers.length === 0 ? 'אין ספקים זוכים באשכול זה' : `אין ספקים תואמים ל-"${q}"`}</div>
                  {q && <button className={styles.chipReset} onClick={() => setQ('')} style={{ marginTop: 12 }}>✕ נקה חיפוש</button>}
                </div>
              ) : (
                <>
                  <div className={styles.countLine}><b>{filtered.length}</b> ספקים זכו באשכול זה</div>
                  {filtered.map(s => {
                    const b = validity(s.validTo)
                    return (
                      <div key={s.id} className={styles.vcard}>
                        <div className={styles.vcName}>{s.name}</div>
                        <div className={styles.vcMeta}>מנו"ף {s.manof ?? '—'} · הסכם {s.agreement ?? '—'}</div>
                        <div className={styles.vcTags}>
                          {s.specs.slice(0, 4).map(x => <span key={x} className={styles.vcTag}>{x}</span>)}
                          {s.specs.length > 4 && <span className={styles.vcTagMore}>+{s.specs.length - 4}</span>}
                        </div>
                        <div className={styles.vcFoot}>
                          <span className={styles.vcSize}>גדול <b>{s.large}</b></span>
                          <span className={styles.vcSize}>קטן <b>{s.small}</b></span>
                          <span className={`${styles.badge} ${b.cls}`}>● {b.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            <div className={styles.foot}>
              <button className={styles.goModule} onClick={() => onGoToModule(ref)}>
                <span>גש למודול ספקים המלא</span><span>←</span>
              </button>
              <div className={styles.goHint}>האשכול ({domainLabel(ref.domain)} · {ref.clusterName}) יעבור אוטומטית למודול</div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
