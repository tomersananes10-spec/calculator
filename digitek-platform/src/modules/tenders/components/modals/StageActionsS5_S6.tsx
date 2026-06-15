// Modals של שלבים S5 (הפצה לספקים) ו-S6 (רישום הצעות + בחירת זוכה)

import { useState } from 'react'
import { Modal, modalStyles as s } from '../Modal'
import { supabase } from '../../../../lib/supabase'
import type { TenderProposal, TenderVendor } from '../../types'

// ───────────────────────────────────────────────────
// VendorPickerModal (S5) — בחירת ספקים והפצת הפניה
// ───────────────────────────────────────────────────

interface VendorPickerProps {
  open: boolean
  onClose: () => void
  tenderId: string
  vendors: TenderVendor[]
  existingProposals: TenderProposal[]
  onSubmitted: () => void
}

export function VendorPickerModal({ open, onClose, tenderId, vendors, existingProposals, onSubmitted }: VendorPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newVendorName, setNewVendorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existingVendorIds = new Set(existingProposals.map(p => p.vendor_id))
  const availableVendors = vendors.filter(v => v.registration_status === 'active' && !existingVendorIds.has(v.id))

  function toggle(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  async function handleSubmit() {
    if (selectedIds.size === 0 && !newVendorName.trim()) {
      setError('יש לבחור לפחות ספק אחד')
      return
    }
    setSubmitting(true)
    setError(null)

    // אם הוזן ספק חדש — צור אותו קודם
    const allVendorIds = new Set(selectedIds)
    if (newVendorName.trim()) {
      const { data: newVendor, error: vErr } = await supabase
        .from('tender_vendors')
        .insert({ name: newVendorName.trim(), registration_status: 'active' })
        .select('id')
        .single()
      if (vErr) {
        setSubmitting(false)
        setError(`יצירת ספק נכשלה: ${vErr.message}`)
        return
      }
      allVendorIds.add(newVendor.id)
    }

    // צור הצעות בסטטוס draft לכל הספקים
    const rows = Array.from(allVendorIds).map(vendor_id => ({
      tender_id: tenderId,
      vendor_id,
      status: 'draft' as const,
    }))
    const { error: pErr } = await supabase.from('tender_proposals').insert(rows)
    setSubmitting(false)
    if (pErr) {
      setError(pErr.message)
      return
    }
    setSelectedIds(new Set()); setNewVendorName('')
    onSubmitted()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="הפצת הפניה לספקים">
      <div className={s.info}>
        בחר ספקים מהרשימה או הזן ספק חדש. לאחר ההפצה תוכל לקבל הצעות בשלב 6.
      </div>

      {availableVendors.length > 0 ? (
        <div className={s.formGroup}>
          <label className={s.label}>ספקים פעילים ({availableVendors.length})</label>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8 }}>
            {availableVendors.map(v => (
              <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(v.id)}
                  onChange={() => toggle(v.id)}
                />
                <span style={{ fontWeight: 600 }}>{v.name}</span>
                {v.avg_score != null && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 'auto' }}>
                    ציון: {v.avg_score}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className={s.summary}>אין ספקים פעילים במאגר עדיין</div>
      )}

      <div className={s.formGroup}>
        <label className={s.label}>או — הוסף ספק חדש</label>
        <input
          className={s.input}
          value={newVendorName}
          onChange={e => setNewVendorName(e.target.value)}
          placeholder="שם הספק"
        />
        <div className={s.hint}>הספק ייווצר במאגר הראשי וייקושר להליך זה</div>
      </div>

      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'מפיץ…' : `הפץ ל-${selectedIds.size + (newVendorName.trim() ? 1 : 0)} ספקים`}
        </button>
      </div>
    </Modal>
  )
}

// ───────────────────────────────────────────────────
// ProposalModal (S6) — רישום הצעה / ניקוד
// ───────────────────────────────────────────────────

interface ProposalProps {
  open: boolean
  onClose: () => void
  proposals: TenderProposal[]
  vendors: TenderVendor[]
  selectionType: 'price_only' | 'quality_price'
  onSubmitted: () => void
}

