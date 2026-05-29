import type { CheckResult, CheckWizardState, HumanDecision } from '../engine/types'
import { ClipboardCheck, Download, Save, FileText } from 'lucide-react'
import { exportPdf } from '../../hooks/useExport'
import { ROLE_TEMPLATES } from '../../data/roleTemplates'
import s from './Step3Decision.module.css'

interface Step3Props {
  state: CheckWizardState
  result: CheckResult
  dispatch: React.Dispatch<any>
  onExport: () => void
  onSubmit: () => void
  saving: boolean
  onBack: () => void
}

const DECISIONS: { value: HumanDecision; label: string }[] = [
  { value: 'approved', label: 'מאשרת עמידה' },
  { value: 'requires_docs', label: 'דורשת השלמה' },
  { value: 'rejected', label: 'פוסלת' },
]

function btnClass(current: HumanDecision | undefined, value: HumanDecision): string {
  if (current !== value) return s.decisionBtn
  if (value === 'approved') return s.decisionBtnApproved
  if (value === 'requires_docs') return s.decisionBtnRequiresDocs
  return s.decisionBtnRejected
}

export function Step3Decision({ state, result, dispatch, onExport, onSubmit, saving, onBack }: Step3Props) {
  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>
        <ClipboardCheck size={22} />
        Human in the Loop — החלטת רכזת המיון
      </div>

      {result.results.map(req => {
        const current = state.decisions[req.requirementId]
        return (
          <div key={req.requirementId} className={s.reqBlock}>
            <div className={s.reqName}>{req.requirement.label}</div>
            <div className={s.decisionRow}>
              {DECISIONS.map(d => (
                <button
                  key={d.value}
                  className={btnClass(current, d.value)}
                  onClick={() => dispatch({
                    type: 'SET_DECISION',
                    payload: { requirementId: req.requirementId, decision: d.value },
                  })}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <div>
        <div className={s.notesLabel}>נימוק החלטה, מסמכים חסרים, הערות לערר או השלמות נדרשות</div>
        <textarea
          className={s.textarea}
          value={state.decisionNotes}
          onChange={e => dispatch({ type: 'SET_DECISION_NOTES', payload: e.target.value })}
          placeholder="הקלידו את הנימוק כאן..."
        />
      </div>

      <div className={s.actions}>
        <button className={s.btnPrimary} onClick={onSubmit} disabled={saving}>
          <Save size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
          {saving ? 'שומר...' : 'שמור החלטה'}
        </button>
        <button className={s.btnSuccess} onClick={() => exportPdf({
          candidateName: state.candidateName,
          roleName: ROLE_TEMPLATES[state.roleTemplateId]?.name ?? '',
          overallStatus: result.overallStatus,
          overallScore: result.overallScore,
          estimatedYears: result.estimatedYears,
          results: result.results,
          decisionNotes: state.decisionNotes,
        })}>
          <FileText size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
          ייצוא PDF
        </button>
        <button className={s.btnOutline} onClick={onExport}>
          <Download size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
          JSON
        </button>
        <button className={s.btnOutline} onClick={onBack}>
          → חזרה לתוצאות
        </button>
      </div>
    </div>
  )
}
