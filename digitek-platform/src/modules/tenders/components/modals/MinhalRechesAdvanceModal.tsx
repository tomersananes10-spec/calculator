import { useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  onSubmitted: () => void
}

/**
 * שלב 4 (מינהל הרכש) — קופסה שחורה ל-LIBA.
 * כשהמינהל בחר ספק זוכה במערכת שלהם, המשתמש מסמן את זה ידנית כאן
 * כדי להתקדם לשלב 5 (העלאת פרוטוקול זכייה).
 */
export function MinhalRechesAdvanceModal({ open, onClose, tenderId, onSubmitted }: Props) {
  const [externalNumber, setExternalNumber] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [finalAmount, setFinalAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdvance() {
    setSubmitting(true)
    setError(null)

    // שמירת מספר ההליך החיצוני כדי שייצא כ-metadata "התקבל ספק"
    if (externalNumber.trim()) {
      const { error: updErr } = await supabase
        .from('tenders')
        .update({ tender_number_external: externalNumber.trim() })
        .eq('id', tenderId)
      if (updErr) {
        setError(updErr.message)
        setSubmitting(false)
        return
      }
    }

    // התקדמות לשלב 5
    const notesPayload = [
      vendorName.trim() ? `ספק זוכה: ${vendorName.trim()}` : null,
      finalAmount.trim() ? `סכום סופי: ${finalAmount.trim()}` : null,
      notes.trim() || null,
    ].filter(Boolean).join(' · ')

    const { error: rpcErr } = await supabase.rpc('tender_advance', {
      p_tender_id: tenderId,
      p_target_stage: 'T5_winner_protocol_upload',
      p_notes: notesPayload || 'התקבל ספק זוכה ממינהל הרכש',
    })

    setSubmitting(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    onSubmitted()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="התקבל ספק זוכה ממינהל הרכש">
      <div className={s.info}>
        כשמינהל הרכש סיים את התהליך בצד שלהם ובחר ספק, סמן זאת כאן כדי להתקדם לשלב 5 (העלאת פרוטוקול זכייה).
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>מספר ההליך במערכת התיחורים החיצונית</label>
        <input
          className={s.input}
          value={externalNumber}
          onChange={e => setExternalNumber(e.target.value)}
          placeholder="26-12345"
        />
        <div className={s.hint}>אופציונלי — מומלץ אם קיים מספר רשמי</div>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>שם הספק הזוכה</label>
        <input
          className={s.input}
          value={vendorName}
          onChange={e => setVendorName(e.target.value)}
          placeholder="חברת ABC בע״מ"
        />
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>סכום סופי (לא חובה)</label>
        <input
          className={s.input}
          value={finalAmount}
          onChange={e => setFinalAmount(e.target.value)}
          placeholder="₪ 850,000"
        />
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>הערות</label>
        <textarea
          className={s.textarea}
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="פרטים נוספים שכדאי לשמור באודיט"
        />
      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleAdvance}>
          {submitting ? 'מקדם…' : '✓ אישור והתקדמות לשלב 5'}
        </button>
      </div>
    </Modal>
  )
}
