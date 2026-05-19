/**
 * One-time script: prepares the government Word template for docxtemplater.
 * Inserts {tags} into the template XML at string level (no DOM parsing).
 *
 * Run: node scripts/prepare-brief-template.js
 */

const PizZip = require("pizzip")
const fs = require("fs")
const path = require("path")

const SRC = path.join(__dirname, "..", "public", "brief-template.docx")
const BACKUP = path.join(__dirname, "..", "public", "brief-template-original.docx")

// ─── Helpers ────────────────────────────────────────────────

function getParagraphs(xml) {
  const paras = []
  const re = /<w:p[\s>][\s\S]*?<\/w:p>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const texts = []
    const tRe = /<w:t[^>]*>([^<]*)<\/w:t>/g
    let t
    while ((t = tRe.exec(m[0])) !== null) texts.push(t[1])
    paras.push({ xml: m[0], text: texts.join(""), start: m.index, end: m.index + m[0].length })
  }
  return paras
}

function replaceFirstWtContent(paraXml, newText) {
  let done = false
  return paraXml.replace(/<w:t([^>]*)>[^<]*<\/w:t>/g, (match, attrs) => {
    if (!done) {
      done = true
      return `<w:t${attrs}>${newText}</w:t>`
    }
    return `<w:t${attrs}></w:t>`
  })
}

function findParaContaining(paras, needle) {
  return paras.find(p => p.text.includes(needle))
}

// ─── Main ───────────────────────────────────────────────────

const buf = fs.readFileSync(SRC)
fs.copyFileSync(SRC, BACKUP)
console.log("Backed up original to:", BACKUP)

const zip = new PizZip(buf)
let xml = zip.file("word/document.xml").asText()
let paras = getParagraphs(xml)

let changes = 0

// === 1. Spec name: replace ML/AI in the title ===
// Title paragraph P4: "תיאור הפרויקט (בריף התמחות ML/AI)"
// ML, /, AI are in separate <w:t> elements. Replace the <w:t> containing "ML" with {specName},
// and empty the ones containing "/" and "AI" that follow it within the same paragraph.
const titlePara = findParaContaining(paras, "בריף התמחות")
if (titlePara) {
  let newP = titlePara.xml
  let mlFound = false
  let cleared = 0
  newP = newP.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (match, attrs, text) => {
    if (!mlFound && text.trim() === "ML") {
      mlFound = true
      return `<w:t${attrs}>{specName}</w:t>`
    }
    if (mlFound && cleared < 2 && (text.trim() === "/" || text.trim() === "AI")) {
      cleared++
      return `<w:t${attrs}></w:t>`
    }
    return match
  })
  xml = xml.replace(titlePara.xml, newP)
  paras = getParagraphs(xml)
  changes++
  console.log("1. Spec name tag inserted in title")
} else {
  console.warn("WARN: title paragraph not found")
}

// === 2. Project name: XXX → {projectName} ===
// P5: "שם הפרויקט: XXX" — XXX is in a single <w:t>
const namePara = findParaContaining(paras, "שם הפרויקט")
if (namePara) {
  const newP = namePara.xml.replace(/<w:t([^>]*)>XXX<\/w:t>/, `<w:t$1>{projectName}</w:t>`)
  xml = xml.replace(namePara.xml, newP)
  paras = getParagraphs(xml)
  changes++
  console.log("2. Project name tag inserted")
}

// === 3. Budget: XXX ₪ → {budgetAmount} ===
// P465: "הערכת עלות לפרויקט:  כ-  XXX ₪, לא כולל מע"מ."
const budgetPara = findParaContaining(paras, "הערכת עלות לפרויקט")
if (budgetPara) {
  const newP = budgetPara.xml.replace(/<w:t([^>]*)>XXX<\/w:t>/, `<w:t$1>{budgetAmount}</w:t>`)
  xml = xml.replace(budgetPara.xml, newP)
  paras = getParagraphs(xml)
  changes++
  console.log("3. Budget tag inserted")
}

// === 4. Payment milestones ===
// P471: "תשלום עבור כל תוצר עם סיומו ואישורו על ידי המשרד"
const payPara = findParaContaining(paras, "תשלום עבור כל תוצר")
if (payPara) {
  const newP = replaceFirstWtContent(payPara.xml, "{paymentMilestones}")
  xml = xml.replace(payPara.xml, newP)
  paras = getParagraphs(xml)
  changes++
  console.log("4. Payment milestones tag inserted")
}

