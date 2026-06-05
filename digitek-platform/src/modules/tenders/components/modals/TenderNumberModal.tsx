import { useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  /** האם זה מספר חיצוני (S4) או פנימי (S1). */
  variant: 'internal' | 'external'
  initialValue?: string | null
  onSaved: () => void
}

export function TenderNumberModal({ open, onClose, tenderId, variant, initialValue, onSaved }: Props) {
  const [value, setValue] = useState(initialValue ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExternal = variant === 'external'
  const title = isExternal ? 'מספר תיחור חיצוני' : 'מספר תיחור פנימי'
  const column = isExternal ? 'tender_number_external' : 'tender_number'
  const hint = isExternal
    ? 'מספר ההליך כפי שמופיע במערכת התיחורים הדיגיטלית'
    : 'מספר ייחודי לזיהוי ההליך — יוטמע בכל המסמכים'

  async function handleSave() {
    if (!value.trim()) {
      setError('יש להזין מספר')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase
      .from('tenders')
      .update({ [column]: value.trim() })
      .eq('id', tenderId)
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {!isExternal && (
        <div className={s.warn}>
          ⚠️ סיכון #9: לא להזין שנה כחלק מהמספר — שמור על מספור נקי
        </div>
      )}
      <div className={s.formGroup}>
        <label className={`${s.label} ${s.required}`}>{title}</label>
        <input
          className={s.input}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={isExternal ? '26-12345' : '0042'}
          autoFocus
        />
        <div className={s.hint}>{hint}</div>
      </div>
      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSave}>
          {submitting ? 'שומר…' : 'שמור'}
        </button>
      </div>
    </Modal>
  )
}
