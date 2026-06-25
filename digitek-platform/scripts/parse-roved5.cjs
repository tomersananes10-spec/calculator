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

function parseSheet(sheetName, cloud) {
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  // Row 0 is the column header row (skip it), data starts at row 1
  const dataRows = rows.slice(1)

  // The description column key differs between sheets
  const descKey = Object.keys(rows[0]).find(k =>
    typeof rows[0][k] === 'string' && rows[0][k].includes('תיאור')
  ) || Object.keys(rows[0])[5]

  return dataRows
    .filter(row => row['__EMPTY'] && typeof row['__EMPTY'] === 'string' && row['__EMPTY'].trim())
    .map(row => {
      // Parse approval date (format: 8.2023 → "08/2023")
      let approvalDate = ''
      const rawDate = row['__EMPTY_8']
      if (typeof rawDate === 'number') {
        const str = rawDate.toString()
        const parts = str.split('.')
        if (parts.length === 2) {
          approvalDate = `${parts[0].padStart(2, '0')}/${parts[1]}`
        }
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        approvalDate = rawDate.trim()
      }

      // PS services
      const psRaw = row['__EMPTY_10']
      let psServices = 'לא כלול'
      if (psRaw === true || (typeof psRaw === 'string' && psRaw.toLowerCase().includes('כן'))) {
        psServices = 'כלול'
      } else if (typeof psRaw === 'string' && psRaw.trim() && psRaw.trim() !== '') {
        psServices = psRaw.trim()
      }

      const typeRaw = String(row['__EMPTY_4']).trim().toLowerCase()
      const type = (!typeRaw.includes('non') && typeRaw.includes('saas')) ? 'SaaS' : 'non-SaaS'

      return {
        id: String(row['__EMPTY']).trim(),
        cloud,
        provider: String(row['__EMPTY_1']).trim(),
        manufacturer: String(row['__EMPTY_2']).trim(),
        name: String(row['__EMPTY_3']).trim(),
        description: String(row[descKey] || '').trim(),
        type,
        discount: row['__EMPTY_5'],
        priceLink: String(row['__EMPTY_6']).trim(),
        contact: String(row['__EMPTY_7']).trim().replace(/\n/g, ' | '),
        approvalDate,
        notes: String(row['__EMPTY_9']).trim(),
        psServices,
      }
    })
}

const gcpServices = parseSheet('GCP', 'GCP')
const awsServices = parseSheet('AWS', 'AWS')
const allServices = [...gcpServices, ...awsServices]

console.log(`GCP: ${gcpServices.length} services`)
console.log(`AWS: ${awsServices.length} services`)
console.log(`Total: ${allServices.length} services`)
console.log('\nSample GCP:', JSON.stringify(gcpServices[0], null, 2))
console.log('\nSample AWS:', JSON.stringify(awsServices[0], null, 2))

const outPath = path.join(__dirname, '..', 'src', 'data', 'roved5Services.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(allServices, null, 2), 'utf8')
console.log(`\nWrote ${allServices.length} services to ${outPath}`)
