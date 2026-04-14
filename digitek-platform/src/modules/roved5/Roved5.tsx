import { useState, useEffect, useCallback, useRef } from 'react'
import type { Roved5Service, AISearchResult } from './types'
import { aiSearch, keywordSearch } from './roved5AI'
import { ServiceCard } from './ServiceCard'
import { ServiceModal } from './ServiceModal'
import styles from './Roved5.module.css'
import allServices from '../../data/roved5Services.json'

const services = allServices as Roved5Service[]

type CloudFilter = 'all' | 'AWS' | 'GCP'
type TypeFilter = 'all' | 'SaaS' | 'non-SaaS'

export function Roved5() {
  const [query, setQuery] = useState('')
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [aiResults, setAiResults] = useState<AISearchResult[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [selected, setSelected] = useState<Roved5Service | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerAiSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 3) {
      setAiResults(null)
      return
    }
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

  // Build displayed services
  let displayed: Roved5Service[]

  if (aiResults && query.trim().length >= 3) {
    // AI mode: order by AI results, then apply cloud/type filters
    const aiMap = new Map(aiResults.map(r => [r.id, r]))
    displayed = aiResults
      .map(r => services.find(s => s.id === r.id))
      .filter((s): s is Roved5Service => !!s)
  } else if (query.trim().length >= 2) {
    // Keyword fallback
    displayed = keywordSearch(query, services)
  } else {
    displayed = services
  }

  // Apply cloud/type filters
  if (cloudFilter !== 'all') displayed = displayed.filter(s => s.cloud === cloudFilter)
  if (typeFilter !== 'all') displayed = displayed.filter(s => s.type === typeFilter)

  const isAIMode = !!aiResults && query.trim().length >= 3
  const awsCount = services.filter(s => s.cloud === 'AWS').length
  const gcpCount = services.filter(s => s.cloud === 'GCP').length

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>רובד 5</h1>
        <p className={styles.heroSub}>
          קטלוג שירותי ענן מאושרים לרכישה — {services.length} שירותים זמינים
        </p>

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="תאר מה אתה צריך... לדוגמה: כלי לניתוח טקסט, גיבוי נתונים, שיחות וידאו"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {aiLoading && <span className={styles.searchSpinner}>⟳</span>}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          {(['all', 'AWS', 'GCP'] as CloudFilter[]).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${cloudFilter === f ? styles.filterActive : ''}`}
              onClick={() => setCloudFilter(f)}
            >
              {f === 'all' ? `הכל (${services.length})` : f === 'AWS' ? `AWS (${awsCount})` : `GCP (${gcpCount})`}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          {(['all', 'SaaS', 'non-SaaS'] as TypeFilter[]).map(f => (
            <button
              key={f}
              className={`${styles.filterBtn} ${typeFilter === f ? styles.filterActive : ''}`}
              onClick={() => setTypeFilter(f)}
            >
              {f === 'all' ? 'כל הסוגים' : f}
            </button>
          ))}
        </div>

        <div className={styles.resultsInfo}>
          {isAIMode && (
            <span className={styles.aiBadge}>✨ חיפוש חכם</span>
          )}
          <span className={styles.resultsCount}>{displayed.length} תוצאות</span>
        </div>
      </div>

      {/* Grid */}
      {displayed.length === 0 ? (
        <div className={styles.empty}>
          <p>לא נמצאו שירותים מתאימים</p>
          <button className={styles.clearBtn} onClick={() => { setQuery(''); setAiResults(null) }}>נקה חיפוש</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {displayed.map(service => {
            const aiResult = aiResults?.find(r => r.id === service.id)
            return (
              <ServiceCard
                key={service.id}
                service={service}
                aiResult={aiResult}
                onClick={() => setSelected(service)}
              />
            )
          })}
        </div>
      )}

      {selected && (
        <ServiceModal service={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
