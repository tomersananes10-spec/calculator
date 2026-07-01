import { useState, useRef, useEffect, useMemo } from 'react'
import type { Roved5Service, AISearchResult } from './types'
import { aiSearch, keywordSearch, categorizeService } from './roved5AI'
import type { ServiceCategory } from './roved5AI'
import { ServiceModal } from './ServiceModal'
import { supabase } from '../../lib/supabase'
import styles from './Roved5.module.css'

interface DbRow {
  id: string
  cloud: 'GCP' | 'AWS'
  provider: string
  manufacturer: string
  name: string
  description: string
  type: 'SaaS' | 'non-SaaS'
  discount: number | null
  price_link: string
  contact: string
  approval_date: string
  notes: string
  ps_services: string
}

function mapDbRow(r: DbRow): Roved5Service {
  return {
    id: r.id,
    cloud: r.cloud,
    provider: r.provider,
    manufacturer: r.manufacturer,
    name: r.name,
    description: r.description,
    type: r.type,
    discount: r.discount ?? '',
    priceLink: r.price_link,
    contact: r.contact,
    approvalDate: r.approval_date,
    notes: r.notes,
    psServices: r.ps_services,
  }
}

type CloudFilter = 'all' | 'AWS' | 'GCP'
type TypeFilter  = 'all' | 'SaaS' | 'non-SaaS'

const CAT_LABELS: Record<ServiceCategory, string> = {
  compute:   'Compute',
  storage:   'Storage',
  database:  'Database',
  ai_ml:     'AI / ML',
  security:  'Security',
  analytics: 'Analytics',
}

const CAT_ICONS: Record<ServiceCategory, string> = {
  compute:   '⚡',
  storage:   '💾',
  database:  '🗄️',
  ai_ml:     '🧠',
  security:  '🛡️',
  analytics: '📊',
}

const PAGE_SIZE = 24

