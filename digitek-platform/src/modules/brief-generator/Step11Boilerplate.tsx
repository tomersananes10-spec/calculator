import { useState } from "react"
import type { WizardState, BoilerplateSections } from "./types"
import { DEFAULT_BOILERPLATE } from "./wordExportBoilerplate"
import s from "./BriefWizard.module.css"

interface Props {
  state: WizardState
  onChange: (path: string, value: unknown) => void
  onNext: () => void
  onBack: () => void
  onSave: () => void
}

const SECTIONS: { key: keyof BoilerplateSections; title: string; number: string }[] = [
  { key: "implementationApproach", title: "אפיון מהלך העבודה", number: "2.1" },
  { key: "developmentRequirements", title: "דרישות פיתוח ואינטגרציה", number: "2.1.2" },
  { key: "techArchitecture", title: "טכנולוגיות ודגשים לארכיטקטורה", number: "2.1.3" },
  { key: "methodology", title: "מתודולוגיית פיתוח", number: "2.1.4" },
  { key: "nimbusBackground", title: "רקע והנחיות לפרויקט בנימבוס", number: "2.2" },
  { key: "projectScope", title: "היקף הפרויקט והתוצרים", number: "2.5" },
  { key: "serviceLocationDesc", title: "מקום מתן השירותים", number: "2.6" },
  { key: "regulations", title: "נהלים", number: "2.7" },
  { key: "performanceTesting", title: "בדיקות ביצועים", number: "2.9" },
  { key: "securityTesting", title: "בדיקות אבטחת מידע", number: "2.10" },
  { key: "environments", title: "סביבות", number: "2.11" },
  { key: "documentation", title: "תיעוד", number: "2.12" },
  { key: "deliveryTesting", title: "בדיקות מסירה", number: "2.13" },
  { key: "acceptanceTesting", title: "בדיקות קבלה", number: "2.14" },
  { key: "warrantyMaintenance", title: "אחריות ותחזוקה", number: "2.16" },
]

export function Step11Boilerplate({ state, onChange, onNext, onBack, onSave }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const sections = state.boilerplateSections

  function initDefaults() {
    const merged: BoilerplateSections = { ...sections }
    for (const sec of SECTIONS) {
      if (!merged[sec.key]) {
        merged[sec.key] = DEFAULT_BOILERPLATE[sec.key]
      }
    }
    onChange("boilerplateSections", merged)
  }

  const hasEmpty = SECTIONS.some(sec => !sections[sec.key])

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>סעיפי מימוש — נוסח ממשלתי</h2>
        <p>סעיפים אלה מוגדרים בתבנית הרשמית של רשות התקשוב. ניתן לערוך או להשאיר כמו שזה.</p>
      </div>

      {hasEmpty && (
        <button
          onClick={initDefaults}
          style={{
            background: 'var(--primary-bg)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius)',
            padding: '10px 20px',
            color: 'var(--primary)',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          טען ברירות מחדל לכל הסעיפים הריקים
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SECTIONS.map((sec, idx) => {
          const isExpanded = expandedIdx === idx
          const value = sections[sec.key] || ""
          return (
            <div key={sec.key} style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}>
              <div
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isExpanded ? 'var(--primary-bg)' : 'var(--surface)',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--surface)',
                    border: '1px solid var(--primary)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    minWidth: 40,
                    textAlign: 'center',
                  }}>
                    {sec.number}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                    {sec.title}
                  </span>
                  {value && (
                    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>מלא</span>
                  )}
                </div>
                <span style={{ fontSize: 18, color: 'var(--text3)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </div>

              {isExpanded && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <textarea
                    className={s.tableInput}
                    value={value}
                    onChange={e => onChange(`boilerplateSections.${sec.key}`, e.target.value)}
                    rows={10}
                    style={{ width: '100%', resize: 'vertical', lineHeight: 1.7, fontSize: 13 }}
                    placeholder={`הכנס את הטקסט עבור סעיף ${sec.number}...`}
                    dir="rtl"
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => onChange(`boilerplateSections.${sec.key}`, DEFAULT_BOILERPLATE[sec.key])}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: 'var(--text2)',
                      }}
                    >
                      אפס לברירת מחדל
                    </button>
                    {value && (
                      <button
                        onClick={() => onChange(`boilerplateSections.${sec.key}`, "")}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: 'var(--red)',
                        }}
                      >
                        נקה
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>חזרה</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={s.btnSecondary} onClick={onSave}>שמור</button>
          <button className={s.btnPrimary} onClick={onNext}>המשך</button>
        </div>
      </div>
    </div>
  )
}
