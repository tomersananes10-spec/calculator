import { useState } from 'react'
import { Modal, modalStyles as s } from './Modal'
import { advanceTender } from '../hooks/useTender'
import { getStage } from '../data/stagesBaseline'
import type { StageRequirementsResult } from '../data/stageRequirements'
import type { Tender } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  tender: Tender
  requirements: StageRequirementsResult
  onAdvanced: () => void
}

export function GateValidationModal({ open, onClose, tender, requirements, onAdvanced }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const nextStageDef = requirements.nextStage ? getStage(requirements.nextStage) : null

  async function handleAdvance() {
    if (!requirements.nextStage) return
    setSubmitting(true)
    setError(null)
    const result = await advanceTender(tender.id, requirements.nextStage, notes.trim() || undefined)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'שגיאה במעבר השלב')
      return
    }
    onAdvanced()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="מעבר לשלב הבא">
      {requirements.canAdvance ? (
        <>
          <div className={s.info}>
            ✓ כל הדרישות הבלוקריות מולאו. ניתן להעביר את ההליך
            {nextStageDef && <> לשלב <strong>{nextStageDef.stageNumber}. {nextStageDef.label}</strong></>}.
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>הערות (אופציונלי)</label>
            <textarea
              className={s.textarea}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="הערה שתישמר ב-audit log"
            />
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleAdvance}>
              {submitting ? 'מעביר…' : 'אשר מעבר'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={s.warn}>
            ⚠️ {requirements.blockingPending.length} דרישות פתוחות חוסמות את המעבר
          </div>
          <div className={s.summary}>
            <div><strong>דרישות פתוחות:</strong></div>
            {requirements.blockingPending.map(r => (
              <div key={r.id}>• {r.label}</div>
            ))}
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>הבנתי</button>
          </div>
        </>
      )}
    </Modal>
  )
}
