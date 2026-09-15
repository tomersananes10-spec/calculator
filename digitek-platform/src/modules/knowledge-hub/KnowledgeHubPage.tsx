import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCreateJourney } from './hooks/useJourney'
import { JourneyResultView } from './JourneyResultView'
import { AnswerView } from './AnswerView'
import type { AdvisorResponse } from './types'
import styles from './KnowledgeHubPage.module.css'

const EXAMPLE_PROMPTS = [
  'אני רוצה את טבלת התעריפים של התכ"ם להורדה',
  'מה ההבדל בין רובד 5 להליך מכרז?',
  'אני רוצה לצאת לפרויקט AI בענן נימבוס לזיהוי תמונות',
  'אני רוצה לפתח אפליקציית מובייל למשרד',
]

export function KnowledgeHubPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const journeyId = searchParams.get('journey')
  const [wish, setWish] = useState(() => searchParams.get('wish') ?? '')
  const [answer, setAnswer] = useState<{ wish: string; response: AdvisorResponse } | null>(null)
  const { create, creating, error } = useCreateJourney()
  const abortRef = useRef<AbortController | null>(null)

  // Reset input when leaving result mode; prefill from ?wish= (e.g. from the
  // "build me a journey" button in the אשכולות והתמחויות module).
  useEffect(() => {
    if (!journeyId) setWish(searchParams.get('wish') ?? '')
  }, [journeyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wish.trim() || creating) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const result = await create(wish, controller.signal)
    if (!result) return
    if (result.kind === 'answer') {
      setAnswer({ wish: wish.trim(), response: result.response })
    } else {
      setSearchParams({ journey: result.id })
    }
  }

  function handleNewSearch() {
    setAnswer(null)
    setSearchParams({})
    setWish('')
  }

  if (answer) {
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
        <AnswerView wish={answer.wish} response={answer.response} onNewSearch={handleNewSearch} />
      </div>
    )
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
        <p className={styles.subBrand}>המערכת שתתמוך בליבה שלך</p>
        <p className={styles.tagline}>שאל אותי כל דבר על הרכש — או תאר פרויקט שתרצה להוציא לפועל</p>

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

      </div>
    </div>
  )
}
