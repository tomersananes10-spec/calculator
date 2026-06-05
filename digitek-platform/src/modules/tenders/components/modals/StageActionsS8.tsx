// Modals של שלב S8 (התקשרות והסכם) — חוזה, ערבות, ביטוח, חתימת מורשי חתימה

import { useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import { evaluateG9_ContractTemplate } from '../../data/gateways'
import type { TenderContract, TenderProposal, TenderVendor } from '../../types'

// ───────────────────────────────────────────────────
// ContractDraftModal — יצירת טיוטת הסכם עם הזוכה
// ───────────────────────────────────────────────────

interface ContractProps {
  open: boolean
  onClose: () => void
  tenderId: string
  estimatedAmount: number
  proposals: TenderProposal[]
  vendors: TenderVendor[]
  onSubmitted: () => void
}

export function ContractDraftModal({ open, onClose, tenderId, estimatedAmount, proposals, vendors, onSubmitted }: ContractProps) {
  const winner = proposals.find(p => p.status === 'winner')
  const vendorName = winner ? vendors.find(v => v.id === winner.vendor_id)?.name : undefined
  const g9 = evaluateG9_ContractTemplate(estimatedAmount)
  const totalAmount = winner?.price ?? estimatedAmount

  const [effectiveDate, setEffectiveDate] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!winner) {
      setError('אין ספק זוכה — חזור לשלב 6')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: err } = await supabase
      .from('tender_contracts')
      .insert({
        tender_id: tenderId,
        vendor_id: winner.vendor_id,
        total_amount: totalAmount,
        effective_date: effectiveDate || null,
        expiry_date: expiryDate || null,
        guarantee_required: g9.requiresGuarantee,
        insurance_required: g9.requiresInsurance,
        signature_status: 'draft',
        metadata: { template_code: g9.templateCode },
      })
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    onSubmitted()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="יצירת טיוטת הסכם">
      <div className={s.summary}>
        <div><strong>ספק זוכה:</strong> {vendorName ?? 'לא ידוע'}</div>
        <div><strong>סכום:</strong> ₪ {totalAmount.toLocaleString('he-IL')}</div>
        <div><strong>תבנית (G9):</strong> {g9.templateCode}</div>
        <div><strong>ערבות נדרשת:</strong> {g9.requiresGuarantee ? 'כן' : 'לא'}</div>
        <div><strong>ביטוח נדרש:</strong> {g9.requiresInsurance ? 'כן' : 'לא'}</div>
      </div>
      <div className={s.formGroup}>
        <label className={s.label}>תאריך כניסה לתוקף</label>
        <input className={s.input} type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
      </div>
      <div className={s.formGroup}>
        <label className={s.label}>תאריך פקיעה</label>
        <input className={s.input} type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
      </div>
      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'יוצר…' : 'צור טיוטה'}
        </button>
      </div>
    </Modal>
  )
}

// ───────────────────────────────────────────────────
// GuaranteeModal — אימות ערבות
// ───────────────────────────────────────────────────

interface GuaranteeProps {
  open: boolean
  onClose: () => void
  contracts: TenderContract[]
  onSubmitted: () => void
}

export function GuaranteeModal({ open, onClose, contracts, onSubmitted }: GuaranteeProps) {
  const contract = contracts[0]  // assumption: contract יחיד
  const [amount, setAmount] = useState<number>(0)
  const [issuer, setIssuer] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!contract) { setError('אין חוזה — חזור לשלב יצירת ההסכם'); return }
    if (amount <= 0 || !issuer.trim() || !validFrom || !validTo) {
      setError('יש למלא את כל השדות'); return
    }
    setSubmitting(true); setError(null)
    const { error: err } = await supabase
      .from('tender_guarantees')
      .insert({
        contract_id: contract.id,
        amount,
        issuer: issuer.trim(),
        valid_from: validFrom,
        valid_to: validTo,
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    onSubmitted(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="אימות ערבות בנקאית">
      <div className={s.info}>אימות הערבות הוא חלק מ-Gateway G10. ערבות לא תקינה = חזרה ל-8.3.</div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>סכום הערבות (₪)</label>
        <input className={s.input} type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} /></div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>בנק / מנפיק</label>
        <input className={s.input} value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="בנק הפועלים, לאומי..." /></div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>תקף מ</label>
        <input className={s.input} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>תקף עד</label>
        <input className={s.input} type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'שומר…' : '✓ אמת ערבות'}
        </button>
      </div>
    </Modal>
  )
}

// ───────────────────────────────────────────────────
// InsuranceModal — אימות ביטוח
// ───────────────────────────────────────────────────

interface InsuranceProps {
  open: boolean
  onClose: () => void
  contracts: TenderContract[]
  onSubmitted: () => void
}

