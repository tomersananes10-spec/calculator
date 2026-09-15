import { Fragment, useRef, useState } from 'react'
import { ROLES_DATA, CATS, CAT_ICONS, ALL_LEVELS, LEVEL_LABELS } from './data'
import s from './PriceListModal.module.css'

const CATEGORIES = CATS.filter(c => c !== 'הכל')

export function PriceListModal({ onClose }: { onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<null | 'pdf' | 'png'>(null)

  async function downloadPDF() {
    if (!printRef.current) return
    setBusy('pdf')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import('html2pdf.js' as any)).default
      await html2pdf().set({
        margin: 8,
        filename: 'מחירון-תכם-שעתי.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      }).from(printRef.current).save()
    } finally {
      setBusy(null)
    }
  }

  async function downloadPNG() {
    if (!printRef.current) return
    setBusy('png')
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(printRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'מחירון-תכם-שעתי.png'
      a.click()
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={s.dialog} role="dialog" aria-modal="true">
        <div className={s.header}>
          <h2 className={s.dialogTitle}>📋 מחירון תעריפים שעתיים — תכ"ם</h2>
          <div className={s.headerActions}>
            <button className={s.exportBtn} onClick={downloadPDF} disabled={busy !== null}>
              {busy === 'pdf' ? '⏳ מייצא…' : '📄 PDF'}
            </button>
            <button className={s.exportBtn} onClick={downloadPNG} disabled={busy !== null}>
              {busy === 'png' ? '⏳ מייצא…' : '🖼️ תמונה'}
            </button>
            <button className={s.closeBtn} onClick={onClose} aria-label="סגור">✕</button>
          </div>
        </div>

        <div className={s.scrollArea}>
          <div className={s.printSheet} ref={printRef}>
            <div className={s.sheetHeader}>
              <h3 className={s.sheetTitle}>מחירון תעריפים שעתיים — תכ"ם</h3>
              <span className={s.sheetNote}>המחירים ב-₪ לשעה, לפני מע"מ · לפי דרגות א׳–ד׳</span>
            </div>

            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.roleCol}>תפקיד</th>
                  {ALL_LEVELS.map(lv => (
                    <th key={lv} className={s.rateCol}>דרגה {LEVEL_LABELS[lv]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => {
                  const roles = ROLES_DATA.filter(r => r.cat === cat)
                  if (roles.length === 0) return null
                  return (
                    <Fragment key={cat}>
                      <tr className={s.catRow}>
                        <td colSpan={ALL_LEVELS.length + 1}>
                          {CAT_ICONS[cat] ?? ''} {cat}
                        </td>
                      </tr>
                      {roles.map(role => (
                        <tr key={role.id} className={s.roleRow}>
                          <td className={s.roleName}>
                            <span className={s.roleId}>{role.id}</span> {role.name}
                          </td>
                          {ALL_LEVELS.map(lv => {
                            const rate = role.rates[lv]
                            return (
                              <td key={lv} className={s.rateCell}>
                                {rate != null ? `${rate.toLocaleString('he-IL')} ₪` : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
