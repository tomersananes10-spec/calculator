// Headless exporters for the רובד 5 catalog (current filtered list).
// Excel via xlsx, PDF via html2pdf — same deps already used elsewhere in the app.

import * as XLSX from 'xlsx'
import type { Roved5Service } from './types'

export function formatDiscount(d: string | number): string {
  if (typeof d === 'number') return `${Math.round(d * 100)}%`
  if (!d || /לא רלוונטי/.test(String(d))) return 'BYOL / לפי רישיון'
  return String(d)
}

const HEADERS = ['מק״ט', 'שם השירות', 'יצרן', 'ספק', 'ענן', 'סוג', 'הנחה', 'מועד אישור', 'הערות'] as const

function toRow(s: Roved5Service) {
  return {
    'מק״ט': s.id,
    'שם השירות': s.name,
    'יצרן': s.manufacturer || '',
    'ספק': s.provider || '',
    'ענן': s.cloud,
    'סוג': s.type,
    'הנחה': formatDiscount(s.discount),
    'מועד אישור': s.approvalDate || '',
    'הערות': s.notes || '',
  }
}

/** Download the given services as an RTL Excel file. */
export function exportRoved5Excel(services: Roved5Service[]): void {
  const ws = XLSX.utils.json_to_sheet(services.map(toRow), { header: [...HEADERS] })
  ws['!cols'] = [
    { wch: 14 }, { wch: 40 }, { wch: 24 }, { wch: 20 },
    { wch: 8 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 50 },
  ]
  // RTL sheet view
  ws['!views'] = [{ RTL: true }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'רובד 5')
  XLSX.writeFile(wb, `רובד-5-קטלוג-${services.length}.xlsx`)
}

/** Download the given services as a PDF table (landscape A4). */
export async function exportRoved5Pdf(services: Roved5Service[]): Promise<void> {
  const TH = 'padding:7px 9px;background:#1e3a8a;color:#fff;font-weight:700;border:1px solid #1e3a8a;font-size:11px'
  const TD = 'padding:6px 9px;border:1px solid #e2e8f0;font-size:10.5px;color:#0f172a'
  const NOBREAK = 'break-inside:avoid;page-break-inside:avoid'
  const rows = services.map(s =>
    `<tr style="${NOBREAK}">
      <td style="${TD};font-family:monospace;white-space:nowrap">${s.id}</td>
      <td style="${TD};font-weight:600">${escapeHtml(s.name)}</td>
      <td style="${TD}">${escapeHtml(s.manufacturer || '')}</td>
      <td style="${TD};text-align:center">${s.cloud}</td>
      <td style="${TD};text-align:center">${s.type}</td>
      <td style="${TD};text-align:center;white-space:nowrap">${formatDiscount(s.discount)}</td>
      <td style="${TD};text-align:center;white-space:nowrap">${s.approvalDate || '—'}</td>
    </tr>`,
  ).join('')

  const html =
    `<div style="width:1050px;background:#fff;padding:22px;font-family:Heebo,Arial,sans-serif;direction:rtl">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:20px;font-weight:800;color:#1e3a8a">רובד 5 — קטלוג שירותי ענן מאושרים</div>
        <div style="font-size:12px;color:#64748b">${services.length.toLocaleString()} שירותים · LIBA</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${TH}">מק״ט</th><th style="${TH};text-align:right">שם השירות</th>
          <th style="${TH};text-align:right">יצרן</th><th style="${TH}">ענן</th>
          <th style="${TH}">סוג</th><th style="${TH}">הנחה</th><th style="${TH}">אישור</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1'
  container.innerHTML = html
  document.body.appendChild(container)
  const sheet = container.firstElementChild as HTMLElement
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2pdf = (await import('html2pdf.js' as any)).default
    await html2pdf().set({
      margin: 8,
      filename: `רובד-5-קטלוג-${services.length}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
    }).from(sheet).save()
  } finally {
    document.body.removeChild(container)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c))
}
