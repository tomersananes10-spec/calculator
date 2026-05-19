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
          projectDescription, templateDeliverables, templateShush, timeline,
          management, goals, boilerplateSections } = state

  async function handleExport() {
    setExporting(true)
    try { await exportBriefToWord(state) }
    finally { setExporting(false) }
  }

  const selectedDelivs = templateDeliverables.filter(d => d.selected)
  const filledShush = templateShush.filter(s => s.quantity > 0)

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
          <Section title="5. תפוקות — תוצרים נדרשים">
            <table className={styles.previewTable}>
              <thead><tr><th>תפוקה</th><th>תיאור חבילת עבודה</th></tr></thead>
              <tbody>
                {selectedDelivs.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {filledShush.length > 0 && (
          <Section title="6. שו&quot;שים — יחידות תמחור">
            <table className={styles.previewTable}>
              <thead><tr><th>עולם תוכן</th><th>מורכבות</th><th>מדדים כמותיים</th><th>תיאור</th><th>כמות</th></tr></thead>
              <tbody>
                {filledShush.map(s => (
                  <tr key={s.id}>
                    <td>{s.contentArea}</td><td>{s.complexity}</td>
                    <td style={{ fontSize: 12 }}>{s.quantitativeMetrics}</td>
                    <td style={{ fontSize: 12 }}>{s.workDescription}</td>
                    <td>{s.quantity}</td>
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

        {Object.values(boilerplateSections).some(v => v?.trim()) && (
          <Section title="סעיפי מימוש (2.1-2.16)">
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              {boilerplateSections.implementationApproach && <Field label="2.1 אפיון מהלך העבודה" value="✓ מלא" />}
              {boilerplateSections.developmentRequirements && <Field label="2.1.2 דרישות פיתוח" value="✓ מלא" />}
              {boilerplateSections.techArchitecture && <Field label="2.1.3 טכנולוגיות" value="✓ מלא" />}
              {boilerplateSections.methodology && <Field label="2.1.4 מתודולוגיה" value="✓ מלא" />}
              {boilerplateSections.nimbusBackground && <Field label="2.2 נימבוס" value="✓ מלא" />}
              {boilerplateSections.projectScope && <Field label="2.5 היקף" value="✓ מלא" />}
              {boilerplateSections.performanceTesting && <Field label="2.9 בדיקות ביצועים" value="✓ מלא" />}
              {boilerplateSections.securityTesting && <Field label="2.10 אבטחת מידע" value="✓ מלא" />}
              {boilerplateSections.warrantyMaintenance && <Field label="2.16 אחריות ותחזוקה" value="✓ מלא" />}
            </div>
          </Section>
        )}

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
