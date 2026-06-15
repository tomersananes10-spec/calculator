// Modals של שלבים S9 (PO), S10/S11 (אבני דרך + חשבוניות), S12 (הערכת ספק)

import { useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import type { TenderContract, TenderMilestone, TenderProposal, TenderVendor } from '../../types'

// ───────────────────────────────────────────────────
// PurchaseOrderModal (S9) — הקמת PO
// ───────────────────────────────────────────────────

interface POProps {
  open: boolean
  onClose: () => void
  tenderId: string
  contracts: TenderContract[]
  onSubmitted: () => void
}

export function PurchaseOrderModal({ open, onClose, tenderId, contracts, onSubmitted }: POProps) {
  const contract = contracts.find(c => c.signature_status === 'fully_signed') ?? contracts[0]
  const [poNumber, setPoNumber] = useState('')
  const [erpRef, setErpRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!contract) { setError('אין הסכם חתום'); return }
    if (!poNumber.trim()) { setError('יש להזין מספר PO'); return }
    setSubmitting(true); setError(null)
    const { error: err } = await supabase
      .from('tender_purchase_orders')
      .insert({
        tender_id: tenderId,
        contract_id: contract.id,
        po_number: poNumber.trim(),
        erp_ref: erpRef.trim() || null,
        total_amount: contract.total_amount,
        status: 'sent_to_vendor',
        issued_at: new Date().toISOString(),
        sent_to_vendor_at: new Date().toISOString(),
      })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    onSubmitted(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="הקמת הזמנת רכש (PO)">
      <div className={s.info}>
        PO מקושר להסכם החתום. סטטוס יעודכן ל-"נשלח לספק" אוטומטית.
        בפאזה 5 — אינטגרציה אמיתית ל-ERP תקים את ההזמנה במערכת.
      </div>
      <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>מספר PO</label>
        <input className={s.input} value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="PO-2026-0042" /></div>
      <div className={s.formGroup}><label className={s.label}>קישור ב-ERP (אופציונלי)</label>
        <input className={s.input} value={erpRef} onChange={e => setErpRef(e.target.value)} placeholder="ERP-REF-123" /></div>
      {contract && (
        <div className={s.summary}>
          <div><strong>הסכם:</strong> {contract.contract_number ?? contract.id.slice(0, 8)}</div>
          <div><strong>סכום:</strong> ₪ {contract.total_amount.toLocaleString('he-IL')}</div>
        </div>
      )}
      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'מקים…' : 'הקם PO ושלח'}
        </button>
      </div>
    </Modal>
  )
}

// ───────────────────────────────────────────────────
// MilestoneModal (S10/S11) — יצירה ועדכון אבני דרך
// ───────────────────────────────────────────────────

interface MilestoneProps {
  open: boolean
  onClose: () => void
  tenderId: string
  milestones: TenderMilestone[]
  onSubmitted: () => void
}

