// Standalone, headless exporter for the TAKAM / AI-ML price tables.
// Builds the printable sheet off-screen (inline styles — no CSS modules needed)
// and exports it as PDF (html2pdf) or PNG (html-to-image). Reuses the same
// authoritative data as the in-module PriceListModal so numbers never diverge.

import { ROLES_DATA, CATS, CAT_ICONS, ALL_LEVELS, LEVEL_LABELS } from '../modules/takam-calculator/data'
import { AIML_ITEMS, AIML_SIZE_LABELS } from '../modules/aiml-calculator/data'

export type PriceTableKind = 'takam' | 'aiml'
export type PriceTableFormat = 'pdf' | 'png'

const META: Record<PriceTableKind, { title: string; note: string; file: string }> = {
  takam: {
    title: 'מחירון תעריפים שעתיים — תכ"ם',
    note: 'המחירים ב-₪ לשעה, לפני מע"מ · לפי דרגות א׳–ד׳',
    file: 'מחירון-תכם-שעתי',
  },
  aiml: {
    title: 'מחירון תוצרי AI/ML לפי גודל',
    note: 'המחירים ב-₪ לתוצר, לפני מע"מ · סעיף 3.16',
    file: 'מחירון-תוצרי-AIML',
  },
}

const TH = 'padding:8px 12px;background:#0f2540;color:#fff;font-weight:700;border:1px solid #0f2540;font-size:13px'
const TD = 'padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#0f172a'
const CAT = 'background:#eff6ff;color:#0f2540;font-weight:800;font-size:13.5px;border:1px solid #e2e8f0;padding:7px 12px'
const NOBREAK = 'break-inside:avoid;page-break-inside:avoid'

const money = (n: number) => `${n.toLocaleString('he-IL')} ₪`

function buildTakamTable(): string {
  const cats = CATS.filter(c => c !== 'הכל')
  const head =
    `<th style="${TH};text-align:right;width:46%">תפקיד</th>` +
    ALL_LEVELS.map(lv => `<th style="${TH};text-align:center">דרגה ${LEVEL_LABELS[lv]}</th>`).join('')

  const body = cats.map(cat => {
    const roles = ROLES_DATA.filter(r => r.cat === cat)
    if (roles.length === 0) return ''
    const catRow = `<tr style="${NOBREAK}"><td colspan="${ALL_LEVELS.length + 1}" style="${CAT}">${CAT_ICONS[cat] ?? ''} ${cat}</td></tr>`
    const roleRows = roles.map(role => {
      const cells = ALL_LEVELS.map(lv => {
        const r = role.rates[lv]
        return `<td style="${TD};text-align:center;white-space:nowrap">${r != null ? money(r) : '—'}</td>`
      }).join('')
      return `<tr style="${NOBREAK}"><td style="${TD};font-weight:600"><span style="color:#64748b;font-size:11px;font-weight:700;margin-left:4px">${role.id}</span> ${role.name}</td>${cells}</tr>`
    }).join('')
    return catRow + roleRows
  }).join('')

  return `<table style="width:100%;border-collapse:collapse;font-family:Heebo,Arial,sans-serif"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function buildAimlTable(): string {
  const sizes = ['small', 'medium', 'large'] as const
  const head =
    `<th style="${TH};text-align:right;width:46%">תוצר</th>` +
    sizes.map(sz => `<th style="${TH};text-align:center">${AIML_SIZE_LABELS[sz]}</th>`).join('')

  const body = AIML_ITEMS.map(item => {
    const cells = sizes.map(sz =>
      `<td style="${TD};text-align:center;white-space:nowrap">${money(item.prices[sz])}</td>`,
    ).join('')
    return `<tr style="${NOBREAK}"><td style="${TD};font-weight:600"><span style="margin-left:4px">${item.icon}</span> ${item.name}</td>${cells}</tr>`
  }).join('')

  return `<table style="width:100%;border-collapse:collapse;font-family:Heebo,Arial,sans-serif"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function buildSheet(kind: PriceTableKind): string {
  const m = META[kind]
  const table = kind === 'takam' ? buildTakamTable() : buildAimlTable()
  const width = kind === 'takam' ? 1000 : 720
  return (
    `<div style="width:${width}px;background:#fff;padding:24px;font-family:Heebo,Arial,sans-serif;direction:rtl">` +
    `<div style="text-align:center;margin-bottom:18px">` +
    `<div style="font-size:20px;font-weight:800;color:#0f2540;margin-bottom:4px">${m.title}</div>` +
    `<div style="font-size:12.5px;color:#64748b">${m.note}</div>` +
    `</div>${table}</div>`
  )
}

/** Generate and download the price table as a PDF or PNG, without any modal/route. */
export async function downloadPriceTable(kind: PriceTableKind, format: PriceTableFormat): Promise<void> {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1'
  container.innerHTML = buildSheet(kind)
  document.body.appendChild(container)
  const sheet = container.firstElementChild as HTMLElement

  try {
    const m = META[kind]
    if (format === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import('html2pdf.js' as any)).default
      await html2pdf().set({
        margin: 8,
        filename: `${m.file}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: kind === 'takam' ? 'landscape' : 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
      }).from(sheet).save()
    } else {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(sheet, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${m.file}.png`
      a.click()
    }
  } finally {
    document.body.removeChild(container)
  }
}
