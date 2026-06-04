import { useState } from 'react'
import type { AimlState, AimlSize } from './types'
import type { AimlDispatch } from './useAimlCalculator'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import s from '../takam-calculator/TakamCalculator.module.css'

interface AiRec {
  itemId: string
  size: AimlSize
  baseQty: number
  extraQty: number
  reason?: string
}

interface Props {
  state: AimlState
  dispatch: AimlDispatch
}

function buildSystemPrompt() {
  const list = AIML_ITEMS.map(item => {
    const sizes = (['small', 'medium', 'large'] as const)
      .map(sz => `${AIML_SIZE_LABELS[sz]}=${item.prices[sz]}₪ (${item.scope[sz]})`)
      .join(' | ')
    return `${item.id} | ${item.name} | ${sizes}`
  }).join('\n')

  return `אתה יועץ בכיר לתמחור פרויקטי AI/ML עבור גופים ממשלתיים ישראליים, מתמחה בסעיף 3.16 (ייעוץ ויישום AI/ML בענן) של מכרזי LIBA.

## תוצרי AI/ML הזמינים בסעיף 3.16
${list}

## גדלים — היגיון בחירה
- **קטן**: POC, פיילוט, או יישום מצומצם. דאטה סט בסיסי, מספר מודלים מועט, ללא אינטגרציה מורכבת.
- **בינוני**: יישום ארגוני בקנה מידה מוגבל. דאטה סט בגודל בינוני, פייפליין מסודר, תיעוד מלא.
- **גדול**: יישום ארגוני רחב היקף, נתונים מורכבים/זורמים, אינטגרציות, ניהול מודולרי וגרסאות.

## כללי המלצה
1. **מסמך אפיון מפורט** — כמעט תמיד נדרש כשלב פתיחה לפרויקטי AI/ML משמעותיים.
2. **תאם תוצר לבעיה**: אל תמליץ על LLM+RAG אם הצורך הוא ראייה ממוחשבת. בדוק התאמה סמנטית מדויקת.
3. **גודל לפי המורכבות**: פיילוט/POC ⇒ קטן, יישום ארגוני סטנדרטי ⇒ בינוני, יישום קריטי או דאטה זורם בקנה מידה גדול ⇒ גדול.
4. **MLOps + FINOps + ניטור**: לפרויקטים גדולים שיעלו לפרודקשן, המלץ עליהם גם.
5. **UI/UX**: אם הפרויקט כולל אינטראקציה אנושית, המלץ על "פיתוח הנגשת משתמש".
6. **GenAI/LLM+RAG**: המלץ רק כשמתאים — בוטים, סיכומים, אנליזת מסמכים. לא לסיווג רגיל.
7. **כמות בסיס לרוב 1** — אלא אם הפרויקט כולל מספר תתי-מערכות שדורשות אותו רכיב.

## פורמט יחס
- itemId: השתמש רק ב-id מהרשימה למעלה.
- size: 'small' / 'medium' / 'large' בלבד.
- baseQty: בדרך כלל 1, יותר רק אם יש סיבה ברורה (multi-domain, multi-tenant).
- extraQty: 0 ברירת מחדל. הצעת תוספת רק אם המשתמש מתכוון להרחבה צפויה.

ענה תמיד בעברית.`
}

function buildUserPrompt(desc: string) {
  return `נתח את הפרויקט הבא והמלץ על תוצרי AI/ML מתאימים מסעיף 3.16.

תיאור הפרויקט:
${desc}

החזר JSON בלבד (ללא טקסט נוסף, ללא markdown, ללא בלוקי קוד) בפורמט הבא:
{"summary":"ניתוח של 3-4 משפטים שמסביר את הלוגיקה: איזה אתגרי AI/ML זוהו, מדוע נבחרו תוצרים אלה ומה הדגשים","items":[{"itemId":"spec","size":"medium","baseQty":1,"extraQty":0,"reason":"הסבר ספציפי למה תוצר זה בגודל זה נדרש לפרויקט הזה"}]}`
}

