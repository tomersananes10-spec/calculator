import { useState } from 'react'
import type { CalcState, CalcAction, Level } from './types'
import s from './TakamCalculator.module.css'

interface AiRec {
  id: string
  level: Level
  scope: number
  reason?: string
}

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

function buildSystemPrompt(rolesData: CalcState['rolesData']) {
  const list = rolesData
    .filter(r => !r.custom)
    .map(r => `${r.id} | ${r.name} | קטגוריה: ${r.cat} | רמות: ${Object.keys(r.rates).join('/')} | ${r.desc}`)
    .join('\n')

  return `אתה יועץ בכיר לתמהיל משאבי IT (תכ"ם) לפרויקטים ממשלתיים ישראליים.
יש לך ניסיון עמוק בבניית תמהילי כוח אדם למכרזי LIBA ורכש ממשלתי.

## תפקידי תכ"ם הזמינים
${list}

## רמות מקצועיות
- a = בסיסי (ג׳וניור, 0-3 שנות ניסיון)
- b = מתקדם (מידלבל, 3-6 שנות ניסיון)
- c = מומחה (סניור, 6-10 שנות ניסיון)
- d = בכיר (מוביל/ראש צוות, 10+ שנות ניסיון)

## scope — אחוז משרה
- 25% = יעוץ נקודתי / השתתפות חלקית (יום בשבוע)
- 50% = חצי משרה
- 75% = משרה כמעט מלאה
- 100% = משרה מלאה

## כללים לבניית תמהיל
1. **ניהול פרויקט**: כל פרויקט צריך לפחות PMO או אחראי פרויקט. פרויקט גדול (3+ צוותים) צריך שניהם.
2. **יחס מפתחים-בודקים**: על כל 3-4 מפתחים נדרש QA אחד לפחות.
3. **תשתיות**: פרויקט עם ענן/תשתיות צריך DevOps. פרויקט גדול צריך גם סיסטם ותפעול ענן.
4. **אבטחת מידע**: כל פרויקט ממשלתי צריך לפחות מיישם הגנת סייבר. פרויקט עם מידע רגיש — גם מומחה מתודולוגיות.
5. **דאטה**: פרויקט BI/דאטה צריך הנדסת נתונים + אנליטיקה. פרויקט AI/ML צריך גם מדע הנתונים.
6. **UX/UI**: כל פרויקט עם ממשק משתמש צריך אפיון UX/UI.
7. **הטמעה**: פרויקט עם משתמשי קצה צריך מדריך/מטמיע, ולעיתים גם תמיכה.
8. **ארכיטקטורה**: פרויקט מורכב (מערכות מרובות, אינטגרציות) צריך ארכיטקט פתרונות או ארכיטקט ראשי.
9. **ERP/SAP**: רק אם הפרויקט עוסק ב-ERP/SAP במפורש.
10. **רמה ו-scope**: התאם את הרמה למורכבות הפרויקט. פרויקט קטן — רוב התפקידים ב-50-75%. פרויקט גדול — רוב ב-100%.

## גודל פרויקט
- פרויקט קטן (עד 5 אנשי צוות): 3-5 תפקידים
- פרויקט בינוני (5-15 אנשים): 5-10 תפקידים
- פרויקט גדול (15+ אנשים): 8-15 תפקידים

ענה תמיד בעברית.`
}

function buildUserPrompt(desc: string) {
  return `נתח את הפרויקט הבא והמלץ על תמהיל משאבים מתאים.

תיאור הפרויקט:
${desc}

החזר JSON בלבד (ללא טקסט נוסף, ללא markdown, ללא בלוקי קוד) בפורמט הבא:
{"summary":"ניתוח של 3-4 משפטים שמסביר את הלוגיקה מאחורי בחירת התמהיל, איזה אתגרים זוהו, ומה הדגשים","roles":[{"id":"1.6","level":"c","scope":100,"reason":"הסבר ספציפי למה תפקיד זה נדרש בפרויקט הזה, בהקשר לתיאור שניתן"}]}`
}

