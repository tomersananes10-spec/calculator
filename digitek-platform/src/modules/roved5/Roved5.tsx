import { useState, useEffect, useCallback, useRef } from 'react'
import type { Roved5Service, AISearchResult } from './types'
import { aiSearch, keywordSearch } from './roved5AI'
import { ServiceCard } from './ServiceCard'
import { ServiceModal } from './ServiceModal'
import styles from './Roved5.module.css'
import allServices from '../../data/roved5Services.json'

const services = allServices as Roved5Service[]

const SUGGESTIONS = ['גיבוי נתונים', 'ניתוח טקסט', 'ניהול זהויות', 'אבטחת רשת', 'BI ודשבורדים', 'שיחות וידאו']

type CloudFilter = 'all' | 'AWS' | 'GCP'
type TypeFilter  = 'all' | 'SaaS' | 'non-SaaS'

export function Roved5() {
  const [query,       setQuery]       = useState('')
  const [cloudFilter, setCloudFilter] = useState<CloudFilter>('all')
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>('all')
  const [aiResults,   setAiResults]   = useState<AISearchResult[] | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [selected,    setSelected]    = useState<Roved5Service | null>(null)
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

  const isAIMode    = !!aiResults && query.trim().length >= 3
  const awsCount    = services.filter(s => s.cloud === 'AWS').length
  const gcpCount    = services.filter(s => s.cloud === 'GCP').length
  const hasSearched = query.trim().length >= 1 || cloudFilter !== 'all' || typeFilter !== 'all'

  const handleSuggestion = (text: string) => {
    setQuery(text)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleReset = () => {
    setQuery('')
    setAiResults(null)
    setCloudFilter('all')
    setTypeFilter('all')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  return (
    <div className={styles.page}>

      {/* ── Empty / Search-First State ── */}
      {!hasSearched && (
        <div className={styles.emptyState}>
          <div className={styles.bigIcon}>⚖️</div>
          <h1 className={styles.bigTitle}>רובד 5</h1>
          <p className={styles.bigSub}>{services.length} שירותי ענן מאושרים — תאר מה אתה צריך</p>

          <div className={styles.bigSearch}>
            <span className={styles.bigSearchIcon}>🔍</span>
            <input
              ref={inputRef}
              className={styles.bigSearchInput}
              type="text"
              placeholder="לדוגמה: גיבוי נתונים, ניהול זהויות, שיחות וידאו..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {aiLoading && <span className={styles.bigSearchSpinner}>⟳</span>}
          </div>

          <div className={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <button key={s} className={styles.suggestion} onClick={() => handleSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results State ── */}
      {hasSearched && (
        <>
          {/* Compact sticky bar */}
          <div className={styles.compactBar}>
            <div className={styles.compactSearch}>
              <span className={styles.compactSearchIcon}>🔍</span>
              <input
                ref={inputRef}
                className={styles.compactSearchInput}
                type="text"
                placeholder="חפש שוב..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {aiLoading && <span className={styles.compactSpinner}>⟳</span>}
            </div>

            <div className={styles.filtersInline}>
              {(['all', 'AWS', 'GCP'] as CloudFilter[]).map(f => (
                <button
                  key={f}
                  className={`${styles.filterChip} ${cloudFilter === f ? styles.filterChipActive : ''}`}
                  onClick={() => setCloudFilter(f)}
                >
                  {f === 'all' ? `הכל (${services.length})` : f === 'AWS' ? `AWS (${awsCount})` : `GCP (${gcpCount})`}
                </button>
              ))}
              {(['all', 'SaaS', 'non-SaaS'] as TypeFilter[]).map(f => (
                <button
                  key={f}
                  className={`${styles.filterChip} ${typeFilter === f ? styles.filterChipActive : ''}`}
                  onClick={() => setTypeFilter(f)}
                >
                  {f === 'all' ? 'כל הסוגים' : f}
                </button>
              ))}
            </div>

            <div className={styles.resultsInfo}>
              {isAIMode && <span className={styles.aiBadge}>✨ חיפוש חכם</span>}
              <span className={styles.resultsCount}>{displayed.length} תוצאות</span>
            </div>

            <button className={styles.resetBtn} onClick={handleReset}>✕ נקה</button>
          </div>

          {/* Grid or empty state */}
          {displayed.length === 0 ? (
            <div className={styles.emptyResults}>
              <p>לא נמצאו שירותים מתאימים</p>
              <button className={styles.clearBtn} onClick={handleReset}>נקה חיפוש</button>
            </div>
          ) : (
            <div className={styles.grid}>
              {displayed.map((service, index) => {
                const aiResult = aiResults?.find(r => r.id === service.id)
                return (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    aiResult={aiResult}
                    onClick={() => setSelected(service)}
                    animationDelay={Math.min(index, 11) * 60}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      {selected && <ServiceModal service={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
