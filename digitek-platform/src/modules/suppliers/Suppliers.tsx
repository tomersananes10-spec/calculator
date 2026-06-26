import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FlatRow, Cluster, Specialty, SupplierSummary, SizeFilter } from './types'
import { SupplierModal } from './SupplierModal'
import styles from './Suppliers.module.css'

// Cluster color stripe (matches Mockup B). Order matches sort_order 1..7.
const CLUSTER_COLOR: Record<number, string> = {
  1: '#1e40af', // תיכנון — primary blue
  2: '#7c3aed', // תשתיות — purple
  3: '#ec4899', // חדשנות — pink
  4: '#f97316', // אינטגרציה ענן — orange
  5: '#059669', // הדרכה — green
  6: '#dc2626', // אבטחת מידע — red
  7: '#0d9488', // בסיסי נתונים — teal
}

const PAGE_SIZE = 24

export function Suppliers() {
  const [rows,        setRows]        = useState<FlatRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)
  const [query,       setQuery]       = useState('')
  const [clusterId,   setClusterId]   = useState<string | null>(null)
  const [specIds,     setSpecIds]     = useState<Set<string>>(new Set())
  const [sizeFilter,  setSizeFilter]  = useState<SizeFilter>('all')
  const [showAdv,     setShowAdv]     = useState(false)
  const [selectedSup, setSelectedSup] = useState<SupplierSummary | null>(null)
  const [page,        setPage]        = useState(1)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('v_winning_suppliers_flat')
      .select('*')
      .order('cluster_sort_order')
      .order('supplier_name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setLoadError(error.message); setLoading(false); return }
        setRows((data ?? []) as FlatRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Knowledge Hub deep-link — landing with journey_step_id marks the step done
  // and applies the cluster/specialization filter once rows have loaded.
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(window.location.search)
    const stepId = params.get('journey_step_id')
    const clusterSlug = params.get('cluster')
    const specName = params.get('specialization')

    if (clusterSlug) {
      const found = rows.find(r => r.cluster_slug === clusterSlug)
      if (found) setClusterId(found.cluster_id)
    }
    if (specName) {
      const found = rows.find(r => r.specialization_name === specName)
      if (found) setSpecIds(new Set([found.specialization_id]))
    }

    if (stepId) {
      void supabase
        .from('journey_steps')
        .update({
          status: 'done',
          linked_entity_table: 'suppliers_view',
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepId)
        .neq('status', 'done')
    }

    if (stepId || clusterSlug || specName) {
      params.delete('journey_step_id')
      params.delete('cluster')
      params.delete('specialization')
      const newQuery = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? '?' + newQuery : ''}`)
    }
  }, [loading, rows])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [query, clusterId, specIds, sizeFilter])

  // Reset specs when cluster changes
  useEffect(() => { setSpecIds(new Set()) }, [clusterId])

  const clusters = useMemo<Cluster[]>(() => {
    const map = new Map<string, Cluster>()
    rows.forEach(r => {
      const c = map.get(r.cluster_id)
      if (c) {
        c.qualCount++
      } else {
        map.set(r.cluster_id, {
          id: r.cluster_id,
          name: r.cluster_name,
          slug: r.cluster_slug,
          sort_order: r.cluster_sort_order,
          supplierCount: 0,
          specCount: 0,
          qualCount: 1,
        })
      }
    })
    // Suppliers per cluster (unique)
    const supByCluster = new Map<string, Set<string>>()
    const specByCluster = new Map<string, Set<string>>()
    rows.forEach(r => {
      if (!supByCluster.has(r.cluster_id)) supByCluster.set(r.cluster_id, new Set())
      supByCluster.get(r.cluster_id)!.add(r.supplier_id)
      if (!specByCluster.has(r.cluster_id)) specByCluster.set(r.cluster_id, new Set())
      specByCluster.get(r.cluster_id)!.add(r.specialization_id)
    })
    map.forEach(c => {
      c.supplierCount = supByCluster.get(c.id)?.size ?? 0
      c.specCount = specByCluster.get(c.id)?.size ?? 0
    })
    return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order)
  }, [rows])

  const specialties = useMemo<Specialty[]>(() => {
    const visibleRows = clusterId ? rows.filter(r => r.cluster_id === clusterId) : rows
    const map = new Map<string, { spec: Specialty; suppliers: Set<string> }>()
    visibleRows.forEach(r => {
      let entry = map.get(r.specialization_id)
      if (!entry) {
        entry = {
          spec: {
            id: r.specialization_id,
            name: r.specialization_name,
            clusterId: r.cluster_id,
            clusterName: r.cluster_name,
            catalog_number: r.catalog_number,
            supplierCount: 0,
          },
          suppliers: new Set(),
        }
        map.set(r.specialization_id, entry)
      }
      entry.suppliers.add(r.supplier_id)
    })
    map.forEach(e => e.spec.supplierCount = e.suppliers.size)
    return Array.from(map.values()).map(e => e.spec).sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }, [rows, clusterId])

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (clusterId && r.cluster_id !== clusterId) return false
      if (specIds.size && !specIds.has(r.specialization_id)) return false
      if (sizeFilter === 'גדול' && r.size !== 'גדול') return false
      if (sizeFilter === 'קטן' && r.size !== 'קטן') return false
      if (sizeFilter === 'none' && r.size !== null) return false
      if (q) {
        const haystack = (
          r.supplier_name + ' ' +
          r.specialization_name + ' ' +
          (r.catalog_number ?? '') + ' ' +
          (r.manof_number ?? '') + ' ' +
          (r.sigma_agreement_no ?? '')
        ).toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [rows, query, clusterId, specIds, sizeFilter])

  const suppliers = useMemo<SupplierSummary[]>(() => {
    const map = new Map<string, SupplierSummary>()
    filteredRows.forEach(r => {
      let s = map.get(r.supplier_id)
      if (!s) {
        s = {
          id: r.supplier_id,
          name: r.supplier_name,
          manof_number: r.manof_number,
          sigma_supplier_no: r.sigma_supplier_no,
          sigma_agreement_no: r.sigma_agreement_no,
          agreement_name: r.agreement_name,
          valid_from: r.valid_from,
          valid_to: r.valid_to,
          is_active: r.is_active,
          quals: [],
          clusters: [],
          specCount: 0,
          largeCount: 0,
          smallCount: 0,
          undefinedCount: 0,
        }
        map.set(r.supplier_id, s)
      }
      s.quals.push(r)
      if (r.size === 'גדול') s.largeCount++
      else if (r.size === 'קטן') s.smallCount++
      else s.undefinedCount++
    })
    map.forEach(s => {
      s.clusters = Array.from(new Set(s.quals.map(q => q.cluster_name)))
      s.specCount = new Set(s.quals.map(q => q.specialization_id)).size
    })
    return Array.from(map.values()).sort((a, b) => b.quals.length - a.quals.length)
  }, [filteredRows])

  // Aggregate stats for the count line
  const totals = useMemo(() => ({
    suppliers: new Set(rows.map(r => r.supplier_id)).size,
    specs: new Set(rows.map(r => r.specialization_id)).size,
    clusters: clusters.length,
  }), [rows, clusters])

  const visibleStats = useMemo(() => ({
    suppliers: suppliers.length,
    specs: new Set(filteredRows.map(r => r.specialization_id)).size,
    quals: filteredRows.length,
  }), [suppliers, filteredRows])

  const totalPages = Math.ceil(suppliers.length / PAGE_SIZE)
  const pageItems = suppliers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function clearAll() {
    setQuery('')
    setClusterId(null)
    setSpecIds(new Set())
    setSizeFilter('all')
    setShowAdv(false)
  }

  function toggleSpec(id: string) {
    setSpecIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function validityBadge(s: SupplierSummary): { label: string; cls: string } {
    if (!s.valid_to) return { label: 'ללא תאריך', cls: styles.badgeGrey }
    const days = Math.floor((new Date(s.valid_to).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'פג תוקף',           cls: styles.badgeRed }
    if (days < 90)  return { label: `פג בעוד ${days} ימים`, cls: styles.badgeAmber }
    return { label: `בתוקף עד ${formatDate(s.valid_to)}`,    cls: styles.badgeGreen }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>ספקים זוכים</h1>
        <p className={styles.pageSub}>
          {loading
            ? 'טוען קטלוג…'
            : loadError
              ? `שגיאת טעינה: ${loadError}`
              : `נספח ד2 — מכרז דיגטק 07-2023 · ${totals.suppliers} ספקים · ${totals.specs} התמחויות · ${totals.clusters} אשכולות`}
        </p>
      </header>

      <div className={styles.searchBar}>
        <div className={styles.searchPill}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder='חיפוש לפי שם ספק, התמחות, מק"ט, מנו"ף או מספר הסכם…'
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>}
        </div>
        <div className={styles.sizeSeg}>
          {(['all', 'גדול', 'קטן', 'none'] as SizeFilter[]).map(s => (
            <button
              key={s}
              className={`${styles.sizeBtn} ${sizeFilter === s ? styles.sizeBtnActive : ''}`}
              onClick={() => setSizeFilter(s)}
            >
              {s === 'all' ? 'הכל' : s === 'none' ? 'ללא גודל' : s}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.clusterChips}>
        <button
          className={`${styles.chip} ${clusterId === null ? styles.chipActive : ''}`}
          onClick={() => setClusterId(null)}
        >
          <span>כל האשכולות</span>
          <span className={styles.chipNum}>{totals.suppliers}</span>
        </button>
        {clusters.map(c => (
          <button
            key={c.id}
            className={`${styles.chip} ${clusterId === c.id ? styles.chipActive : ''}`}
            onClick={() => setClusterId(prev => prev === c.id ? null : c.id)}
          >
            <span>{c.name}</span>
            <span className={styles.chipNum}>{c.supplierCount}</span>
          </button>
        ))}
      </div>

      <button
        className={`${styles.advToggle} ${(showAdv || specIds.size > 0) ? styles.advToggleActive : ''}`}
        onClick={() => setShowAdv(s => !s)}
      >
        ⚙️ סינון התמחויות{specIds.size > 0 ? ` · ${specIds.size} נבחרו` : ''}
      </button>

      {showAdv && (
        <div className={styles.advPanel}>
          <div className={styles.advLabel}>
            {clusterId ? 'התמחויות באשכול הנבחר' : 'כל ההתמחויות'}
          </div>
          <div className={styles.specChips}>
            {specialties.map(s => (
              <button
                key={s.id}
                className={`${styles.specChip} ${specIds.has(s.id) ? styles.specChipActive : ''}`}
                onClick={() => toggleSpec(s.id)}
                title={s.catalog_number ? `מק"ט ${s.catalog_number}` : undefined}
              >
                <span>{s.name}</span>
                <span className={styles.specChipN}>{s.supplierCount}</span>
              </button>
            ))}
          </div>
          {specIds.size > 0 && (
            <button className={styles.clearSpecsBtn} onClick={() => setSpecIds(new Set())}>
              נקה התמחויות נבחרות
            </button>
          )}
        </div>
      )}

      <div className={styles.resultsInfo}>
        <div className={styles.resultsCount}>
          <strong>{visibleStats.suppliers}</strong> ספקים זוכים
        </div>
        <div className={styles.resultsDetail}>
          {visibleStats.specs} התמחויות · {visibleStats.quals} הרשאות
          {(query || clusterId || specIds.size || sizeFilter !== 'all') && (
            <button className={styles.resetLink} onClick={clearAll}>↺ נקה הכל</button>
          )}
        </div>
      </div>

      {!loading && suppliers.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <div>לא נמצאו ספקים בחיתוך זה</div>
          <div className={styles.emptyHint}>נסה להרחיב את הסינון או נקה את כל הפילטרים</div>
        </div>
      )}

      <div className={styles.cards}>
        {pageItems.map(s => {
          const mainCluster = clusters.find(c => c.name === s.clusters[0])
          const stripeColor = mainCluster ? CLUSTER_COLOR[mainCluster.sort_order] : '#cbd5e1'
          const badge = validityBadge(s)
          return (
            <div
              key={s.id}
              className={styles.card}
              onClick={() => setSelectedSup(s)}
            >
              <div className={styles.cardStripe} style={{ background: stripeColor }} />
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{s.name}</div>
                <div className={styles.cardMeta}>
                  מנו"ף {s.manof_number ?? '—'} · הסכם {s.sigma_agreement_no ?? '—'}
                </div>
                <div className={styles.cardClusters}>
                  {s.clusters.slice(0, 2).map(c => (
                    <span key={c} className={styles.clusterTag}>{c}</span>
                  ))}
                  {s.clusters.length > 2 && (
                    <span className={styles.clusterTagMore}>+{s.clusters.length - 2}</span>
                  )}
                </div>
                <div className={styles.cardSummary}>
                  <div>
                    <div className={styles.sumNum}>{s.specCount}</div>
                    <div className={styles.sumLab}>התמחויות</div>
                  </div>
                  <div>
                    <div className={styles.sumNum} style={{ color: 'var(--primary)' }}>{s.largeCount}</div>
                    <div className={styles.sumLab}>גדול</div>
                  </div>
                  <div>
                    <div className={styles.sumNum} style={{ color: 'var(--amber)' }}>{s.smallCount}</div>
                    <div className={styles.sumLab}>קטן</div>
                  </div>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <span className={badge.cls}>● {badge.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ הקודם</button>
          <span>עמוד {page} מתוך {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>הבא ›</button>
        </div>
      )}

      {selectedSup && (
        <SupplierModal supplier={selectedSup} onClose={() => setSelectedSup(null)} />
      )}
    </div>
  )
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  const x = new Date(d)
  return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`
}