// === 5. Section 1.1 instruction ===
// P10: "תיאור כללי של הפרויקט (יוזן..."
const s11 = findParaContaining(paras, "יוזן")
if (s11) {
  const newP = replaceFirstWtContent(s11.xml, "{section11Content}")
  xml = xml.replace(s11.xml, newP)
  paras = getParagraphs(xml)
  changes++
  console.log("5. Section 1.1 tag inserted")
}

// === 6. Section 1.2 instruction ===
// P13: "הסבר בכמה משפטים על..."
const s12 = findParaContaining(paras, "הסבר בכמה משפטים")
if (s12) {
  const newP = replaceFirstWtContent(s12.xml, "{section12Content}")
  xml = xml.replace(s12.xml, newP)
  paras = getParagraphs(xml)
  changes++
  console.log("6. Section 1.2 tag inserted")
}

// === 7. Section 1.3 instruction — spans P16, P17, P18 ===
// P16: "פירוט כלל התוצרים..."
// P17: "מומלץ להוסיף חומר רקע..."
// P18: "הערה למשרד..."
const s13 = findParaContaining(paras, "פירוט כלל התוצרים")
if (s13) {
  const newP = replaceFirstWtContent(s13.xml, "{section13Content}")
  xml = xml.replace(s13.xml, newP)
  paras = getParagraphs(xml)

  // Remove continuation paragraphs P17, P18
  for (const marker of ["מומלץ להוסיף חומר רקע", "הערה למשרד"]) {
    const cont = findParaContaining(paras, marker)
    if (cont) {
      xml = xml.replace(cont.xml, "")
      paras = getParagraphs(xml)
    }
  }
  changes++
  console.log("7. Section 1.3 tag inserted + continuations removed")
}

// === 8. Deliverables table — loop tags ===
// Header row has "תפוקה" and "תיאור חבילת עבודה"
// First data row has "אפיון עסקי (BRD)" in cell 1
// Strategy: find all table rows. Replace the first data row cells with loop tags.
// Then remove all other data rows (they'll be generated by the loop).

// Find the row containing "אפיון עסקי"
const delivFirstRow = findParaContaining(paras, "אפיון עסקי")
if (delivFirstRow) {
  // Find the enclosing <w:tr>...</w:tr>
  const trStart = xml.lastIndexOf("<w:tr ", delivFirstRow.start)
  const trEnd = xml.indexOf("</w:tr>", delivFirstRow.start) + "</w:tr>".length
  const trXml = xml.substring(trStart, trEnd)

  // Find all <w:tc>...</w:tc> in this row
  const tcRegex = /<w:tc>[\s\S]*?<\/w:tc>/g
  const cells = []
  let tcMatch
  while ((tcMatch = tcRegex.exec(trXml)) !== null) {
    cells.push({ xml: tcMatch[0], start: tcMatch.index })
  }

  if (cells.length >= 2) {
    // Cell 1: replace text with {#deliverables}{name}
    let cell1 = replaceFirstWtContent(cells[0].xml, "{#deliverables}{name}")
    // Cell 2: replace text with {description}{/deliverables}
    let cell2 = replaceFirstWtContent(cells[1].xml, "{description}{/deliverables}")

    let newTr = trXml
    newTr = newTr.replace(cells[1].xml, cell2)
    newTr = newTr.replace(cells[0].xml, cell1)
    xml = xml.replace(trXml, newTr)
    paras = getParagraphs(xml)

    // Now remove all subsequent data rows in this table (until end of table)
    // Find the table end
    const tblEnd = xml.indexOf("</w:tbl>", trStart)

    // Find all <w:tr>...</w:tr> between our row end and table end
    const afterRow = xml.substring(trEnd, tblEnd)
    const dataRows = afterRow.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []

    // Keep the header row and our template row, remove all other data rows
    // But skip rows that might be part of a different section (check if they're in the same table)
    for (const row of dataRows) {
      // Check if this row contains deliverable-like content (not a section heading)
      const rowTexts = []
      const rt = /<w:t[^>]*>([^<]*)<\/w:t>/g
      let rm
      while ((rm = rt.exec(row)) !== null) rowTexts.push(rm[1])
      const rowText = rowTexts.join("")
      // If it has content that looks like a deliverable row, remove it
      if (rowText.trim() && !rowText.includes("תפוקה") && !rowText.includes("תיאור חבילת")) {
        xml = xml.replace(row, "")
      }
    }
    paras = getParagraphs(xml)
    changes++
    console.log("8. Deliverables table: loop tags inserted, extra rows removed")
  }
}

