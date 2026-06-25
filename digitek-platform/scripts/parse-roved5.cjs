const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const filePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '_ רשימת השירותים המאושרים לרכישה ברובד 5 (עודכן ביום 09.02.2026).xlsx')

if (!fs.existsSync(filePath)) {
  console.error('ERROR: XLSX file not found at:', filePath)
  console.error('Usage: node parse-roved5.cjs [path/to/file.xlsx]')
  process.exit(1)
}

console.log('Reading:', filePath)
const workbook = XLSX.readFile(filePath)

// Column indices (positional, 0-based) — based on the catalog template:
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
}

function findHeaderRow(rows) {
  // Locate the actual header row by searching for "מק"ט" (anywhere) in the first 10 rows.
  // This is robust to extra decorative title rows above the table.
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || []
    if (row.some(cell => typeof cell === 'string' && cell.includes('מק"ט'))) return i
  }
  return -1
}

function parseDate(raw) {
  if (raw === '' || raw === null || raw === undefined) return ''
  if (typeof raw === 'number') {
    const str = raw.toString()
    const parts = str.split('.')
    if (parts.length === 2) return `${parts[0].padStart(2, '0')}/${parts[1]}`
    return str
  }
  return String(raw).trim()
}

function parsePsServices(raw) {
  if (raw === true) return 'כלול'
  if (raw === false) return 'לא כלול'
  const s = String(raw || '').trim()
  if (!s) return 'לא כלול'
  if (s === 'TRUE' || s === 'true' || s.includes('כן') || s === 'כלול') return 'כלול'
  if (s === 'FALSE' || s === 'false' || s.includes('לא')) return 'לא כלול'
  return s
}

function parseType(raw) {
  const t = String(raw || '').trim().toLowerCase()
  if (t.includes('non') || t.includes('non-saas')) return 'non-SaaS'
  if (t.includes('saas')) return 'SaaS'
  return 'non-SaaS'
}

function parseSheet(sheetName, cloud) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    console.warn(`Sheet "${sheetName}" not found — skipping`)
    return []
  }
  // header: 1 → returns array of arrays, indexed by column position (deterministic).
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1, blankrows: false })

  const headerIdx = findHeaderRow(rows)
  if (headerIdx < 0) {
    console.warn(`Header row not found in sheet "${sheetName}" — skipping`)
    return []
  }
  console.log(`  ${sheetName}: header at row ${headerIdx}, data from row ${headerIdx + 1}`)

  const dataRows = rows.slice(headerIdx + 1)

  return dataRows
    .filter(row => {
      const id = row[COL.id]
      // Must have a SKU (alphanumeric like "G-4662-1" / "A-4991-1"). Filter out blank/summary rows.
      return id && typeof id === 'string' && /^[A-Z]-\d+/i.test(id.trim())
    })
    .map(row => ({
      id: String(row[COL.id]).trim(),
      cloud,
      provider: String(row[COL.provider] || '').trim(),
      manufacturer: String(row[COL.manufacturer] || '').trim(),
      name: String(row[COL.name] || '').trim(),
      description: String(row[COL.description] || '').trim(),
      type: parseType(row[COL.type]),
      discount: row[COL.discount] === '' ? '' : row[COL.discount],
      priceLink: String(row[COL.priceLink] || '').trim(),
      contact: String(row[COL.contact] || '').trim().replace(/\n/g, ' | '),
      approvalDate: parseDate(row[COL.approvalDate]),
      notes: String(row[COL.notes] || '').trim(),
      psServices: parsePsServices(row[COL.psServices]),
    }))
}

const gcpServices = parseSheet('GCP', 'GCP')
const awsServices = parseSheet('AWS', 'AWS')
const allServices = [...gcpServices, ...awsServices]

console.log(`\nGCP: ${gcpServices.length} services`)
console.log(`AWS: ${awsServices.length} services`)
console.log(`Total: ${allServices.length} services`)
console.log('\nSample GCP[0]:', JSON.stringify(gcpServices[0], null, 2))
console.log('\nSample AWS[0]:', JSON.stringify(awsServices[0], null, 2))

const outPath = path.join(__dirname, '..', 'src', 'data', 'roved5Services.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(allServices, null, 2), 'utf8')
console.log(`\nWrote ${allServices.length} services to ${outPath}`)