export function ProposalModal({ open, onClose, proposals, vendors, selectionType, onSubmitted }: ProposalProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [price, setPrice] = useState<number>(0)
  const [qualityScore, setQualityScore] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vendorMap = new Map(vendors.map(v => [v.id, v.name]))
  const active = activeId ? proposals.find(p => p.id === activeId) : null

  function openProposal(p: TenderProposal) {
    setActiveId(p.id)
    setPrice(p.price ?? 0)
    setQualityScore(p.quality_score ?? 0)
    setError(null)
  }

  async function handleSave() {
    if (!active) return
    if (price <= 0) {
      setError('יש להזין מחיר')
      return
    }
    setSubmitting(true)
    setError(null)
    const updates: Record<string, unknown> = {
      price,
      status: 'submitted',
      submitted_at: active.submitted_at ?? new Date().toISOString(),
    }
    if (selectionType === 'quality_price') {
      updates.quality_score = qualityScore
      // חישוב פשוט — 60% איכות 40% מחיר. השוואה לכל ההצעות תתבצע ע"י select_winner
      updates.weighted_score = qualityScore * 0.6 + ((1 / price) * 1000000) * 0.4
    }
    const { error: err } = await supabase
      .from('tender_proposals')
      .update(updates)
      .eq('id', active.id)
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    setActiveId(null)
    onSubmitted()
  }

  function handleClose() {
    setActiveId(null); setPrice(0); setQualityScore(0); setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="הצעות ספקים">
      {active ? (
        <>
          <div className={s.summary}>
            <div><strong>ספק:</strong> {vendorMap.get(active.vendor_id) ?? active.vendor_id.slice(0, 8)}</div>
          </div>
          <div className={s.formGroup}>
            <label className={`${s.label} ${s.required}`}>מחיר ההצעה (₪)</label>
            <input
              className={s.input}
              type="number"
              min={0}
              value={price || ''}
              onChange={e => setPrice(Number(e.target.value))}
            />
          </div>
          {selectionType === 'quality_price' && (
            <div className={s.formGroup}>
              <label className={s.label}>ניקוד איכות (0-100)</label>
              <input
                className={s.input}
                type="number"
                min={0}
                max={100}
                value={qualityScore || ''}
                onChange={e => setQualityScore(Number(e.target.value))}
              />
              <div className={s.hint}>ניקוד ועדת המשנה — איכות, ניסיון, המלצות</div>
            </div>
          )}
          {error && <div className={s.error}>{error}</div>}
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setActiveId(null)}>חזור</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting} onClick={handleSave}>
              {submitting ? 'שומר…' : 'שמור הצעה'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text2)' }}>
            {proposals.length} הצעות. לחץ על הצעה כדי להזין/לעדכן מחיר וניקוד.
          </div>
          {proposals.length === 0 && (
            <div className={s.warn}>אין הצעות עדיין. חזור לשלב 5 והפץ לספקים.</div>
          )}
          {proposals.map(p => (
            <div
              key={p.id}
              style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => openProposal(p)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{vendorMap.get(p.vendor_id) ?? p.vendor_id.slice(0, 8)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                  {p.price ? `₪ ${p.price.toLocaleString('he-IL')}` : 'לא הוזן מחיר'}
                  {p.quality_score != null && ` · איכות ${p.quality_score}`}
                </div>
              </div>
              <span style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 600,
                background: p.status === 'winner' ? 'var(--green-bg)' : p.status === 'submitted' ? 'var(--primary-bg)' : '#f1f5f9',
                color: p.status === 'winner' ? 'var(--green)' : p.status === 'submitted' ? 'var(--primary)' : 'var(--text3)',
              }}>{p.status}</span>
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

// ───────────────────────────────────────────────────
// WinnerSelectionModal (S6) — סימון זוכה
// ───────────────────────────────────────────────────

interface WinnerProps {
  open: boolean
  onClose: () => void
  proposals: TenderProposal[]
  vendors: TenderVendor[]
  selectionType: 'price_only' | 'quality_price'
  onSubmitted: () => void
}

export function WinnerSelectionModal({ open, onClose, proposals, vendors, selectionType, onSubmitted }: WinnerProps) {
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const vendorMap = new Map(vendors.map(v => [v.id, v.name]))

  const qualified = proposals.filter(p => p.price != null && p.price > 0 && p.status !== 'rejected' && p.status !== 'disqualified')

  // דירוג אוטומטי לפי קריטריונים
  const ranked = [...qualified].sort((a, b) => {
    if (selectionType === 'price_only') return (a.price ?? Infinity) - (b.price ?? Infinity)
    return (b.weighted_score ?? 0) - (a.weighted_score ?? 0)
  })

  async function handleConfirm() {
    if (!winnerId) {
      setError('יש לבחור זוכה')
      return
    }
    setSubmitting(true)
    setError(null)
    // עדכן את כל ההצעות — winner = winner, ההאחרות = runner_up/qualified
    const updates = ranked.map((p, idx) => ({
      id: p.id,
      status: p.id === winnerId ? 'winner' as const : idx === 0 ? 'runner_up' as const : 'qualified' as const,
      rank: p.id === winnerId ? 1 : (ranked.findIndex(r => r.id === p.id) + 1),
    }))
    const errors: string[] = []
    for (const u of updates) {
      const { error: err } = await supabase
        .from('tender_proposals')
        .update({ status: u.status, rank: u.rank })
        .eq('id', u.id)
      if (err) errors.push(err.message)
    }
    setSubmitting(false)
    if (errors.length > 0) {
      setError(errors.join(' · '))
      return
    }
    onSubmitted()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="בחירת ספק זוכה">
      <div className={s.info}>
        בחירה זו תסומן ב-DB אבל לא תהווה זוכה רשמי עד לאישור ועדת המכרזים (שלב 7)
      </div>
      {ranked.length === 0 ? (
        <div className={s.warn}>אין הצעות שניתן לבחור מהן — הזן מחירים תחילה</div>
      ) : (
        <div className={s.formGroup}>
          <label className={s.label}>דירוג נוכחי</label>
          {ranked.map((p, idx) => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="winner"
                checked={winnerId === p.id}
                onChange={() => setWinnerId(p.id)}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>#{idx + 1} · {vendorMap.get(p.vendor_id) ?? p.vendor_id.slice(0, 8)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
                  ₪ {p.price?.toLocaleString('he-IL')}
                  {p.quality_score != null && ` · איכות ${p.quality_score}`}
                  {p.weighted_score != null && ` · משוקלל ${p.weighted_score.toFixed(2)}`}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
      {error && <div className={s.error}>{error}</div>}
      <div className={s.foot}>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={submitting || !winnerId} onClick={handleConfirm}>
          {submitting ? 'שומר…' : 'אשר זוכה מועדף'}
        </button>
      </div>
    </Modal>
  )
}
