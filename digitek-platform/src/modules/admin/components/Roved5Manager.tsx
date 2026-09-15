import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Roved5UpsertRow } from '../lib/roved5ExcelParser'
import { Roved5ProductModal } from './Roved5ProductModal'
import { Roved5ExcelModal } from './Roved5ExcelModal'
import s from './Roved5Manager.module.css'

const SELECT = 'id,cloud,provider,manufacturer,name,description,type,discount,price_link,contact,approval_date,notes,ps_services'

interface DbRow {
  id: string
  cloud: 'GCP' | 'AWS'
  provider: string | null
  manufacturer: string | null
  name: string | null
  description: string | null
  type: 'SaaS' | 'non-SaaS'
  discount: number | null
  price_link: string | null
  contact: string | null
  approval_date: string | null
  notes: string | null
  ps_services: string | null
}

function mapRow(r: DbRow): Roved5UpsertRow {
  return {
    id: r.id,
    cloud: r.cloud,
    provider: r.provider ?? '',
    manufacturer: r.manufacturer ?? '',
    name: r.name ?? '',
    description: r.description ?? '',
    type: r.type,
    discount: r.discount,
    price_link: r.price_link ?? '',
    contact: r.contact ?? '',
    approval_date: r.approval_date ?? '',
    notes: r.notes ?? '',
    ps_services: r.ps_services ?? '',
  }
}

export default function Roved5Manager() {
  const [products, setProducts] = useState<Roved5UpsertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Roved5UpsertRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [excelOpen, setExcelOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('roved5_services')
      .select(SELECT)
      .order('cloud')
      .order('id')
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setProducts((data as DbRow[]).map(mapRow))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const existingIds = useMemo(() => new Set(products.map(p => p.id)), [products])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return products
    return products.filter(p =>
      `${p.id} ${p.name} ${p.manufacturer} ${p.provider}`.toLowerCase().includes(term),
    )
  }, [products, q])

  function openNew() { setEditing(null); setEditOpen(true) }
  function openEdit(p: Roved5UpsertRow) { setEditing(p); setEditOpen(true) }

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        <input
          className={s.search}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="חיפוש לפי שם, מק״ט, יצרן או ספק…"
        />
        <span className={s.count}>{filtered.length} מתוך {products.length}</span>
        <button className={`${s.btn} ${s.btnSecondary}`} onClick={() => setExcelOpen(true)}>📥 העלאת אקסל</button>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={openNew}>➕ מוצר חדש</button>
      </div>

      {error && <div className={s.error}>שגיאה בטעינה: {error}</div>}

      {loading ? (
        <div className={s.spinner} />
      ) : filtered.length === 0 ? (
        <div className={s.empty}>{products.length === 0 ? 'אין מוצרים בקטלוג עדיין.' : 'לא נמצאו מוצרים התואמים לחיפוש.'}</div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>מק״ט</th>
                <th>שם</th>
                <th className={s.hideSm}>יצרן</th>
                <th>ענן</th>
                <th className={s.hideSm}>סוג</th>
                <th className={s.hideSm}>הנחה</th>
                <th className={s.hideSm}>מועד אישור</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={s.row} onClick={() => openEdit(p)}>
                  <td className={s.sku}>{p.id}</td>
                  <td>{p.name}</td>
                  <td className={s.hideSm}>{p.manufacturer}</td>
                  <td>
                    <span className={`${s.badge} ${p.cloud === 'GCP' ? s.badgeGCP : s.badgeAWS}`}>{p.cloud}</span>
                  </td>
                  <td className={s.hideSm}>{p.type}</td>
                  <td className={s.hideSm}>{p.discount !== null ? `${p.discount}%` : '—'}</td>
                  <td className={s.hideSm}>{p.approval_date || '—'}</td>
                  <td>
                    <button className={s.editBtn} onClick={e => { e.stopPropagation(); openEdit(p) }}>עריכה</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Roved5ProductModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={editing}
        existingIds={existingIds}
        onSaved={load}
      />
      <Roved5ExcelModal
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        existingIds={existingIds}
        onSaved={load}
      />
    </div>
  )
}
