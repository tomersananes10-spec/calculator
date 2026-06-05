import { useState } from 'react'
import { Modal, StepDots, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import type { ProtocolDecision, ProtocolType } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  protocolType: ProtocolType  // 'outbound_request' | 'winner_approval' | ...
  onSubmitted: () => void
}

const PROTOCOL_TYPE_LABELS: Record<ProtocolType, string> = {
  outbound_request: 'פרוטוקול בקשה ליציאה לתיחור (G3)',
  winner_approval: 'פרוטוקול אישור זוכה (G8)',
  exceptions: 'פרוטוקול ועדת חריגים',
  subcommittee_scoring: 'פרוטוקול ניקוד ועדת משנה',
}

export function CommitteeProtocolModal({ open, onClose, tenderId, protocolType, onSubmitted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rationale, setRationale] = useState('')
  const [decision, setDecision] = useState<ProtocolDecision>('approved')
  const [signedNow, setSignedNow] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = PROTOCOL_TYPE_LABELS[protocolType]

  function handleClose() {
    setStep(1); setRationale(''); setDecision('approved'); setError(null)
    onClose()
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase
      .from('tender_protocols')
      .insert({
        tender_id: tenderId,
        protocol_type: protocolType,
        decision,
        rationale: rationale.trim() || null,
        signed_at: signedNow ? new Date().toISOString() : null,
      })
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    onSubmitted()
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <StepDots total={3} current={step} label={
        step === 1 ? 'נימוקים ורקע' : step === 2 ? 'החלטה' : 'חתימה'
      } />

      {step === 1 && (
        <>
          <div className={s.formGroup}>
            <label className={s.label}>נימוקים ורקע</label>
            <textarea
              className={s.textarea}
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              placeholder="רקע לבקשה, הצדקה לסכום, נימוקי הבחירה (חובה לאישור תקין — סיכון #10)"
              rows={6}
            />
            <div className={s.hint}>סיכון #10: חוסר תיעוד בהחלטות ועדה — שדה זה משמש כתיעוד החובה</div>
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>ביטול</button>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setStep(2)}>המשך</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={s.formGroup}>
            <label className={s.label}>החלטת הוועדה</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className={`${s.btn} ${decision === 'approved' ? s.btnSuccess : s.btnSecondary}`}
                onClick={() => setDecision('approved')}
              >✓ אושר</button>
              <button
                type="button"
                className={`${s.btn} ${decision === 'returned_for_correction' ? s.btnPrimary : s.btnSecondary}`}
                onClick={() => setDecision('returned_for_correction')}
              >↩ החזרה לתיקון</button>
              <button
                type="button"
                className={`${s.btn} ${decision === 'completion_required' ? s.btnPrimary : s.btnSecondary}`}
                onClick={() => setDecision('completion_required')}
              >📝 השלמה</button>
              <button
                type="button"
                className={`${s.btn} ${decision === 'rejected' ? s.btnDanger : s.btnSecondary}`}
                onClick={() => setDecision('rejected')}
              >✗ נדחה</button>
            </div>
          </div>
          {decision === 'approved' && (
            <div className={s.info}>החלטה זו תאפשר את המעבר לשלב הבא ב-FSM</div>
          )}
          {decision !== 'approved' && (
            <div className={s.warn}>החלטה זו לא תעביר את ההליך לשלב הבא. נדרש פרוטוקול נוסף לאחר תיקון.</div>
          )}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(1)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setStep(3)}>המשך</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={s.summary}>
            <div><strong>סוג פרוטוקול:</strong> {title}</div>
            <div><strong>החלטה:</strong> {decision}</div>
            <div><strong>נימוקים:</strong> {rationale || '(ריק)'}</div>
          </div>
          <div className={s.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={signedNow}
                onChange={e => setSignedNow(e.target.checked)}
              />
              <span style={{ fontSize: 13 }}>סמן כפרוטוקול חתום (signed_at = עכשיו)</span>
            </label>
            <div className={s.hint}>חתימה דיגיטלית אמיתית תחובר בפאזה 5 (Comsign/DocuSign)</div>
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setStep(2)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'שומר…' : 'שמור פרוטוקול'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