export function AiAdvisorModal({ state, dispatch }: Props) {
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
    const hasAiRoles = added.size > 0 || (recs.length > 0 && recs.some(r => state.selectedIds.has(r.id)))
    if (hasAiRoles && state.currentStep === 1) {
      const filled = state.project.name.trim() && state.project.ministry.trim()
      if (filled) {
        dispatch({ type: 'GO_STEP', payload: 3 })
      } else {
        dispatch({ type: 'SET_AI_NEEDS_FILL', payload: true })
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

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      setError('מפתח API חסר — הגדר VITE_ANTHROPIC_API_KEY')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: buildSystemPrompt(state.rolesData),
          messages: [{ role: 'user', content: buildUserPrompt(desc.trim()) }],
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

      let raw = (data.content?.[0]?.text ?? '').trim()
      raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

      let parsed: { summary: string; roles: AiRec[] }
      try { parsed = JSON.parse(raw) }
      catch { setError('לא הצלחנו לנתח את התשובה, נסה שוב'); return }

      const validRoles = (parsed.roles ?? []).filter(r =>
        state.rolesData.some(rd => rd.id === r.id)
      )

      setSummary(parsed.summary ?? '')
      setRecs(validRoles)
    } catch {
      setError('שגיאת חיבור, בדוק אינטרנט')
    } finally {
      setLoading(false)
    }
  }

  function addRole(rec: AiRec) {
    dispatch({ type: 'ADD_AI_ROLE', payload: { id: rec.id, level: rec.level, scope: rec.scope } })
    setAdded(prev => new Set(prev).add(rec.id))
  }

  function addAll() {
    recs.forEach(rec => {
      if (!added.has(rec.id)) addRole(rec)
    })
  }

  const LEVEL_NAMES: Record<string, string> = { a: 'בסיסי', b: 'מתקדם', c: 'מומחה', d: 'בכיר' }

  return (
    <>
      <button className={s.aiFab} onClick={openModal}>
        <span>✨</span> התייעץ עם AI
      </button>

      {open && (
        <div className={s.aiOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className={s.aiModal}>
            <div className={s.aiModalHead}>
              <h2>✨ יועץ AI — תמהיל משאבים</h2>
              <button className={s.aiModalClose} onClick={closeModal}>✕</button>
            </div>

            <div className={s.aiModalBody}>
              <div className={s.aiField}>
                <label className={s.aiLabel}>תאר את הפרויקט שלך</label>
                <textarea
                  className={s.aiTextarea}
                  placeholder="למשל: מערכת BI ממשלתית, 18 חודשים, 3 משרדים, כולל פיתוח, דאטה ותשתיות..."
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
                  <p className={s.aiResultsTitle}>המלצת AI לתמהיל</p>
                  {summary && <div className={s.aiSummary}>{summary}</div>}

                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
                    <button className={s.btnBack} onClick={addAll} style={{ fontSize: 12, padding: '7px 14px' }}>
                      + הוסף הכל
                    </button>
                  </div>

                  <div className={s.aiRolesList}>
                    {recs.map(rec => {
                      const role = state.rolesData.find(r => r.id === rec.id)
                      const isAdded = added.has(rec.id) || state.selectedIds.has(rec.id)
                      return (
                        <div key={rec.id} className={s.aiRoleRow}>
                          <div className={s.aiRoleInfo}>
                            <div className={s.aiRoleName}>{role?.name ?? rec.id}</div>
                            <div className={s.aiRoleMeta}>
                              רמה: {LEVEL_NAMES[rec.level] ?? rec.level} | משרה: {rec.scope}%
                            </div>
                            {rec.reason && <div className={s.aiRoleReason}>{rec.reason}</div>}
                          </div>
                          <button
                            className={s.aiAddBtn}
                            disabled={isAdded}
                            onClick={() => addRole(rec)}
                          >
                            {isAdded ? '✓ נוסף' : '+ הוסף לתמהיל'}
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
                    סיים — חזור לבחירת תפקידים ›
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