export function InsuranceModal({ open, onClose, contracts, onSubmitted }: InsuranceProps) {
  const contract = contracts[0]
  const [insurer, setInsurer] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [coverageAmount, setCoverageAmount] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!contract) { setError('אין חוזה'); return }
    if (!insurer.trim() || !validFrom || !validTo) {
      setError('יש למלא חברת ביטוח ותאריכים'); return
    }
    setSubmitting(true); setError(null)
    const { error: err } = await supabase
      .from('tender_insurance')
      .insert({
        contract_id: contract.id,
        insurer: insurer.trim(),
        policy_number: policyNumber.trim() || null,
        valid_from: validFrom,
        valid_to: validTo,
        coverage: { amount: coverageAmount, type: 'general' },
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    onSubmitted(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="אימות ביטוח">
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>חברת ביטוח</label>
        <input className={s.input} value={insurer} onChange={e => setInsurer(e.target.value)} placeholder="הראל, כלל..." /></div>
      <div className={s.formGroup}><label className={s.label}>מס' פוליסה</label>
        <input className={s.input} value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} /></div>
      <div className={s.formGroup}><label className={s.label}>סכום כיסוי (₪)</label>
        <input className={s.input} type="number" min={0} value={coverageAmount || ''} onChange={e => setCoverageAmount(Number(e.target.value))} /></div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>תקף מ</label>
        <input className={s.input} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>תקף עד</label>
        <input className={s.input} type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'שומר…' : '✓ אמת ביטוח'}
        </button>
      </div>
    </Modal>
  )
}

// ───────────────────────────────────────────────────
// SignatoryModal — חתימת מורשי החתימה (שלב 8.5 — הפיצ'ר המקורי!)
// ───────────────────────────────────────────────────

interface SignatoryProps {
  open: boolean
  onClose: () => void
  contracts: TenderContract[]
  onSubmitted: () => void
}

export function SignatoryModal({ open, onClose, contracts, onSubmitted }: SignatoryProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = activeId ? contracts.find(c => c.id === activeId) : null

  async function setStatus(newStatus: string) {
    if (!active) return
    setSubmitting(true); setError(null)
    const update: Record<string, unknown> = { signature_status: newStatus }
    if (newStatus === 'vendor_signed') update.vendor_signed_at = new Date().toISOString()
    if (newStatus === 'fully_signed') {
      update.internal_signed_at = new Date().toISOString()
      if (!active.vendor_signed_at) update.vendor_signed_at = new Date().toISOString()
    }
    const { error: err } = await supabase
      .from('tender_contracts')
      .update(update)
      .eq('id', active.id)
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setActiveId(null)
    onSubmitted()
  }

  function handleClose() { setActiveId(null); setError(null); onClose() }

  if (contracts.length === 0) {
    return (
      <Modal open={open} onClose={handleClose} title="חתימת מורשי החתימה">
        <div className={s.warn}>אין הסכם — צור טיוטה תחילה</div>
        <div className={s.foot}>
          <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>סגור</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="חתימות הסכם — מורשי חתימה">
      {active ? (
        <>
          <div className={s.summary}>
            <div><strong>הסכם:</strong> {active.contract_number ?? active.id.slice(0, 8)}</div>
            <div><strong>סטטוס נוכחי:</strong> {active.signature_status}</div>
            <div><strong>סכום:</strong> ₪ {active.total_amount.toLocaleString('he-IL')}</div>
            {active.vendor_signed_at && <div><strong>הספק חתם:</strong> {new Date(active.vendor_signed_at).toLocaleDateString('he-IL')}</div>}
            {active.internal_signed_at && <div><strong>המזמין חתם:</strong> {new Date(active.internal_signed_at).toLocaleDateString('he-IL')}</div>}
          </div>

          <div className={s.info}>
            <strong>שלב 8.5 באפיון:</strong> חתימת המזמין מסיימת את שלב ההתקשרות.
            לרוב נדרשות שתי חתימות + בעל סמכות תקציבית.
            חתימה דיגיטלית אמיתית (Comsign/DocuSign) תחובר בפאזה 5.
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>שינוי סטטוס</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className={`${s.btn} ${s.btnSecondary}`} disabled={submitting} onClick={() => setStatus('sent_to_vendor')}>📤 נשלח לספק</button>
              <button className={`${s.btn} ${s.btnSecondary}`} disabled={submitting} onClick={() => setStatus('vendor_signed')}>📝 ספק חתם</button>
              <button className={`${s.btn} ${s.btnSecondary}`} disabled={submitting} onClick={() => setStatus('pending_signatory')}>⏳ ממתין למורשה חתימה</button>
              <button className={`${s.btn} ${s.btnSuccess}`} disabled={submitting} onClick={() => setStatus('fully_signed')}>✓ נחתם במלואו</button>
            </div>
          </div>

          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setActiveId(null)}>חזור</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>
            בחר הסכם לעדכון סטטוס החתימה
          </div>
          {contracts.map(c => (
            <div
              key={c.id}
              style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
              onClick={() => setActiveId(c.id)}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.contract_number ?? c.id.slice(0, 8)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                ₪ {c.total_amount.toLocaleString('he-IL')} · סטטוס: {c.signature_status}
              </div>
            </div>
          ))}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>סגור</button>
          </div>
        </>
      )}
    </Modal>
  )
}
