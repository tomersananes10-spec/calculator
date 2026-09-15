import { useRef, useState } from 'react'
import { AIML_ITEMS, AIML_SIZE_LABELS } from './data'
import s from '../takam-calculator/PriceListModal.module.css'

const SIZES = ['small', 'medium', 'large'] as const

export function AimlPriceListModal({ onClose }: { onClose: () => void }) {
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
        filename: 'מחירון-תוצרי-AIML.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
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
      a.download = 'מחירון-תוצרי-AIML.png'
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
          <h2 className={s.dialogTitle}>📋 מחירון תוצרי AI/ML לפי גודל</h2>
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
              <h3 className={s.sheetTitle}>מחירון תוצרי AI/ML לפי גודל</h3>
              <span className={s.sheetNote}>המחירים ב-₪ לתוצר, לפני מע"מ · סעיף 3.16</span>
            </div>

            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.roleCol}>תוצר</th>
                  {SIZES.map(sz => (
                    <th key={sz} className={s.rateCol}>{AIML_SIZE_LABELS[sz]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AIML_ITEMS.map(item => (
                  <tr key={item.id} className={s.roleRow}>
                    <td className={s.roleName}>
                      <span className={s.roleId}>{item.icon}</span> {item.name}
                    </td>
                    {SIZES.map(sz => (
                      <td key={sz} className={s.rateCell}>
                        {item.prices[sz].toLocaleString('he-IL')} ₪
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
