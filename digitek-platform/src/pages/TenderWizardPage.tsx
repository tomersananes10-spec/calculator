import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTender } from '../modules/tenders/hooks/useTender'
import { evaluateG1_Amount, evaluateG7_WinnerApproval, evaluateG9_ContractTemplate } from '../modules/tenders/data/gateways'
import type { SelectionType } from '../modules/tenders/types'
import styles from './TenderWizardPage.module.css'

const STEPS = [
  { num: 1, label: 'פרטים' },
  { num: 2, label: 'פיננסים' },
  { num: 3, label: 'קישורים' },
  { num: 4, label: 'סקירה' },
]

function formatAmount(n: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

export function TenderWizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [title, setTitle] = useState('')
  const [ministry, setMinistry] = useState('')

  // Step 2
  const [amount, setAmount] = useState<number>(0)
  const [selectionType, setSelectionType] = useState<SelectionType>('quality_price')
  const [serviceCluster, setServiceCluster] = useState<string>('')

  // Step 3
  // brief / calculation linking — לעתיד עם dropdowns אמיתיים. כרגע ידני (אופציונלי).
  const [briefId, setBriefId] = useState('')
  const [calculationId, setCalculationId] = useState('')

  const g1 = useMemo(() => evaluateG1_Amount(amount, selectionType), [amount, selectionType])
  const g7 = useMemo(() => evaluateG7_WinnerApproval(amount, selectionType), [amount, selectionType])
  const g9 = useMemo(() => evaluateG9_ContractTemplate(amount), [amount])

  const canAdvance = useMemo(() => {
    if (step === 1) return title.trim().length >= 3 && ministry.trim().length >= 2
    if (step === 2) return amount > 0
    return true
  }, [step, title, ministry, amount])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const result = await createTender({
      title: title.trim(),
      ministry: ministry.trim(),
      estimated_amount: amount,
      selection_type: selectionType,
      service_cluster: serviceCluster || null,
      requires_tender_editor: serviceCluster === 'nimbus' || serviceCluster === 'product_mgmt',
      brief_id: briefId.trim() || null,
      calculation_id: calculationId.trim() || null,
    })
    setSubmitting(false)
    if (!result.ok || !result.id) {
      setError(result.error ?? 'שגיאה ביצירת ההליך')
      return
    }
    navigate(`/tenders/${result.id}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>פתיחת הליך מכרז חדש</h1>
        <p className={styles.sub}>4 שלבים — לאחר היצירה הליך עובר אוטומטית לשלב 1 (ייזום ותקצוב)</p>
      </div>

      <div className={styles.stepper}>
        {STEPS.map(s => {
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} className={`${styles.stepCircle} ${isActive ? styles.active : ''} ${isDone ? styles.done : ''}`}>
              <div className={styles.stepNum}>{s.num}</div>
              <div className={styles.stepLabel}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>פרטי ההליך</h2>
          <p className={styles.panelSub}>שם בריר ומשרד מזמין — חובה</p>

          <div className={styles.formRow}>
            <label className={`${styles.label} ${styles.required}`}>שם ההליך</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="למשל: מערכת BI ממשרדית"
              maxLength={120}
            />
            <div className={styles.hint}>שם תיאורי. ניתן לשנות בהמשך.</div>
          </div>

          <div className={styles.formRow}>
            <label className={`${styles.label} ${styles.required}`}>משרד מזמין</label>
            <input
              className={styles.input}
              value={ministry}
              onChange={e => setMinistry(e.target.value)}
              placeholder="למשל: מערך הדיגיטל הלאומי"
              maxLength={120}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>פיננסים ובחירה</h2>
          <p className={styles.panelSub}>הסכום והסוג קובעים את המסלול (Gateway G1, G6, G7)</p>

          <div className={styles.formRow}>
            <label className={`${styles.label} ${styles.required}`}>סכום משוער (₪)</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              step={10000}
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="0"
            />
            <div className={styles.hint}>
              {amount > 0 && <>סכום: <strong>{formatAmount(amount)}</strong> · רצועה: <strong>{g1.band}</strong></>}
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>אופן בחירה</label>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${selectionType === 'price_only' ? styles.active : ''}`}
                onClick={() => setSelectionType('price_only')}
              >
                מחיר בלבד
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${selectionType === 'quality_price' ? styles.active : ''}`}
                onClick={() => setSelectionType('quality_price')}
              >
                איכות + מחיר
              </button>
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>אשכול שירות</label>
            <select className={styles.select} value={serviceCluster} onChange={e => setServiceCluster(e.target.value)}>
              <option value="">— ללא —</option>
              <option value="data">דאטה</option>
              <option value="ai_ml">AI / ML</option>
              <option value="infra">תשתיות</option>
              <option value="nimbus">נימבוס</option>
              <option value="product_mgmt">ניהול מוצר</option>
              <option value="other">אחר</option>
            </select>
            {(serviceCluster === 'nimbus' || serviceCluster === 'product_mgmt') && (
              <div className={styles.gatewayWarn}>
                <strong>G2:</strong> השירות דורש אישור עורך מכרז לפני יציאה לתיחור
              </div>
            )}
          </div>

          {amount > 0 && (
            <>
              {g1.requiresOlma && (
                <div className={styles.gatewayWarn}>
                  <strong>G1:</strong> סכום מעל 5M — נדרש אישור אלמ"ה (שלב S2) לפני ועדת מכרזים
                </div>
              )}
              {g1.isSimplePath && (
                <div className={styles.gatewayInfo}>
                  <strong>G1:</strong> מסלול פשוט — עד 200K + מחיר בלבד. ידלגו על ועדת מכרזים.
                </div>
              )}
              {!g1.isSimplePath && !g7.requiresWinnerCommittee && (
                <div className={styles.gatewayInfo}>
                  <strong>G7:</strong> אישור זוכה ע"י ועדה לא נדרש בתרחיש זה
                </div>
              )}
              {amount > 1000000 && (
                <div className={styles.gatewayInfo}>
                  <strong>G9:</strong> סכום מעל 1M — נדרשת ערבות וביטוח בהסכם (תבנית: {g9.templateCode})
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>קישור לבריף וחישוב תכ"ם</h2>
          <p className={styles.panelSub}>אופציונלי — ניתן לקשר אחר כך מתוך תיק ההליך</p>

          <div className={styles.formRow}>
            <label className={styles.label}>מזהה בריף (Brief ID)</label>
            <input
              className={styles.input}
              value={briefId}
              onChange={e => setBriefId(e.target.value)}
              placeholder="UUID של בריף קיים — אופציונלי"
            />
            <div className={styles.hint}>ניתן להעתיק מ-URL של בריף ב-/briefs</div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>מזהה חישוב תכ"ם (Calculation ID)</label>
            <input
              className={styles.input}
              value={calculationId}
              onChange={e => setCalculationId(e.target.value)}
              placeholder="UUID של חישוב קיים — אופציונלי"
            />
            <div className={styles.hint}>ניתן להעתיק מהיסטוריית החישובים שלי</div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>סקירה ופתיחה</h2>
          <p className={styles.panelSub}>בדוק את הפרטים לפני יצירת ההליך</p>

          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>שם ההליך</span>
              <span className={styles.summaryValue}>{title}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>משרד</span>
              <span className={styles.summaryValue}>{ministry}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>סכום משוער</span>
              <span className={styles.summaryValue}>{formatAmount(amount)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>רצועת סכום</span>
              <span className={styles.summaryValue}>{g1.band}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>סוג בחירה</span>
              <span className={styles.summaryValue}>{selectionType === 'price_only' ? 'מחיר בלבד' : 'איכות + מחיר'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>אשכול</span>
              <span className={styles.summaryValue}>{serviceCluster || '—'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>אלמ"ה נדרש</span>
              <span className={styles.summaryValue}>{g1.requiresOlma ? 'כן' : 'לא'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>מסלול פשוט</span>
              <span className={styles.summaryValue}>{g1.isSimplePath ? 'כן' : 'לא'}</span>
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}
        </div>
      )}

      <div className={styles.navRow}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => navigate('/tenders')}>
          ביטול
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          {step > 1 && (
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}>
              חזור
            </button>
          )}
          {step < 4 && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={!canAdvance}
              onClick={() => setStep((step + 1) as 1 | 2 | 3 | 4)}
            >
              המשך
            </button>
          )}
          {step === 4 && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={submitting || !canAdvance}
              onClick={handleSubmit}
            >
              {submitting ? 'יוצר…' : 'צור הליך'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
