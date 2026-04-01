import type { WizardState } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onChange: (field: keyof WizardState['requirements'], value: boolean | string | number) => void
  onNext: () => void
  onBack: () => void
}

export function Step7Requirements({ state, onChange, onNext, onBack }: Props) {
  const { requirements, projectDetails } = state
  const autoBond = projectDetails.estimatedBudget > 250000

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>דרישות נוספות</h2>
        <p>הגדר דרישות טכניות ורגולטוריות לפניה</p>
      </div>

      <div className={s.cardBox}>
        {/* Security Classification */}
        <div className={s.toggleRow}>
          <div>
            <div className={s.toggleLabel}>סיווג בטחוני</div>
            <div className={s.toggleSub}>האם הפרויקט מצריך טיפול בחומר מסווג?</div>
          </div>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={requirements.securityClassification}
              onChange={e => onChange('securityClassification', e.target.checked)}
            />
            <span className={s.toggleSlider} />
          </label>
        </div>

        {requirements.securityClassification && (
          <div className={s.field} style={{ paddingBottom: 12, marginTop: 6 }}>
            <label className={s.fieldLabel}>רמת סיווג</label>
            <input
              className={s.input}
              placeholder="לדוגמה: שמור / סודי / סודי ביותר"
              value={requirements.securityLevel}
              onChange={e => onChange('securityLevel', e.target.value)}
            />
          </div>
        )}

        {/* Maintenance Periods */}
        <div className={s.toggleRow}>
          <div>
            <div className={s.toggleLabel}>תקופות תחזוקה</div>
            <div className={s.toggleSub}>מספר תקופות תחזוקה (0 = ללא תחזוקה)</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              style={{ width: 28, height: 28, border: '1.5px solid var(--border2)', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 16 }}
              onClick={() => onChange('maintenancePeriods', Math.max(0, requirements.maintenancePeriods - 1))}
            >−</button>
            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
              {requirements.maintenancePeriods}
            </span>
            <button
              style={{ width: 28, height: 28, border: '1.5px solid var(--border2)', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 16 }}
              onClick={() => onChange('maintenancePeriods', requirements.maintenancePeriods + 1)}
            >+</button>
          </div>
        </div>

        {/* Vendor Meeting */}
        <div className={s.toggleRow}>
          <div>
            <div className={s.toggleLabel}>כנס ספקים</div>
          </div>
          <div className={s.seg}>
            {(['mandatory', 'recommended', 'none'] as const).map(opt => {
              const labels = { mandatory: 'חובה', recommended: 'מומלץ', none: 'לא' }
              return (
                <button
                  key={opt}
                  className={`${s.segBtn} ${requirements.vendorMeeting === opt ? s.segBtnActive : ''}`}
                  onClick={() => onChange('vendorMeeting', opt)}
                >
                  {labels[opt]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Performance Bond */}
        <div className={s.toggleRow}>
          <div>
            <div className={s.toggleLabel}>ערבות ביצוע</div>
            <div className={s.toggleSub}>
              {autoBond
                ? '⚠️ חובה אוטומטית — היקף הפרויקט מעל 250,000 ₪'
                : 'היקף הפרויקט מתחת ל-250,000 ₪ — לא נדרשת ערבות'}
            </div>
          </div>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={autoBond || requirements.performanceBond}
              disabled={autoBond}
              onChange={e => onChange('performanceBond', e.target.checked)}
            />
            <span className={s.toggleSlider} />
          </label>
        </div>

        {/* Service Location */}
        <div className={s.toggleRow} style={{ border: 'none', paddingBottom: 0 }}>
          <div>
            <div className={s.toggleLabel}>מקום מתן השירות</div>
          </div>
          <div className={s.seg}>
            {(['vendor', 'client', 'both'] as const).map(opt => {
              const labels = { vendor: 'אתר הספק', client: 'אתר המשרד', both: 'שניהם' }
              return (
                <button
                  key={opt}
                  className={`${s.segBtn} ${requirements.serviceLocation === opt ? s.segBtnActive : ''}`}
                  onClick={() => onChange('serviceLocation', opt)}
                >
                  {labels[opt]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className={s.navBtns}>
        <button className={s.btnSecondary} onClick={onBack}>‹ חזרה</button>
        <button className={s.btnPrimary} onClick={onNext}>
          תצוגה מקדימה של הבריף ›
        </button>
      </div>
    </div>
  )
}
