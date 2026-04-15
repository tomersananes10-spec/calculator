import { useState, useCallback, useRef, useEffect } from 'react'
import type { Roved5Service, AISearchResult } from './types'
import { aiSearch, keywordSearch } from './roved5AI'
import { ServiceModal } from './ServiceModal'
import styles from './Roved5.module.css'
import allServices from '../../data/roved5Services.json'

const services = allServices as Roved5Service[]

type CloudFilter = 'all' | 'AWS' | 'GCP'
type TypeFilter  = 'all' | 'SaaS' | 'non-SaaS'
type CatFilter   = 'all' | 'compute' | 'storage' | 'database' | 'ai_ml' | 'security' | 'analytics'

const CAT_LABELS: Record<CatFilter, string> = {
  all:       'הכל',
  compute:   'Compute',
  storage:   'Storage',
  database:  'Database',
  ai_ml:     'AI/ML',
  security:  'Security',
  analytics: 'Analytics',
}

const PAGE_SIZE = 25

export function Roved5() {
  const [query,       setQuery]       = useState('')
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all')
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>('all')
  const [catFilter,   setCatFilter]   = useState<CatFilter>('all')
  const [aiResults,   setAiResults]   = useState<AISearchResult[] | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [selected,    setSelected]    = useState<Roved5Service | null>(null)
  const [page,        setPage]        = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef    = useRef<HTMLInputElement>(null)

  const triggerAiSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 3) { setAiResults(null); return }
    setAiLoading(true)
    const results = await aiSearch(q, services)
    setAiResults(results.length > 0 ? results : null)
    setAiLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => triggerAiSearch(query), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, triggerAiSearch])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [query, cloudFilter, typeFilter, catFilter])

  // Build displayed list
  let displayed: Roved5Service[]
  if (aiResults && query.trim().length >= 3) {
    displayed = aiResults.map(r => services.find(s => s.id === r.id)).filter((s): s is Roved5Service => !!s)
  } else if (query.trim().length >= 2) {
    displayed = keywordSearch(query, services)
  } else {
    displayed = services
  }
  if (cloudFilter !== 'all') displayed = displayed.filter(s => s.cloud === cloudFilter)
  if (typeFilter  !== 'all') displayed = displayed.filter(s => s.type  === typeFilter)

  const awsCount = services.filter(s => s.cloud === 'AWS').length
  const gcpCount = services.filter(s => s.cloud === 'GCP').length
  const isAIMode = !!aiResults && query.trim().length >= 3

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE)
  const pageItems  = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function reset() {
    setQuery('')
    setAiResults(null)
    setCloudFilter('all')
    setTypeFilter('all')
    setCatFilter('all')
    setPage(1)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>קטלוג רובד 5</h1>
          <p className={styles.pageSub}>
            {services.length.toLocaleString()} שירותים · GCP: {gcpCount} · AWS: {awsCount}
          </p>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="חיפוש שירותי ענן..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {aiLoading && <span className={styles.spinner}>⟳</span>}
          {query && <button className={styles.clearBtn} onClick={reset}>✕</button>}
        </div>
        <button className={styles.aiBtn} onClick={() => inputRef.current?.focus()}>
          🤖 AI Recommend
        </button>
      </div>

      {/* Filter chips */}
      <div className={styles.filterRow}>
        {/* Cloud */}
        {(['all', 'GCP', 'AWS'] as CloudFilter[]).map(f => (
          <button
            key={f}
            className={`${styles.chip} ${cloudFilter === f ? styles.chipActive : ''}`}
            onClick={() => setCloudFilter(f)}
          >
            {f === 'all' ? `הכל (${services.length})` : f === 'AWS' ? `AWS (${awsCount})` : `GCP (${gcpCount})`}
          </button>
        ))}
        <span className={styles.chipDivider} />
        {/* Type */}
        {(['SaaS', 'non-SaaS'] as TypeFilter[]).map(f => (
          <button
            key={f}
            className={`${styles.chip} ${typeFilter === f ? styles.chipActive : ''}`}
            onClick={() => setTypeFilter(prev => prev === f ? 'all' : f)}
          >
            {f}
          </button>
        ))}
        <span className={styles.chipDivider} />
        {/* Category */}
        {(Object.keys(CAT_LABELS) as CatFilter[]).slice(1).map(f => (
          <button
            key={f}
            className={`${styles.chip} ${catFilter === f ? styles.chipActive : ''}`}
            onClick={() => setCatFilter(prev => prev === f ? 'all' : f)}
          >
            {CAT_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Results info */}
      <div className={styles.resultsInfo}>
        {isAIMode && <span className={styles.aiBadge}>✨ חיפוש חכם</span>}
        <span className={styles.resultsCount}>
          מציג {Math.min((page - 1) * PAGE_SIZE + 1, displayed.length)}–{Math.min(page * PAGE_SIZE, displayed.length)} מתוך {displayed.length.toLocaleString()}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מק"ט</th>
              <th>שירות</th>
              <th>ספק</th>
              <th>יצרן</th>
              <th>סוג</th>
              <th>הנחה %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyRow}>לא נמצאו שירותים מתאימים</td>
              </tr>
            ) : (
              pageItems.map(service => {
                const aiResult = aiResults?.find(r => r.id === service.id)
                const discount = typeof service.discount === 'number' ? `${service.discount}%` : service.discount || '—'
                return (
                  <tr key={service.id} onClick={() => setSelected(service)} className={styles.tableRow}>
                    <td><code className={styles.sku}>{service.id}</code></td>
                    <td>
                      <div className={styles.serviceName}>{service.name}</div>
                      <div className={styles.serviceDesc}>{service.description}</div>
                      {aiResult && <div className={styles.aiReason}>✨ {aiResult.reason}</div>}
                    </td>
                    <td>{service.provider}</td>
                    <td>
                      <span className={`${styles.mfgBadge} ${service.cloud === 'GCP' ? styles.mfgGCP : styles.mfgAWS}`}>
                        {service.manufacturer || service.cloud}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.typeBadge} ${service.type === 'SaaS' ? styles.typeSaaS : styles.typeNonSaaS}`}>
                        {service.type}
                      </span>
                    </td>
                    <td className={styles.discountCell}>{discount}</td>
                    <td>
                      <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
                        <button className={styles.actionBtn} onClick={() => setSelected(service)}>פרטים</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
