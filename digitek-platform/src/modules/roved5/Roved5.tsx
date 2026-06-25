import { useState, useRef, useEffect, useMemo } from 'react'
import type { Roved5Service, AISearchResult } from './types'
import { aiSearch, keywordSearch, categorizeService } from './roved5AI'
import type { ServiceCategory } from './roved5AI'
import { ServiceModal } from './ServiceModal'
import styles from './Roved5.module.css'
import allServices from '../../data/roved5Services.json'

const services = allServices as Roved5Service[]

type CloudFilter = 'all' | 'AWS' | 'GCP'
type TypeFilter  = 'all' | 'SaaS' | 'non-SaaS'
type CatFilter = 'all' | ServiceCategory

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
  const [query,          setQuery]          = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [cloudFilter,    setCloudFilter]    = useState<CloudFilter>('all')
  const [typeFilter,     setTypeFilter]     = useState<TypeFilter>('all')
  const [catFilter,      setCatFilter]      = useState<CatFilter>('all')
  const [showAdvanced,   setShowAdvanced]   = useState(false)
  const [aiResults,      setAiResults]      = useState<AISearchResult[] | null>(null)
  const [aiLoading,      setAiLoading]      = useState(false)
  const [selected,       setSelected]       = useState<Roved5Service | null>(null)
  const [page,           setPage]           = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

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
  }, [debouncedQuery])

  useEffect(() => { setPage(1) }, [debouncedQuery, cloudFilter, typeFilter, catFilter])

  const serviceCategories = useMemo(() => {
    const map = new Map<string, ServiceCategory | null>()
    services.forEach(s => map.set(s.id, categorizeService(s)))
    return map
  }, [])

  const catCounts = useMemo(() => {
    const counts: Record<ServiceCategory, number> = { security: 0, database: 0, storage: 0, compute: 0, ai_ml: 0, analytics: 0 }
    serviceCategories.forEach(cat => { if (cat) counts[cat]++ })
    return counts
  }, [serviceCategories])

  const awsCount = useMemo(() => services.filter(s => s.cloud === 'AWS').length, [])
  const gcpCount = useMemo(() => services.filter(s => s.cloud === 'GCP').length, [])

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
  if (catFilter   !== 'all') displayed = displayed.filter(s => serviceCategories.get(s.id) === catFilter)

  const isAIMode = !!aiResults && query.trim().length >= 3
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE)
  const pageItems  = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function reset() {
    setQuery('')
    setDebouncedQuery('')
    setAiResults(null)
    setCloudFilter('all')
    setTypeFilter('all')
    setCatFilter('all')
    setPage(1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>רובד 5</h1>
        <p className={styles.pageSub}>
          {services.length.toLocaleString()} שירותי ענן מאושרים לרכישה
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
        <button
          className={`${styles.advancedToggle} ${(showAdvanced || catFilter !== 'all') ? styles.advancedToggleActive : ''}`}
          onClick={() => setShowAdvanced(s => !s)}
        >
          ⚙️ פילטרים מתקדמים{catFilter !== 'all' ? ` · ${CAT_LABELS[catFilter as ServiceCategory]}` : ''}
        </button>
      </div>

      {showAdvanced && (
        <div className={styles.advancedPanel}>
          <button
            className={`${styles.chip} ${catFilter === 'all' ? styles.chipActive : ''}`}
            onClick={() => setCatFilter('all')}
          >
            כל הקטגוריות
          </button>
          {(Object.keys(CAT_LABELS) as ServiceCategory[]).map(f => (
            <button
              key={f}
              className={`${styles.chip} ${catFilter === f ? styles.chipActive : ''}`}
              onClick={() => setCatFilter(prev => prev === f ? 'all' : f)}
            >
              {CAT_ICONS[f]} {CAT_LABELS[f]} ({catCounts[f]})
            </button>
          ))}
        </div>
      )}

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

      {selected && <ServiceModal service={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