export function Roved5() {
  const [services,       setServices]       = useState<Roved5Service[]>([])
  const [loading,        setLoading]        = useState(true)
  const [loadError,      setLoadError]      = useState<string | null>(null)
  const [query,          setQuery]          = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('search') ?? ''
  })
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [cloudFilter,    setCloudFilter]    = useState<CloudFilter>('all')
  const [typeFilter,     setTypeFilter]     = useState<TypeFilter>('all')
  const [selectedCats,   setSelectedCats]   = useState<Set<ServiceCategory>>(() => {
    if (typeof window === 'undefined') return new Set()
    const c = new URLSearchParams(window.location.search).get('category')
    const allowed: ServiceCategory[] = ['security', 'database', 'storage', 'compute', 'ai_ml', 'analytics']
    return new Set(c && allowed.includes(c as ServiceCategory) ? [c as ServiceCategory] : [])
  })
  const [selectedMfgs,   setSelectedMfgs]   = useState<Set<string>>(new Set())
  const [mfgSearchQ,     setMfgSearchQ]     = useState('')
  const [openMfgGroups,  setOpenMfgGroups]  = useState<Set<string>>(new Set())
  const [aiResults,      setAiResults]      = useState<AISearchResult[] | null>(null)
  const [aiLoading,      setAiLoading]      = useState(false)
  const [selected,       setSelected]       = useState<Roved5Service | null>(null)
  const [page,           setPage]           = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Knowledge Hub deep-link — landing on the page with a journey_step_id
  // counts as "done" (roved5 is informational, no entity to create).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stepId = params.get('journey_step_id')
    if (!stepId) return
    void supabase
      .from('journey_steps')
      .update({
        status: 'done',
        linked_entity_table: 'roved5_view',
        completed_at: new Date().toISOString(),
      })
      .eq('id', stepId)
      .neq('status', 'done')
    params.delete('journey_step_id')
    params.delete('category')
    params.delete('search')
    const newQuery = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? '?' + newQuery : ''}`)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('roved5_services')
      .select('id,cloud,provider,manufacturer,name,description,type,discount,price_link,contact,approval_date,notes,ps_services')
      .order('cloud')
      .order('id')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(error.message)
          setLoading(false)
          return
        }
        setServices((data as DbRow[]).map(mapDbRow))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(t)
  }, [query])

  // AI הוא ברירת המחדל ברובד 5 — לא כפתור נפרד. כל שאילתה (3+ תווים)
  // מפעילה אוטומטית את Gemini עם pre-filter keyword. בזמן שה-AI עובד,
  // תוצאות keyword מוצגות כביניים, ואחרי שה-AI חוזר הן מוחלפות.
  // אם ה-AI נכשל (timeout/error) — נופלים בשקט ל-keyword בלי באנר אדום.
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 3) {
      setAiResults(null)
      setAiLoading(false)
      return
    }
    const controller = new AbortController()
    setAiLoading(true)
    aiSearch(q, services, controller.signal)
      .then(results => {
        if (controller.signal.aborted) return
        setAiLoading(false)
        if (results.length > 0) setAiResults(results)
        else setAiResults(null) // ה-keyword search כבר רץ ברקע
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setAiLoading(false)
        setAiResults(null)
      })
    return () => { controller.abort() }
  }, [debouncedQuery, services])

  useEffect(() => { setPage(1) }, [debouncedQuery, cloudFilter, typeFilter, selectedCats, selectedMfgs])

  const serviceCategories = useMemo(() => {
    const map = new Map<string, ServiceCategory | null>()
    services.forEach(s => map.set(s.id, categorizeService(s)))
    return map
  }, [services])

  // Category counts respect current cloud/type but NOT selectedCats itself
  const catCounts = useMemo(() => {
    const counts: Record<ServiceCategory, number> = { security: 0, database: 0, storage: 0, compute: 0, ai_ml: 0, analytics: 0 }
    services.forEach(s => {
      if (cloudFilter !== 'all' && s.cloud !== cloudFilter) return
      if (typeFilter !== 'all' && s.type !== typeFilter) return
      const cat = serviceCategories.get(s.id)
      if (cat) counts[cat]++
    })
    return counts
  }, [services, cloudFilter, typeFilter, serviceCategories])

  // Manufacturer aggregation, grouped by cloud. Respects cloud/type/cat but NOT selectedMfgs itself.
  const mfgGroups = useMemo(() => {
    const q = mfgSearchQ.trim().toLowerCase()
    const byCloud: Record<'AWS' | 'GCP', Map<string, number>> = { AWS: new Map(), GCP: new Map() }
    services.forEach(s => {
      if (!s.manufacturer) return
      if (cloudFilter !== 'all' && s.cloud !== cloudFilter) return
      if (typeFilter !== 'all' && s.type !== typeFilter) return
      if (selectedCats.size > 0) {
        const cat = serviceCategories.get(s.id)
        if (!cat || !selectedCats.has(cat)) return
      }
      const map = byCloud[s.cloud as 'AWS' | 'GCP']
      map.set(s.manufacturer, (map.get(s.manufacturer) ?? 0) + 1)
    })
    return (['AWS', 'GCP'] as const).map(cloud => ({
      cloud,
      items: Array.from(byCloud[cloud].entries())
        .map(([name, count]) => ({ name, count }))
        .filter(m => !q || m.name.toLowerCase().includes(q))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    }))
  }, [services, cloudFilter, typeFilter, selectedCats, serviceCategories, mfgSearchQ])

  const mfgTotal = useMemo(() => mfgGroups.reduce((a, g) => a + g.items.length, 0), [mfgGroups])

  const awsCount = useMemo(() => services.filter(s => s.cloud === 'AWS').length, [services])
  const gcpCount = useMemo(() => services.filter(s => s.cloud === 'GCP').length, [services])

  let displayed: Roved5Service[]
  if (aiResults && query.trim().length >= 3) {
    displayed = aiResults.map(r => services.find(s => s.id === r.id)).filter((s): s is Roved5Service => !!s)
  } else if (debouncedQuery.trim().length >= 2) {
    displayed = keywordSearch(debouncedQuery, services)
  } else {
    displayed = services
  }
  if (cloudFilter !== 'all') displayed = displayed.filter(s => s.cloud === cloudFilter)
  if (typeFilter  !== 'all') displayed = displayed.filter(s => s.type  === typeFilter)
  if (selectedCats.size > 0) displayed = displayed.filter(s => {
    const cat = serviceCategories.get(s.id)
    return !!cat && selectedCats.has(cat)
  })
  if (selectedMfgs.size > 0) displayed = displayed.filter(s => !!s.manufacturer && selectedMfgs.has(s.manufacturer))

  const isAIMode = !!aiResults && query.trim().length >= 3
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE)
  const pageItems  = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function reset() {
    setQuery('')
    setDebouncedQuery('')
    setAiResults(null)
    setCloudFilter('all')
    setTypeFilter('all')
    setSelectedCats(new Set())
    setSelectedMfgs(new Set())
    setMfgSearchQ('')
    setPage(1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function toggleCat(id: ServiceCategory) {
    setSelectedCats(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleMfg(name: string) {
    setSelectedMfgs(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleMfgGroup(cloud: string) {
    setOpenMfgGroups(prev => {
      const next = new Set(prev)
      if (next.has(cloud)) next.delete(cloud)
      else next.add(cloud)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>רובד 5</h1>
        <p className={styles.pageSub}>
          {loading
            ? 'טוען קטלוג…'
            : loadError
              ? `שגיאת טעינה: ${loadError}`
              : `${services.length.toLocaleString()} שירותי ענן מאושרים לרכישה`}
        </p>
      </div>

      <div className={styles.searchBar}>
        <div className={styles.searchPill}>
          <div className={styles.searchInputWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              ref={inputRef}
              className={styles.searchInput}
              type="text"
              placeholder='✨ חיפוש חכם — למשל: "סריקת מסמכים", "אבטחה לדאטה רגיש", "ETL"...'
              value={query}
              onChange={e => { setQuery(e.target.value) }}
            />
            {aiLoading && <span className={styles.spinner} title="✨ AI מחפש..." />}
            {query && !aiLoading && <button className={styles.clearBtn} onClick={reset}>✕</button>}
          </div>
        </div>
      </div>

      <div className={styles.filterRow}>
        {(['all', 'AWS', 'GCP'] as CloudFilter[]).map(f => (
          <button
            key={f}
            className={`${styles.chip} ${cloudFilter === f ? styles.chipActive : ''}`}
            onClick={() => setCloudFilter(f)}
          >
            {f === 'all' ? `הכל (${services.length})` : f === 'AWS' ? `AWS (${awsCount})` : `GCP (${gcpCount})`}
          </button>
        ))}
        <button
          className={`${styles.chip} ${typeFilter === 'all' ? styles.chipActive : ''}`}
          onClick={() => setTypeFilter('all')}
        >
          כל הסוגים
        </button>
        {(['SaaS', 'non-SaaS'] as TypeFilter[]).map(f => (
          <button
            key={f}
            className={`${styles.chip} ${typeFilter === f ? styles.chipActive : ''}`}
            onClick={() => setTypeFilter(prev => prev === f ? 'all' : f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <section className={styles.sbSection}>
            <div className={styles.sbTitle}>
              <span>קטגוריות</span>
              {selectedCats.size > 0 && (
                <button className={styles.sbClear} onClick={() => setSelectedCats(new Set())}>נקה</button>
              )}
            </div>
            <div className={styles.catGrid}>
              {(Object.keys(CAT_LABELS) as ServiceCategory[]).map(cat => {
                const sel = selectedCats.has(cat)
                return (
                  <button
                    key={cat}
                    className={`${styles.catChip} ${sel ? styles.catChipActive : ''}`}
                    onClick={() => toggleCat(cat)}
                  >
                    <span className={styles.catChipIcon}>{CAT_ICONS[cat]}</span>
                    <span className={styles.catChipLabel}>{CAT_LABELS[cat]}</span>
                    <span className={styles.catChipNum}>{catCounts[cat]}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className={styles.sbSection}>
            <div className={styles.sbTitle}>
              <span>יצרנים <span className={styles.sbTitleCount}>({mfgTotal})</span></span>
              {(selectedMfgs.size > 0 || mfgSearchQ) && (
                <button
                  className={styles.sbClear}
                  onClick={() => { setSelectedMfgs(new Set()); setMfgSearchQ('') }}
                >נקה</button>
              )}
            </div>
            <div className={styles.sbSearchWrap}>
              <input
                className={styles.sbSearchInput}
                placeholder="חפש יצרן…"
                value={mfgSearchQ}
                onChange={e => setMfgSearchQ(e.target.value)}
              />
              <span className={styles.sbSearchIcon}>🔍</span>
            </div>
            <div className={styles.sbList}>
              {mfgGroups.every(g => g.items.length === 0) ? (
                <div className={styles.sbEmpty}>אין יצרנים בפילטר הנוכחי</div>
              ) : mfgGroups.map(group => {
                if (group.items.length === 0) return null
                const isOpen = mfgSearchQ.trim() !== '' || openMfgGroups.has(group.cloud)
                const dotClass = group.cloud === 'AWS' ? styles.sbGroupDotAws : styles.sbGroupDotGcp
                return (
                  <div key={group.cloud} className={`${styles.sbGroup} ${isOpen ? styles.sbGroupOpen : ''}`}>
                    <div className={styles.sbGroupHeader} onClick={() => toggleMfgGroup(group.cloud)}>
                      <span className={styles.sbGroupChev}>▶</span>
                      <span className={dotClass}>●</span>
                      <span>{group.cloud}</span>
                      <span className={styles.sbGroupCount}>{group.items.length}</span>
                    </div>
                    <div className={styles.sbGroupItems}>
                      {group.items.map(m => {
                        const sel = selectedMfgs.has(m.name)
                        return (
                          <label
                            key={m.name}
                            className={`${styles.sbItem} ${sel ? styles.sbItemSelected : ''}`}
                            title={m.name}
                          >
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => toggleMfg(m.name)}
                            />
                            <span className={styles.sbItemName}>{m.name}</span>
                            <span className={styles.sbItemCount}>{m.count}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>

        <div className={styles.main}>
      <div className={styles.resultsInfo}>
        {isAIMode && <span className={styles.aiResultsBadge}>✨ תוצאות חיפוש חכם</span>}
        {displayed.length > 0 && (
          <span className={styles.resultsCount}>
            {displayed.length.toLocaleString()} תוצאות
          </span>
        )}
      </div>

      {pageItems.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyTitle}>לא נמצאו שירותים מתאימים</div>
          <div className={styles.emptyDesc}>נסה מילות חיפוש אחרות או לחץ על &ldquo;חיפוש חכם&rdquo;</div>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {pageItems.map(service => {
            const aiResult = aiResults?.find(r => r.id === service.id)

            return (
              <div key={service.id} className={styles.card} onClick={() => setSelected(service)}>
                <div className={styles.cardBadges}>
                  <span className={`${styles.badge} ${service.type === 'SaaS' ? styles.badgeSaaS : styles.badgeNonSaaS}`}>
                    {service.type}
                  </span>
                  <span className={`${styles.badge} ${service.cloud === 'GCP' ? styles.badgeGCP : styles.badgeAWS}`}>
                    {service.cloud}
                  </span>
                </div>

                <div className={styles.cardTitle}>{service.name}</div>
                {service.manufacturer && (
                  <div className={styles.cardManufacturer}>{service.manufacturer}</div>
                )}
                <div className={styles.cardDesc}>{service.description}</div>

                {aiResult && (
                  <div className={styles.cardAiReason}>
                    <span className={styles.cardAiReasonLabel}>מדוע מתאים:</span>
                    ✨ {aiResult.reason}
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.cardDate}>{service.approvalDate || '—'}</span>
                  <span className={styles.cardProvider}>{service.provider}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>›</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
            return (
              <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            )
          })}
          <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>‹</button>
        </div>
      )}
        </div>
      </div>

      {selected && <ServiceModal service={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
