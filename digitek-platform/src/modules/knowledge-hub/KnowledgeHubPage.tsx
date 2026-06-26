import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCreateJourney } from './hooks/useJourney'
import { useJourneys } from './hooks/useJourneys'
import { JourneyResultView } from './JourneyResultView'
import styles from './KnowledgeHubPage.module.css'

const EXAMPLE_PROMPTS = [
  'אני רוצה לצאת לפרויקט AI בענן נימבוס לזיהוי תמונות',
  'אני צריך לקנות 50 רישיונות לכלי אבטחת מידע',
  'אני רוצה לפתח אפליקציית מובייל למשרד',
  'יש לי תקציב לשירותי דאטה — מה האפשרויות?',
]

export function KnowledgeHubPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const journeyId = searchParams.get('journey')
  const [wish, setWish] = useState('')
  const { create, creating, error } = useCreateJourney()
  const { journeys } = useJourneys()
  const abortRef = useRef<AbortController | null>(null)

  // Reset input when leaving result mode
  useEffect(() => {
    if (!journeyId) setWish('')
  }, [journeyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wish.trim() || creating) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const id = await create(wish, controller.signal)
    if (id) {
      setSearchParams({ journey: id })
    }
  }

  function handleNewSearch() {
    setSearchParams({})
    setWish('')
  }

  if (journeyId) {
    return (
      <div className={styles.resultPage}>
        <div className={styles.resultHeader}>
          <button type="button" className={styles.brandSmall} onClick={handleNewSearch}>
            LIBA
          </button>
          <button type="button" className={styles.newBtn} onClick={handleNewSearch}>
            + חיפוש חדש
          </button>
        </div>
        <JourneyResultView journeyId={journeyId} />
      </div>
    )
  }

  return (
    <div className={styles.searchPage}>
      <div className={styles.searchInner}>
        <h1 className={styles.brand}>LIBA</h1>
        <p className={styles.tagline}>מה אתה רוצה להשיג היום?</p>

        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <input
            type="text"
            className={styles.searchInput}
            value={wish}
            onChange={e => setWish(e.target.value)}
            placeholder="לדוגמה: אני רוצה לצאת לפרויקט AI..."
            disabled={creating}
            autoFocus
          />
          <button
            type="submit"
            className={styles.searchBtn}
            disabled={!wish.trim() || creating}
          >
            {creating ? '⏳ חושב...' : '🔍 מצא לי'}
          </button>
        </form>

        {error && <div className={styles.errorBox}>שגיאה: {error}</div>}

        <div className={styles.examples}>
          {EXAMPLE_PROMPTS.map(ex => (
            <button
              key={ex}
              type="button"
              className={styles.exampleChip}
              onClick={() => setWish(ex)}
              disabled={creating}
            >
              {ex}
            </button>
          ))}
        </div>

        {journeys.length > 0 && (
          <div className={styles.recent}>
            <div className={styles.recentLabel}>המסעות שלי ({journeys.length})</div>
            <div className={styles.recentList}>
              {journeys.slice(0, 5).map(j => (
                <button
                  key={j.id}
                  type="button"
                  className={styles.recentItem}
                  onClick={() => setSearchParams({ journey: j.id })}
                  title={j.wish_text}
                >
                  <span className={styles.recentText}>{j.wish_text}</span>
                  {j.status === 'completed' && <span className={styles.recentDone}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
