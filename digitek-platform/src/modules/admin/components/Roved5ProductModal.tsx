import { useEffect, useState } from 'react'
import { Modal, modalStyles as s } from '../../tenders/components/Modal'
import { supabase } from '../../../lib/supabase'
import type { Roved5UpsertRow } from '../lib/roved5ExcelParser'

interface Props {
  open: boolean
  onClose: () => void
  /** null = add new product; otherwise edit an existing one. */
  product: Roved5UpsertRow | null
  /** SKUs already in the catalog — used to block duplicate ids on a new product. */
  existingIds: Set<string>
  onSaved: () => void
}

const EMPTY: Roved5UpsertRow = {
  id: '', cloud: 'GCP', provider: '', manufacturer: '', name: '', description: '',
  type: 'non-SaaS', discount: null, price_link: '', contact: '', approval_date: '',
  notes: '', ps_services: 'לא כלול',
}

const SKU_RE = /^[A-Z]-\d+/i

export function Roved5ProductModal({ open, onClose, product, existingIds, onSaved }: Props) {
  const isEdit = product !== null
  const [form, setForm] = useState<Roved5UpsertRow>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product } : EMPTY)
      setError(null)
    }
  }, [open, product])

  function set<K extends keyof Roved5UpsertRow>(key: K, value: Roved5UpsertRow[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    const id = form.id.trim()
    if (!id) { setError('מק"ט (id) הוא שדה חובה'); return }
    if (!SKU_RE.test(id)) { setError('מק"ט חייב להתחיל באות ומקף — למשל G-4662-1 או A-4991-1'); return }
    if (!isEdit && existingIds.has(id)) { setError(`מק"ט ${id} כבר קיים בקטלוג. לעריכה — פתח את המוצר הקיים.`); return }
    if (!form.name.trim()) { setError('שם המוצר הוא שדה חובה'); return }

    setSaving(true)
    setError(null)
    const payload: Roved5UpsertRow = { ...form, id }
    const { error: rpcErr } = await supabase.rpc('roved5_admin_upsert', { p_data: [payload] })
    setSaving(false)
    if (rpcErr) { setError(`שמירה נכשלה: ${rpcErr.message}`); return }
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!product) return
    if (!window.confirm(`למחוק את "${product.name}" (${product.id}) מהקטלוג? פעולה זו אינה הפיכה.`)) return
    setDeleting(true)
    setError(null)
    const { error: rpcErr } = await supabase.rpc('roved5_admin_delete', { p_id: product.id })
    setDeleting(false)
    if (rpcErr) { setError(`מחיקה נכשלה: ${rpcErr.message}`); return }
    onSaved()
    onClose()
  }

  const busy = saving || deleting
  const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'עריכת מוצר' : 'מוצר חדש'}
      subtitle={isEdit ? `${product?.name} · ${product?.id}` : 'הוספת שירות לקטלוג רובד 5'}
    >
      <div style={row2}>
        <div className={s.formGroup}>
          <label className={`${s.label} ${s.required}`}>מק"ט (id)</label>
          <input
            className={s.input}
            value={form.id}
            disabled={isEdit}
            placeholder="G-4662-1"
            style={{ direction: 'ltr' }}
            onChange={e => set('id', e.target.value)}
          />
          {isEdit && <div className={s.hint}>מק"ט לא ניתן לשינוי לאחר יצירה</div>}
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>ענן</label>
          <select className={s.select} value={form.cloud} onChange={e => set('cloud', e.target.value as 'GCP' | 'AWS')}>
            <option value="GCP">GCP</option>
            <option value="AWS">AWS</option>
          </select>
        </div>
      </div>

      <div className={s.formGroup}>
        <label className={`${s.label} ${s.required}`}>שם המוצר</label>
        <input className={s.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Datastream" />
      </div>

      <div style={row2}>
        <div className={s.formGroup}>
          <label className={s.label}>יצרן</label>
          <input className={s.input} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>ספק</label>
          <input className={s.input} value={form.provider} onChange={e => set('provider', e.target.value)} />
        </div>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>תיאור</label>
        <textarea className={s.textarea} rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>

      <div style={row2}>
        <div className={s.formGroup}>
          <label className={s.label}>סוג</label>
          <select className={s.select} value={form.type} onChange={e => set('type', e.target.value as 'SaaS' | 'non-SaaS')}>
            <option value="SaaS">SaaS</option>
            <option value="non-SaaS">non-SaaS</option>
          </select>
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>הנחה (%)</label>
          <input
            className={s.input}
            type="number"
            value={form.discount ?? ''}
            placeholder="ריק = ללא הנחה ייעודית"
            onChange={e => set('discount', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </div>

      <div style={row2}>
        <div className={s.formGroup}>
          <label className={s.label}>שירותי מומחים (PS)</label>
          <select className={s.select} value={form.ps_services} onChange={e => set('ps_services', e.target.value)}>
            <option value="לא כלול">לא כלול</option>
            <option value="כלול">כלול</option>
          </select>
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>מועד אישור</label>
          <input className={s.input} value={form.approval_date} onChange={e => set('approval_date', e.target.value)} placeholder="09/02" />
        </div>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>קישור למחירון</label>
        <input className={s.input} value={form.price_link} style={{ direction: 'ltr' }} onChange={e => set('price_link', e.target.value)} placeholder="https://…" />
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>איש קשר</label>
        <input className={s.input} value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="שם | email@example.com" />
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>כללים והנחיות לרכישה</label>
        <textarea className={s.textarea} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.foot}>
        {isEdit && (
          <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={handleDelete} style={{ marginInlineEnd: 'auto' }}>
            {deleting ? 'מוחק…' : '🗑 מחק'}
          </button>
        )}
        <button className={`${s.btn} ${s.btnSecondary}`} disabled={busy} onClick={onClose}>ביטול</button>
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={handleSave}>
          {saving ? 'שומר…' : isEdit ? 'שמור שינויים' : 'הוסף מוצר'}
        </button>
      </div>
    </Modal>
  )
}
