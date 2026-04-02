import { useState } from 'react'
import type { WizardState } from './types'
import { exportBriefToWord } from './wordExport'
import styles from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onBack: () => void
  onSubmit: () => void
  saving?: boolean
}

function Field({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (!value && value !== 0) return null
  return (
    <div className={styles.previewField}>
      <span className={styles.previewLabel}>{label}:</span>
      <span className={styles.previewValue}>{String(value)}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.previewSection}>
      <h3 className={styles.previewSectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

export default function Step10Preview({ state, onBack, onSubmit, saving }: Props) {
  const [exporting, setExporting] = useState(false)
  const { identification, currentSituation, existingArchitecture,
          projectDescription, deliverables, workPackages, timeline,
          management, goals } = state

  async function handleExport() {
    setExporting(true)
    try { await exportBriefToWord(state) }
    finally { setExporting(false) }
  }

  const selectedDelivs = deliverables.filter(d => d.selected)
  const filledWP = workPackages.filter(w => w.quantity > 0)

  return (
    <div>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>תצוגה מקדימה — הבריף המלא</h2>
        <p className={styles.stepSubtitle}>סקור את כל הפרטים לפני שמירה סופית</p>
      </div>

      <div className={styles.previewBody}>
        <Section title="1. זיהוי הפרויקט">
          <Field label="שם הפרויקט" value={identification.projectName} />
          <Field label="משרד" value={identification.ministry} />
          <Field label="מספר מכרז" value={identification.tenderNumber} />
          <Field label="תאריך כתיבה" value={identification.writtenDate} />
          <Field label="קלאסטר" value={identification.selectedCluster?.name} />
          <Field label="התמחות" value={identification.selectedSpecialization?.name} />
          <Field label="גודל פרויקט" value={identification.projectSize === 'small' ? 'קטן' : 'גדול'} />
          <Field label="תקציב משוער" value={identification.estimatedBudget > 0 ? identification.estimatedBudget.toLocaleString() + ' ₪' : undefined} />
        </Section>

        <Section title="2. מצב קיים">
          <Field label="בעיה עסקית" value={currentSituation.businessProblem} />
          <Field label="מערכות קיימות" value={currentSituation.existingSystems} />
          <Field label="תשתיות" value={currentSituation.infrastructure} />
          <Field label="נפחי מידע" value={currentSituation.dataVolumes} />
          <Field label="פערים עיקריים" value={currentSituation.mainGaps} />
        </Section>

        {(existingArchitecture.cloudProvider || existingArchitecture.techStack) && (
          <Section title="3. ארכיטקטורה קיימת">
            <Field label="ספק ענן" value={existingArchitecture.cloudProvider} />
            <Field label="Tech Stack" value={existingArchitecture.techStack} />
            <Field label="בסיסי נתונים" value={existingArchitecture.databases} />
            <Field label="ממשקים חיצוניים" value={existingArchitecture.externalInterfaces} />
            <Field label="הערות" value={existingArchitecture.notes} />
          </Section>
        )}

        <Section title="4. תיאור הפרויקט">
          <Field label="כללי" value={projectDescription.general} />
          <Field label="תוצרים מבוקשים" value={projectDescription.requestedDeliverables} />
          <Field label="מאפיינים טכנולוגיים" value={projectDescription.technicalCharacteristics} />
          <Field label="תועלות" value={projectDescription.expectedBenefits} />
          <Field label="קהל יעד" value={projectDescription.targetAudience} />
          <Field label="מספר משתמשים" value={projectDescription.usersCount} />
        </Section>

        {selectedDelivs.length > 0 && (
          <Section title="5. תוצרים נדרשים">
            <table className={styles.previewTable}>
              <thead><tr><th>תוצר</th><th>כמות</th><th>הערות</th></tr></thead>
              <tbody>
                {selectedDelivs.map(d => (
                  <tr key={d.id}>
                    <td>{d.name}</td><td>{d.quantity}</td><td>{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {filledWP.length > 0 && (
          <Section title="6. חבילות עבודה">
            <table className={styles.previewTable}>
              <thead><tr><th>שם</th><th>גודל</th><th>תיאור</th><th>כמות</th></tr></thead>
              <tbody>
                {filledWP.map(w => (
                  <tr key={w.id}>
                    <td>{w.name}</td><td>{w.size}</td><td>{w.description}</td><td>{w.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section title="7. לוח זמנים">
          <Field label="תאריך התחלה" value={timeline.estimatedStartDate} />
          <Field label="משך כולל" value={timeline.totalDurationMonths + ' חודשים'} />
          <Field label="אחריות" value={timeline.warrantyMonths + ' חודשים'} />
          <Field label="תחזוקה" value={timeline.maintenanceMonths + ' חודשים'} />
          {timeline.phases.length > 0 && (
            <table className={styles.previewTable}>
              <thead>
                <tr><th>שלב</th><th>שבוע התחלה</th><th>משך</th><th>תוצר מפתח</th></tr>
              </thead>
              <tbody>
                {timeline.phases.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.startWeek}</td>
                    <td>{p.durationWeeks}</td><td>{p.keyDeliverable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="8. ניהול פרויקט">
          <Field label="איש קשר" value={management.clientContactName + ' — ' + management.clientContactRole} />
          <Field label="מקום שירות" value={management.serviceLocation} />
          <Field label="סיווג ביטחוני" value={management.securityClassification} />
          <Field label="פגישות שבועיות" value={management.weeklyMeetings ? 'כן' : 'לא'} />
          <Field label="ועדת היגוי" value={management.steeringCommittee ? 'כן' : 'לא'} />
          {management.sla.length > 0 && (
            <table className={styles.previewTable}>
              <thead>
                <tr><th>חומרה</th><th>תיאור</th><th>זמן תגובה (שעות)</th><th>קנס</th></tr>
              </thead>
              <tbody>
                {management.sla.map((sl, i) => (
                  <tr key={i}>
                    <td>{sl.type}</td><td>{sl.description}</td>
                    <td>{sl.responseHours}</td><td>{sl.penaltyNIS}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="9. מדדים ויעדים">
          <Field label="KPIs" value={goals.kpis} />
          <Field label="קריטריוני הצלחה" value={goals.successCriteria} />
          <Field label="משקל ספק" value={goals.evaluationWeights.vendorQuality + '%'} />
          <Field label="משקל הצעה" value={goals.evaluationWeights.proposalQuality + '%'} />
          <Field label="משקל מחיר" value={goals.evaluationWeights.price + '%'} />
          <Field label="אומדן תקציב" value={goals.budgetEstimateNIS > 0 ? goals.budgetEstimateNIS.toLocaleString() + ' ₪' : undefined} />
          <Field label="אבני דרך לתשלום" value={goals.paymentMilestones} />
        </Section>
      </div>

      <div className={styles.navBtns}>
        <button className={styles.btnSecondary} onClick={onBack}>הקודם</button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={styles.btnSecondary} onClick={handleExport} disabled={exporting}>
            {exporting ? 'מייצא...' : 'ייצוא Word'}
          </button>
          <button className={styles.btnPrimary} onClick={onSubmit} disabled={saving}>
            {saving ? 'שומר...' : 'שמור בריף'}
          </button>
        </div>
      </div>
    </div>
  )
}
