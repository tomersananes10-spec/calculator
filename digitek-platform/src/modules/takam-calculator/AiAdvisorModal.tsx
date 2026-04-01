import { useState } from 'react'
import type { CalcState, CalcAction, Level } from './types'
import s from './TakamCalculator.module.css'

const GEMINI_API_KEY = 'AIzaSyDzPyl4bQ4IqynKqGGEQsVc4p6XdwZXcTQ'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

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

function buildPrompt(rolesData: CalcState['rolesData'], desc: string) {
  const list = rolesData
    .filter(r => !r.custom)
    .map(r => `${r.id} | ${r.name} | קטגוריה: ${r.cat} | רמות: ${Object.keys(r.rates).join('/')}`)
    .join('\n')
  return `אתה יועץ לתמהיל משאבי IT לפרויקטים ממשלתיים ישראליים.
הנה תפקידי תכ"ם הזמינים:
${list}

על בסיס תיאור הפרויקט, החזר JSON בלבד (ללא טקסט נוסף, ללא markdown, ללא קוד בלוקים) בפורמט:
{"summary":"הסבר קצר של 2-3 משפטים","roles":[{"id":"1.1","level":"b","scope":100,"reason":"נדרש ל..."}]}
רמות: a=בסיסי, b=מתקדם, c=מומחה, d=בכיר. scope הוא % משרה (25/50/75/100).
החזר רק תפקידים רלוונטיים לפרויקט.

תאר פרויקט: ${desc}`
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
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(state.rolesData, desc.trim()) }] }],
        }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error?.message || `שגיאת שרת (${res.status})`)
        return
      }

      let raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
      raw = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

      let parsed: { summary: string; roles: AiRec[] }
      try { parsed = JSON.parse(raw) }
      catch { setError('לא הצלחנו לנתח את התשובה, נסה שוב'); return }

      setSummary(parsed.summary ?? '')
      setRecs(parsed.roles ?? [])
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