export function MilestoneModal({ open, onClose, tenderId, milestones, onSubmitted }: MilestoneProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'review'>('list')
  const [activeId, setActiveId] = useState<string | null>(null)
  // create form
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [plannedDate, setPlannedDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = activeId ? milestones.find(m => m.id === activeId) : null

  async function createMilestone() {
    if (!title.trim() || amount <= 0) { setError('שם וסכום הם חובה'); return }
    setSubmitting(true); setError(null)
    const nextSeq = milestones.length + 1
    const { error: err } = await supabase
      .from('tender_milestones')
      .insert({
        tender_id: tenderId,
        sequence_no: nextSeq,
        title: title.trim(),
        planned_amount: amount,
        planned_date: plannedDate || null,
        status: 'planned',
      })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setTitle(''); setAmount(0); setPlannedDate('')
    setMode('list')
    onSubmitted()
  }

  async function updateStatus(newStatus: string, rejectionReason?: string) {
    if (!active) return
    setSubmitting(true); setError(null)
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'accepted' || newStatus === 'partially_accepted') {
      update.approved_at = new Date().toISOString()
      update.actual_date = new Date().toISOString().slice(0, 10)
    }
    if (newStatus === 'rejected' && rejectionReason) update.rejection_reason = rejectionReason
    const { error: err } = await supabase
      .from('tender_milestones')
      .update(update)
      .eq('id', active.id)
    setSubmitting(false)
    if (err) { setError(err.message); return }
    setActiveId(null); setMode('list')
    onSubmitted()
  }

  function handleClose() { setActiveId(null); setMode('list'); setError(null); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="ניהול אבני דרך">
      {mode === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{milestones.length} אבני דרך</div>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setMode('create')}>+ אבן דרך חדשה</button>
          </div>
          {milestones.length === 0 ? (
            <div className={s.warn}>טרם הוגדרו אבני דרך — הגדר את אבן הדרך הראשונה</div>
          ) : (
            milestones.map(m => (
              <div
                key={m.id}
                style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
                onClick={() => { setActiveId(m.id); setMode('review') }}
              >
                <div style={{ fontWeight: 700, fontSize: 13 }}>{m.sequence_no}. {m.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                  ₪ {m.planned_amount?.toLocaleString('he-IL') ?? '—'} · יעד {m.planned_date ?? '—'} · {m.status}
                </div>
              </div>
            ))
          )}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={handleClose}>סגור</button>
          </div>
        </>
      )}

      {mode === 'create' && (
        <>
          <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>שם אבן הדרך</label>
            <input className={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="פיתוח MVP, פריסה לסביבת ייצור..." /></div>
          <div className={s.formGroup}><label className={`${s.label} ${s.required}`}>סכום מתוכנן (₪)</label>
            <input className={s.input} type="number" min={0} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} /></div>
          <div className={s.formGroup}><label className={s.label}>תאריך יעד</label>
            <input className={s.input} type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} /></div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setMode('list')}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={createMilestone}>
              {submitting ? 'יוצר…' : 'צור'}
            </button>
          </div>
        </>
      )}

      {mode === 'review' && active && (
        <>
          <div className={s.summary}>
            <div><strong>אבן דרך #{active.sequence_no}:</strong> {active.title}</div>
            <div><strong>סכום:</strong> ₪ {active.planned_amount?.toLocaleString('he-IL') ?? '—'}</div>
            <div><strong>סטטוס נוכחי:</strong> {active.status}</div>
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>עדכן סטטוס</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className={`${s.btn} ${s.btnSecondary}`} disabled={submitting} onClick={() => updateStatus('in_progress')}>🔧 בביצוע</button>
              <button className={`${s.btn} ${s.btnSecondary}`} disabled={submitting} onClick={() => updateStatus('submitted')}>📦 הוגש</button>
              <button className={`${s.btn} ${s.btnSuccess}`} disabled={submitting} onClick={() => updateStatus('accepted')}>✓ אושר</button>
              <button className={`${s.btn} ${s.btnDanger}`} disabled={submitting} onClick={() => updateStatus('rejected', 'נדרשים תיקונים')}>✗ נדחה</button>
            </div>
          </div>
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => { setActiveId(null); setMode('list') }}>חזור</button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ───────────────────────────────────────────────────
// VendorEvaluationModal (S12) — הערכת ספק — closure blocker
// ───────────────────────────────────────────────────

interface EvalProps {
  open: boolean
  onClose: () => void
  tenderId: string
  proposals: TenderProposal[]
  vendors: TenderVendor[]
  onSubmitted: () => void
}

export function VendorEvaluationModal({ open, onClose, tenderId, proposals, vendors, onSubmitted }: EvalProps) {
  const winner = proposals.find(p => p.status === 'winner')
  const winnerName = winner ? vendors.find(v => v.id === winner.vendor_id)?.name : undefined
  const [quality, setQuality] = useState(70)
  const [timeliness, setTimeliness] = useState(70)
  const [communication, setCommunication] = useState(70)
  const [value, setValue] = useState(70)
  const [notes, setNotes] = useState('')
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overall = (quality + timeliness + communication + value) / 4

  async function handleSubmit() {
    if (!winner) { setError('לא נמצא ספק זוכה'); return }
    setSubmitting(true); setError(null)
    const { error: err } = await supabase
      .from('tender_vendor_evaluations')
      .insert({
        tender_id: tenderId,
        vendor_id: winner.vendor_id,
        evaluator_id: (await supabase.auth.getUser()).data.user?.id,
        score_quality: quality,
        score_timeliness: timeliness,
        score_communication: communication,
        score_value: value,
        notes: notes.trim() || null,
        recommended_for_future: recommend,
      })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    onSubmitted(); onClose()
  }

  if (!winner) {
    return (
      <Modal open={open} onClose={onClose} title="הערכת ספק">
        <div className={s.warn}>לא נמצא ספק זוכה — לא ניתן להעריך</div>
        <div className={s.foot}>
          <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>סגור</button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="הערכת ספק (חובה לסגירה)">
      <div className={s.info}>
        <strong>סיכון #11:</strong> לא ניתן לסגור הליך ללא הערכת ספק.
        ההערכה תיכנס לציון הממוצע של הספק ותשפיע על מכרזים עתידיים.
      </div>
      <div className={s.summary}>
        <div><strong>ספק זוכה:</strong> {winnerName ?? winner.vendor_id.slice(0, 8)}</div>
        <div><strong>ציון משוקלל:</strong> {overall.toFixed(1)} / 100</div>
      </div>

      <div className={s.formGroup}><label className={s.label}>איכות התוצרים — {quality}</label>
        <input type="range" min={0} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} style={{ width: '100%' }} /></div>
      <div className={s.formGroup}><label className={s.label}>עמידה בזמנים — {timeliness}</label>
        <input type="range" min={0} max={100} value={timeliness} onChange={e => setTimeliness(Number(e.target.value))} style={{ width: '100%' }} /></div>
      <div className={s.formGroup}><label className={s.label}>תקשורת — {communication}</label>
        <input type="range" min={0} max={100} value={communication} onChange={e => setCommunication(Number(e.target.value))} style={{ width: '100%' }} /></div>
      <div className={s.formGroup}><label className={s.label}>ערך כולל — {value}</label>
        <input type="range" min={0} max={100} value={value} onChange={e => setValue(Number(e.target.value))} style={{ width: '100%' }} /></div>

      <div className={s.formGroup}>
        <label className={s.label}>המלצה לעתיד?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`${s.btn} ${recommend === true ? s.btnSuccess : s.btnSecondary}`} onClick={() => setRecommend(true)}>👍 ממליץ</button>
          <button className={`${s.btn} ${recommend === false ? s.btnDanger : s.btnSecondary}`} onClick={() => setRecommend(false)}>👎 לא ממליץ</button>
        </div>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>הערות</label>
        <textarea className={s.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="נימוקים לציון" />
      </div>

      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'שולח…' : 'הגש הערכה'}
        </button>
      </div>
    </Modal>
  )
}
