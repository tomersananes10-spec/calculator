import type { WizardState } from './types'
import s from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onBack: () => void
  onSaveDraft: () => void
}

function fmt(n: number) {
  return n.toLocaleString('he-IL') + ' ₪'
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('he-IL')
}

export function Step8Preview({ state, onBack, onSaveDraft }: Props) {
  const { selectedCluster, selectedSpecialization, projectDetails, projectDescription, selectedActivities, timeline, requirements } = state

  const spec = selectedSpecialization
  const selectedActs = spec?.activities.filter(a => selectedActivities.includes(a.id)) ?? []
  const allDeliverables = selectedActs.flatMap(a => a.deliverables)
  const isLarge = projectDetails.estimatedBudget > (spec?.projectSizeThreshold ?? 200000)
  const autoBond = projectDetails.estimatedBudget > 250000

  function handleExport() {
    const content = buildBriefText(state)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `בריף_${projectDetails.name || 'ללא_שם'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>תצוגה מקדימה — הבריף המלא</h2>
        <p>סקור את הבריף לפני הייצוא</p>
      </div>

      <div className={s.exportBtns}>
        <button className={s.btnPrimary} onClick={handleExport}>
          ⬇️ ייצא כקובץ טקסט
        </button>
        <button className={s.btnOutline} onClick={onSaveDraft}>
          💾 שמור טיוטה
        </button>
        <button className={s.btnSecondary} onClick={onBack}>
          ✏️ חזור לעריכה
        </button>
      </div>

      <div className={s.briefPreview}>
        <h1>פניה פרטנית — {projectDetails.name || 'ללא שם'}</h1>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
          מסמך נוצר ב-{new Date().toLocaleDateString('he-IL')}
        </div>

        <div className={s.briefMeta}>
          <div className={s.briefMetaItem}>
            <strong>משרד / גוף מזמין</strong>
            {projectDetails.ministry || '—'}
          </div>
          <div className={s.briefMetaItem}>
            <strong>אשכול</strong>
            {selectedCluster?.icon} {selectedCluster?.name}
          </div>
          <div className={s.briefMetaItem}>
            <strong>התמחות</strong>
            {spec?.id}. {spec?.name}
          </div>
          <div className={s.briefMetaItem}>
            <strong>היקף כספי משוער</strong>
            {fmt(projectDetails.estimatedBudget)} — {isLarge ? 'פרויקט גדול' : 'פרויקט קטן'}
          </div>
          {projectDetails.preferredVendor && (
            <div className={s.briefMetaItem}>
              <strong>ספק מועדף</strong>
              {projectDetails.preferredVendor}
            </div>
          )}
          <div className={s.briefMetaItem}>
            <strong>מועד התחלה</strong>
            {fmtDate(timeline.estimatedStartDate)}
          </div>
          <div className={s.briefMetaItem}>
            <strong>תקופת התקשרות</strong>
            {timeline.contractDuration} חודשים
          </div>
        </div>

        <h2>רקע ותיאור הצורך</h2>
        {projectDescription.general && (
          <>
            <h3>תיאור כללי</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{projectDescription.general}</p>
          </>
        )}
        {projectDescription.currentSituation && (
          <>
            <h3>המצב הקיים / הבעיה</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{projectDescription.currentSituation}</p>
          </>
        )}
        {projectDescription.goals && (
          <>
            <h3>מטרות הפרויקט</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{projectDescription.goals}</p>
          </>
        )}

        <h2>תחולת העבודה — פעילויות ותוצרים</h2>
        {selectedActs.map(activity => (
          <div key={activity.id} style={{ marginBottom: 14 }}>
            <h3>{activity.name}</h3>
            <ul>
              {activity.deliverables.map(d => (
                <li key={d.id}>
                  {d.name}{' '}
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    ({d.required === 'mandatory' ? 'חובה' : d.required === 'recommended' ? 'מומלץ' : 'אפשרי'})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {timeline.milestones.length > 0 && (
          <>
            <h2>אבני דרך ולוח תשלומים</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid var(--border)', fontWeight: 700 }}>אבן דרך</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid var(--border)', fontWeight: 700 }}>תאריך</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid var(--border)', fontWeight: 700 }}>% תשלום</th>
                </tr>
              </thead>
              <tbody>
                {timeline.milestones.map((m, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{m.name || '—'}</td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{fmtDate(m.date)}</td>
                    <td style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>{m.paymentPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>דרישות נוספות</h2>
        <ul>
          {requirements.securityClassification && (
            <li>סיווג בטחוני: {requirements.securityLevel || 'נדרש סיווג'}</li>
          )}
          {requirements.maintenancePeriods > 0 && (
            <li>תקופות תחזוקה: {requirements.maintenancePeriods}</li>
          )}
          <li>כנס ספקים: {requirements.vendorMeeting === 'mandatory' ? 'חובה' : requirements.vendorMeeting === 'recommended' ? 'מומלץ' : 'לא נדרש'}</li>
          <li>ערבות ביצוע: {(autoBond || requirements.performanceBond) ? 'נדרשת' : 'לא נדרשת'}</li>
          <li>מקום מתן השירות: {requirements.serviceLocation === 'vendor' ? 'אתר הספק' : requirements.serviceLocation === 'client' ? 'אתר המשרד' : 'אתר הספק ואתר המשרד'}</li>
          {allDeliverables.length > 0 && (
            <li>סה"כ תוצרים נבחרו: {allDeliverables.length}</li>
          )}
        </ul>
      </div>
    </div>
  )
}

function buildBriefText(state: WizardState): string {
  const { selectedCluster, selectedSpecialization, projectDetails, projectDescription, selectedActivities, timeline, requirements } = state
  const spec = selectedSpecialization
  const selectedActs = spec?.activities.filter(a => selectedActivities.includes(a.id)) ?? []
  const isLarge = projectDetails.estimatedBudget > (spec?.projectSizeThreshold ?? 200000)
  const autoBond = projectDetails.estimatedBudget > 250000

  const lines: string[] = []
  lines.push(`פניה פרטנית — ${projectDetails.name}`)
  lines.push(`נוצר: ${new Date().toLocaleDateString('he-IL')}`)
  lines.push('')
  lines.push('--- פרטי פרויקט ---')
  lines.push(`משרד/גוף: ${projectDetails.ministry}`)
  lines.push(`אשכול: ${selectedCluster?.name}`)
  lines.push(`התמחות: ${spec?.id}. ${spec?.name}`)
  lines.push(`היקף: ${projectDetails.estimatedBudget.toLocaleString('he-IL')} ₪ (${isLarge ? 'גדול' : 'קטן'})`)
  lines.push(`תחילת עבודה: ${timeline.estimatedStartDate}`)
  lines.push(`תקופת התקשרות: ${timeline.contractDuration} חודשים`)
  lines.push('')
  lines.push('--- תיאור הצורך ---')
  if (projectDescription.general) lines.push(`תיאור כללי:\n${projectDescription.general}`)
  if (projectDescription.currentSituation) lines.push(`מצב קיים:\n${projectDescription.currentSituation}`)
  if (projectDescription.goals) lines.push(`מטרות:\n${projectDescription.goals}`)
  lines.push('')
  lines.push('--- פעילויות ותוצרים ---')
  selectedActs.forEach(a => {
    lines.push(`• ${a.name}`)
    a.deliverables.forEach(d => lines.push(`  - ${d.name} (${d.required === 'mandatory' ? 'חובה' : d.required === 'recommended' ? 'מומלץ' : 'אפשרי'})`))
  })
  if (timeline.milestones.length > 0) {
    lines.push('')
    lines.push('--- אבני דרך ותשלומים ---')
    timeline.milestones.forEach(m => lines.push(`• ${m.name} | ${m.date} | ${m.paymentPercent}%`))
  }
  lines.push('')
  lines.push('--- דרישות נוספות ---')
  if (requirements.securityClassification) lines.push(`סיווג בטחוני: ${requirements.securityLevel}`)
  lines.push(`תקופות תחזוקה: ${requirements.maintenancePeriods}`)
  lines.push(`כנס ספקים: ${requirements.vendorMeeting === 'mandatory' ? 'חובה' : requirements.vendorMeeting === 'recommended' ? 'מומלץ' : 'לא'}`)
  lines.push(`ערבות ביצוע: ${autoBond || requirements.performanceBond ? 'נדרשת' : 'לא נדרשת'}`)
  lines.push(`מקום שירות: ${requirements.serviceLocation}`)

  return lines.join('\n')
}
