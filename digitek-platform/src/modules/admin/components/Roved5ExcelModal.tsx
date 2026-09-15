import { useRef, useState } from 'react'
import { Modal, modalStyles as s } from '../../tenders/components/Modal'
import { supabase } from '../../../lib/supabase'
import { parseRoved5Excel, type Roved5UpsertRow } from '../lib/roved5ExcelParser'

interface Props {
  open: boolean
  onClose: () => void
  existingIds: Set<string>
  onSaved: () => void
}

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

export function Roved5ExcelModal({ open, onClose, existingIds, onSaved }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<Roved5UpsertRow[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFileName(null); setRows(null); setError(null); setSavedCount(null)
    setParsing(false); setSaving(false)
  }
  function handleClose() { reset(); onClose() }

  async function pickFile(f: File | null) {
    if (!f) return
    if (f.size > MAX_FILE_SIZE) {
      setError(`קובץ גדול מדי (${(f.size / 1024 / 1024).toFixed(1)}MB). מקסימום 15MB.`)
      return
    }
    setError(null); setSavedCount(null); setRows(null); setFileName(f.name); setParsing(true)
    try {
      const parsed = await parseRoved5Excel(f)
      if (parsed.length === 0) {
        setError('לא נמצאו שורות תקינות בקובץ. ודא שיש עמודת "מק"ט" ושורות עם מק"ט בפורמט G-… / A-…')
        setRows(null)
      } else {
        setRows(parsed)
      }
    } catch (e) {
      setError(`שגיאה בקריאת הקובץ: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!rows || rows.length === 0) return
    setSaving(true); setError(null)
    const { data, error: rpcErr } = await supabase.rpc('roved5_admin_upsert', { p_data: rows })
    setSaving(false)
    if (rpcErr) { setError(`הייבוא נכשל: ${rpcErr.message}`); return }
    setSavedCount(typeof data === 'number' ? data : rows.length)
    onSaved()
  }

  const newCount = rows ? rows.filter(r => !existingIds.has(r.id)).length : 0
  const updateCount = rows ? rows.length - newCount : 0

  return (
    <Modal open={open} onClose={handleClose} title="העלאת אקסל — מיזוג לקטלוג" subtitle="מוצרים חדשים יתווספו, קיימים יתעדכנו לפי מק״ט">
      {savedCount === null && (
        <>
          <div className={s.info}>
            הקובץ ממוזג לפי מק״ט: שורות חדשות מתווספות, קיימות מתעדכנות, והשאר לא נוגע. פורמט: עמודות
            מס״ד / מק״ט / ספק / יצרן / שם / תיאור / סוג / הנחה / מחירון / איש קשר / מועד אישור / כללים / PS.
          </div>

          <div
            className={`${s.fileDrop} ${fileName ? s.fileDropActive : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files[0] ?? null) }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
            <div className={s.fileDropIcon}>📊</div>
            <div className={s.fileDropText}>{fileName ?? 'גרור קובץ אקסל או לחץ לבחירה'}</div>
            <div className={s.fileDropHint}>{parsing ? 'קורא את הקובץ…' : 'XLSX · עד 15MB'}</div>
          </div>

          {rows && (
            <div className={s.summary} style={{ marginTop: 14 }}>
              <div>נמצאו <strong>{rows.length}</strong> מוצרים תקינים בקובץ</div>
              <div>🆕 חדשים: <strong>{newCount}</strong> · ✏️ עדכון קיימים: <strong>{updateCount}</strong></div>
            </div>
          )}

          {rows && rows.length > 0 && (
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: 'var(--bg)' }}>
                    <th style={thCell}>מק״ט</th>
                    <th style={thCell}>שם</th>
                    <th style={thCell}>ענן</th>
                    <th style={thCell}>סוג</th>
                    <th style={thCell}>מצב</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map(r => (
                    <tr key={r.id}>
                      <td style={{ ...tdCell, direction: 'ltr' }}>{r.id}</td>
                      <td style={tdCell}>{r.name}</td>
                      <td style={tdCell}>{r.cloud}</td>
                      <td style={tdCell}>{r.type}</td>
                      <td style={tdCell}>{existingIds.has(r.id) ? '✏️ עדכון' : '🆕 חדש'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <div style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--text3)' }}>
                  מציג 100 מתוך {rows.length} — כולם ייובאו.
                </div>
              )}
            </div>
          )}

          {error && <div className={s.error}>{error}</div>}

          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnSecondary}`} disabled={saving} onClick={handleClose}>ביטול</button>
            <button className={`${s.btn} ${s.btnPrimary}`} disabled={saving || parsing || !rows} onClick={handleImport}>
              {saving ? 'מייבא…' : `📥 ייבא ${rows ? rows.length : ''} מוצרים`}
            </button>
          </div>
        </>
      )}

      {savedCount !== null && (
        <>
          <div className={s.summary} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
            <div><strong>{savedCount}</strong> מוצרים נכתבו לקטלוג בהצלחה</div>
          </div>
          <div className={s.foot}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleClose}>סגור</button>
          </div>
        </>
      )}
    </Modal>
  )
}

const thCell: React.CSSProperties = {
  textAlign: 'right', padding: '7px 10px', fontWeight: 700,
  color: 'var(--text2)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap',
}
const tdCell: React.CSSProperties = {
  textAlign: 'right', padding: '6px 10px', color: 'var(--text)',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
}