export function AimlAiAdvisorModal({ state, dispatch }: Props) {
  const [open, setOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [recs, setRecs] = useState<AiRec[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())

  function openModal() {
    setOpen(true)
  }

  function closeModal() {
    const advisorTouched = added.size > 0 || recs.some(r => state.entries[r.itemId]?.checked)
    if (advisorTouched && state.currentStep < 3) {
      const filled = state.project.name.trim() && state.project.ministry.trim()
      if (filled) {
        dispatch({ type: 'GO_STEP', payload: 3 })
      }
    }
    setOpen(false)
  }

  async function analyze() {
    if (!desc.trim()) return
    setLoading(true)
    setError('')
    setSummary('')
    setRecs([])
    setAdded(new Set())

    try {
      const fullPrompt = buildSystemPrompt() + '\n\n' + buildUserPrompt(desc.trim())
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        const msg = data.error?.message ?? `שגיאת שרת (${res.status})`
        if (res.status === 429) {
          setError('חרגת ממגבלת הבקשות, נסה שוב בעוד דקה')
        } else {
          setError(msg)
        }
        return
      }

      let raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
      raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

      let parsed: { summary: string; items: AiRec[] }
      try {
        parsed = JSON.parse(raw)
      } catch {
        setError('לא הצלחנו לנתח את התשובה, נסה שוב')
        return
      }

      const validItems = (parsed.items ?? []).filter(r =>
        AIML_ITEMS.some(it => it.id === r.itemId) &&
        ['small', 'medium', 'large'].includes(r.size)
      ).map(r => ({
        ...r,
        baseQty: Math.max(0, Math.floor(r.baseQty ?? 1)),
        extraQty: Math.max(0, Math.floor(r.extraQty ?? 0)),
      }))

      setSummary(parsed.summary ?? '')
      setRecs(validItems)
    } catch {
      setError('שגיאת חיבור, בדוק אינטרנט')
    } finally {
      setLoading(false)
    }
  }

  function addItem(rec: AiRec) {
    const entry = state.entries[rec.itemId]
    if (!entry?.checked) {
      dispatch({ type: 'TOGGLE_CHECK', payload: rec.itemId })
    }
    dispatch({ type: 'SET_SIZE', payload: { itemId: rec.itemId, size: rec.size } })
    dispatch({ type: 'SET_BASE_QTY', payload: { itemId: rec.itemId, qty: rec.baseQty } })
    dispatch({ type: 'SET_EXTRA_QTY', payload: { itemId: rec.itemId, qty: rec.extraQty } })
    setAdded(prev => new Set(prev).add(rec.itemId))
  }

  function addAll() {
    recs.forEach(rec => {
      if (!added.has(rec.itemId)) addItem(rec)
    })
  }

  return (
    <>
      <button className={s.aiFab} onClick={openModal}>
        <span>✨</span> התייעץ עם AI
      </button>

      {open && (
        <div className={s.aiOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className={s.aiModal}>
            <div className={s.aiModalHead}>
              <h2>✨ יועץ AI — תוצרי AI/ML</h2>
              <button className={s.aiModalClose} onClick={closeModal}>✕</button>
            </div>

            <div className={s.aiModalBody}>
              <div className={s.aiField}>
                <label className={s.aiLabel}>תאר את הפרויקט שלך</label>
                <textarea
                  className={s.aiTextarea}
                  placeholder="למשל: מערכת ניתוח מסמכים משרדית עם NLP, צ׳אטבוט מבוסס RAG על תקנות, ויכולות OCR לסריקת טפסים..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={4}
                />
              </div>

              <button
                className={s.aiBtnAnalyze}
                disabled={!desc.trim() || loading}
                onClick={analyze}
              >
                {loading ? <><span className={s.aiSpinner} /> מנתח...</> : '✨ נתח את הפרויקט'}
              </button>

              {error && <div className={s.aiError}>{error}</div>}

              {recs.length > 0 && (
                <div className={s.aiResults}>
                  <p className={s.aiResultsTitle}>המלצת AI לתוצרים</p>
                  {summary && <div className={s.aiSummary}>{summary}</div>}

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                    <button className={s.btnBack} onClick={addAll} style={{ fontSize: 12, padding: '7px 14px' }}>
                      + הוסף הכל
                    </button>
                  </div>

                  <div className={s.aiRolesList}>
                    {recs.map(rec => {
                      const item = AIML_ITEMS.find(it => it.id === rec.itemId)
                      if (!item) return null
                      const entry = state.entries[rec.itemId]
                      const isAdded = added.has(rec.itemId) || (entry?.checked && entry.size === rec.size)
                      return (
                        <div key={rec.itemId} className={s.aiRoleRow}>
                          <div className={s.aiRoleInfo}>
                            <div className={s.aiRoleName}>{item.icon} {item.name}</div>
                            <div className={s.aiRoleMeta}>
                              גודל: {AIML_SIZE_LABELS[rec.size]} | כמות: {rec.baseQty}{rec.extraQty > 0 ? ` + ${rec.extraQty}` : ''} | ₪{(item.prices[rec.size] * (rec.baseQty + rec.extraQty)).toLocaleString('he-IL')}
                            </div>
                            {rec.reason && <div className={s.aiRoleReason}>{rec.reason}</div>}
                          </div>
                          <button
                            className={s.aiAddBtn}
                            disabled={isAdded}
                            onClick={() => addItem(rec)}
                          >
                            {isAdded ? '✓ נוסף' : '+ הוסף'}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    className={`${s.btn} ${s.btnPrimary}`}
                    style={{ width: '100%', marginTop: 10 }}
                    onClick={closeModal}
                  >
                    סיים — עבור לקביעת גדלים וכמויות ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
