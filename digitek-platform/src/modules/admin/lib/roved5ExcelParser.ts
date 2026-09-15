// Client-side Excel parser for the Roved5 catalog admin uploader.
// Ported from scripts/parse-roved5.cjs — same positional column mapping, header
// detection, and value normalization — but runs in the browser via a dynamic
// xlsx import (xlsx is already a bundle dependency, used by the AI/ML export).
//
// Output rows are snake_case, ready to pass straight to the roved5_admin_upsert RPC.

/** A row shaped exactly like the roved5_services table / upsert RPC payload. */
export interface Roved5UpsertRow {
  id: string
  cloud: 'GCP' | 'AWS'
  provider: string
  manufacturer: string
  name: string
  description: string
  type: 'SaaS' | 'non-SaaS'
  discount: number | null
  price_link: string
  contact: string
  approval_date: string
  notes: string
  ps_services: string
}

// Positional column indices (0-based), based on the official catalog template:
//   0=מס"ד  1=מק"ט  2=ספק  3=יצרן  4=שם  5=תיאור  6=סוג  7=הנחה
//   8=מחירון  9=איש קשר  10=מועד אישור  11=כללים והנחיות  12=PS
const COL = {
  id: 1,
  provider: 2,
  manufacturer: 3,
  name: 4,
  description: 5,
  type: 6,
  discount: 7,
  priceLink: 8,
  contact: 9,
  approvalDate: 10,
  notes: 11,
  psServices: 12,
} as const

type Cell = string | number | boolean | null | undefined
type Row = Cell[]

function findHeaderRow(rows: Row[]): number {
  // The real header row contains "מק"ט"; robust to decorative title rows above.
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || []
    if (row.some(c => typeof c === 'string' && c.includes('מק"ט'))) return i
  }
  return -1
}

function parseDate(raw: Cell): string {
  if (raw === '' || raw === null || raw === undefined) return ''
  if (typeof raw === 'number') {
    const str = raw.toString()
    const parts = str.split('.')
    if (parts.length === 2) return `${parts[0].padStart(2, '0')}/${parts[1]}`
    return str
  }
  return String(raw).trim()
}

function parsePsServices(raw: Cell): string {
  if (raw === true) return 'כלול'
  if (raw === false) return 'לא כלול'
  const s = String(raw ?? '').trim()
  if (!s) return 'לא כלול'
  if (s === 'TRUE' || s === 'true' || s.includes('כן') || s === 'כלול') return 'כלול'
  if (s === 'FALSE' || s === 'false' || s.includes('לא')) return 'לא כלול'
  return s
}

function parseType(raw: Cell): 'SaaS' | 'non-SaaS' {
  const t = String(raw ?? '').trim().toLowerCase()
  if (t.includes('non')) return 'non-SaaS'
  if (t.includes('saas')) return 'SaaS'
  return 'non-SaaS'
}

/** Coerce the discount cell to a numeric percentage or null (DB column is numeric). */
export function parseDiscount(raw: Cell): number | null {
  if (raw === '' || raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  return Number.isFinite(n) ? n : null
}

/** Cloud is derived from the SKU prefix (G-… → GCP, A-… → AWS); sheet name is a fallback. */
function cloudFromId(id: string, sheetName: string): 'GCP' | 'AWS' | null {
  const c = id.trim().charAt(0).toUpperCase()
  if (c === 'G') return 'GCP'
  if (c === 'A') return 'AWS'
  const sn = sheetName.toLowerCase()
  if (sn.includes('aws')) return 'AWS'
  if (sn.includes('gcp') || sn.includes('google')) return 'GCP'
  return null
}

const SKU_RE = /^[A-Z]-\d+/i

/**
 * Parse an uploaded Excel file into upsert-ready rows.
 * Reads every sheet, finds each sheet's header row, keeps rows with a valid SKU,
 * and derives the cloud per row from the SKU prefix.
 */
export async function parseRoved5Excel(file: File): Promise<Roved5UpsertRow[]> {
  const XLSX = await import('xlsx')
  const buf = new Uint8Array(await file.arrayBuffer())
  const wb = XLSX.read(buf, { type: 'array' })

  const out: Roved5UpsertRow[] = []
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '', header: 1, blankrows: false })
    const headerIdx = findHeaderRow(rows)
    if (headerIdx < 0) continue

    for (const row of rows.slice(headerIdx + 1)) {
      const rawId = row[COL.id]
      if (!rawId || typeof rawId !== 'string' || !SKU_RE.test(rawId.trim())) continue
      const id = rawId.trim()
      const cloud = cloudFromId(id, sheetName)
      if (!cloud) continue

      out.push({
        id,
        cloud,
        provider: String(row[COL.provider] ?? '').trim(),
        manufacturer: String(row[COL.manufacturer] ?? '').trim(),
        name: String(row[COL.name] ?? '').trim(),
        description: String(row[COL.description] ?? '').trim(),
        type: parseType(row[COL.type]),
        discount: parseDiscount(row[COL.discount]),
        price_link: String(row[COL.priceLink] ?? '').trim(),
        contact: String(row[COL.contact] ?? '').trim().replace(/\n/g, ' | '),
        approval_date: parseDate(row[COL.approvalDate]),
        notes: String(row[COL.notes] ?? '').trim(),
        ps_services: parsePsServices(row[COL.psServices]),
      })
    }
  }

  // De-dupe by id — last occurrence wins (matches the Edge Function behavior).
  const map = new Map<string, Roved5UpsertRow>()
  for (const r of out) map.set(r.id, r)
  return Array.from(map.values())
}
