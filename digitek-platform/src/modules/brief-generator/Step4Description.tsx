import { useState } from 'react'
import type { WizardState } from './types'
import { generateBriefSuggestion } from './briefAIHelper'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onChange: (field: keyof WizardState['projectDescription'], value: string) => void
  onNext: () => void
  onBack: () => void
}

export function Step4Description({ state, onChange, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { projectDescription, selectedSpecialization, projectDetails } = state

  const canContinue =
    projectDescription.general.trim().length > 0 ||
    projectDescription.currentSituation.trim().length > 0 ||
    projectDescription.goals.trim().length > 0

  async function handleAI() {
    if (!selectedSpecialization) return
    setLoading(true)
    setError('')
    try {
      const result = await generateBriefSuggestion(selectedSpecialization, {
        name: projectDetails.name,
        ministry: projectDetails.ministry,
        estimatedBudget: projectDetails.estimatedBudget,
      })
      onChange('general', result.general)
      onChange('currentSituation', result.currentSituation)
      onChange('goals', result.goals)
    } catch (e) {
      setError('שגיאה בקבלת הצעת ה-AI. בדוק את חיבור האינטרנט ונסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  const specType = selectedSpecialization?.id.split('.')[0] ?? ''
  const tipMap: Record<string, string> = {
    '8': 'טיפ לאשכול פיתוח: ציין שפות תכנות, סביבות קיימות, CI/CD ודרישות ביצועים',
    '6': 'טיפ לאשכול ענן: ציין סביבות קיימות (on-premise / ענן), נפחי נתונים ודרישות זמינות',
    '11': 'טיפ לאשכול אבטחה: ציין סוג הסביבה (web/infra/mobile), טכנולוגיות ורמת סיווג',
    '1': 'טיפ לאשכול עיצוב: ציין קהלי יעד, מערכות קיימות וסטנדרטים ממשלתיים רלוונטיים',
    '5': 'טיפ לאשכול דאטה: ציין מקורות נתונים קיימים, כמויות וכלים אנליטיים בשימוש',
  }
  const tip = tipMap[specType] ?? ''

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>תיאור הצורך</h2>
        <p>פרט את הצורך, המצב הקיים והמטרות של הפרויקט</p>
      </div>

      {tip && (
        <div style={{
          background: 'var(--teal-pale)', border: '1px solid var(--teal3)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: 'var(--teal)',
        }}>
          💡 {tip}
        </div>
      )}

      <div className={s.aiBtnRow}>
        <button className={s.aiBtn} onClick={handleAI} disabled={loading || !selectedSpecialization}>
          {loading ? '⏳ מייצר הצעה...' : '✨ עזרת AI — מלא בשבילי'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      <div className={s.cardBox}>
        <div className={s.field}>
          <label className={s.fieldLabel}>תיאור כללי של הפרויקט</label>
          <textarea
            className={s.textarea}
            placeholder="תאר את הפרויקט בכללותו — מה הוא, למה הוא חשוב..."
            value={projectDescription.general}
            onChange={e => onChange('general', e.target.value)}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>המצב הקיים / הבעיה</label>
          <textarea
            className={s.textarea}
            placeholder="תאר את המצב הקיים, הבעיות והפערים שיש לתת להם מענה..."
            value={projectDescription.currentSituation}
            onChange={e => onChange('currentSituation', e.target.value)}
          />
        </div>

        <div className={s.field}>
          <label className={s.fieldLabel}>מטרות הפרויקט</label>
          <textarea
            className={s.textarea}
            placeholder="פרט את המטרות הספציפיות שהפרויקט אמור להשיג..."
            value={projectDescription.goals}
            onChange={e => onChange('goals', e.target.value)}
          />
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>‹ חזרה</button>
        <button className={s.btnPrimary} onClick={onNext} disabled={!canContinue}>
          המשך לבחירת תוצרים ›
        </button>
      </div>
    </div>
  )
}