// === 9. Shush table — loop tags ===
// Header has: "עולם תוכן / משפחת שו"ש", "מורכבות", "מדדים כמותיים", "תיאור"
// First data row text starts with content like MLOps/GenAI description
const shushHeader = findParaContaining(paras, "עולם תוכן")
if (shushHeader) {
  // Find the enclosing table
  const tblStart = xml.lastIndexOf("<w:tbl>", shushHeader.start)
  const tblEnd = xml.indexOf("</w:tbl>", shushHeader.start) + "</w:tbl>".length
  const tblXml = xml.substring(tblStart, tblEnd)

  // Find all <w:tr> in the table
  const trRegex = /<w:tr[\s>][\s\S]*?<\/w:tr>/g
  const rows = []
  let trMatch
  while ((trMatch = trRegex.exec(tblXml)) !== null) {
    rows.push(trMatch[0])
  }

  if (rows.length >= 2) {
    // rows[0] is header, rows[1] is first data row
    const dataRow = rows[1]
    const tcRegex2 = /<w:tc>[\s\S]*?<\/w:tc>/g
    const cells = []
    let tc2
    while ((tc2 = tcRegex2.exec(dataRow)) !== null) {
      cells.push(tc2[0])
    }

    if (cells.length >= 4) {
      let newRow = dataRow
      const replacements = [
        [cells[0], "{#shushRows}{contentArea}"],
        [cells[1], "{complexity}"],
        [cells[2], "{quantitativeMetrics}"],
        [cells[3], "{workDescription}{/shushRows}"],
      ]
      for (const [cellXml, tag] of replacements) {
        newRow = newRow.replace(cellXml, replaceFirstWtContent(cellXml, tag))
      }
      xml = xml.replace(dataRow, newRow)

      // Remove extra data rows
      for (let i = 2; i < rows.length; i++) {
        xml = xml.replace(rows[i], "")
      }
      paras = getParagraphs(xml)
      changes++
      console.log("9. Shush table: loop tags inserted, extra rows removed")
    }
  }
}

// === 10. Boilerplate sections — single-paragraph tags ===
const boilerplateMap = [
  ["האפיון ייערך בהתאם", "bp_implementationApproach"],
  ["הפרויקט ידרוש אינטגרציה", "bp_developmentRequirements"],
  ["מערכות AI יפותחו", "bp_techArchitecture"],
  ["הגדרת דרישות הפרויקט", "bp_methodology"],
  ["יש להכיר ולפעול", "bp_nimbusBackground"],
  ["תוצרים מוגדרים היטב", "bp_projectScope"],
  ["ככל שהמשרד ידרוש", "bp_performanceTesting"],
  ["הספק יעמיד את כל רכיבי", "bp_securityTesting"],
  ["בדיקות הקבלה, הביצועים ואבטחת", "bp_environments"],
  ["כלל תוצרי הפיתוח לרבות", "bp_documentation"],
  ["כתנאי לאישור להתקנת", "bp_deliveryTesting"],
  ["מבלי לפגוע באחריות הספק", "bp_acceptanceTesting"],
  ["תקופת האחריות לכל תוצרי", "bp_warrantyMaintenance"],
]

for (const [marker, tag] of boilerplateMap) {
  const para = findParaContaining(paras, marker)
  if (para) {
    const newP = replaceFirstWtContent(para.xml, `{${tag}}`)
    xml = xml.replace(para.xml, newP)
    paras = getParagraphs(xml)
    changes++
    console.log(`10. Boilerplate: ${tag} tag inserted`)
  } else {
    console.warn(`WARN: boilerplate marker not found: "${marker}"`)
  }
}

// ─── Save ───────────────────────────────────────────────────

zip.file("word/document.xml", xml)
const output = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
fs.writeFileSync(SRC, output)

console.log(`\nDone! ${changes} changes made.`)
console.log("Tagged template saved to:", SRC)
console.log("Original backed up to:", BACKUP)
