/**
 * Adds new template tags to the already-tagged brief-template.docx.
 * Inserts paragraphs for: ministry, tenderNumber, writtenDate,
 * architectureSection, timelineSection, managementSection,
 * cloudServicesSection, goalsSection, expectedBenefits, targetAudience, usersCount
 *
 * Run: node scripts/add-new-template-tags.cjs
 */

const PizZip = require("pizzip")
const fs = require("fs")
const path = require("path")

const SRC = path.join(__dirname, "..", "public", "brief-template.docx")

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

function makeParagraph(text, bold) {
  const rPr = bold ? "<w:rPr><w:b/><w:bCs/></w:rPr>" : ""
  return `<w:p><w:pPr><w:bidi/></w:pPr><w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
}

// ─── Main ───────────────────────────────────────────────────

const buf = fs.readFileSync(SRC)
const zip = new PizZip(buf)
let xml = zip.file("word/document.xml").asText()
let changes = 0

// === 1. Cover page: ministry, tenderNumber, writtenDate after {projectName} ===
let paras = getParagraphs(xml)
const projectNamePara = paras.find(p => p.text.includes("{projectName}"))
if (projectNamePara) {
  const insertAfter = projectNamePara.xml
  const newParas = [
    makeParagraph("{ministry}"),
    makeParagraph("{tenderNumber}"),
    makeParagraph("{writtenDate}"),
  ].join("")
  xml = xml.replace(insertAfter, insertAfter + newParas)
  changes++
  console.log("1. Cover page tags inserted (ministry, tenderNumber, writtenDate)")
} else {
  console.warn("WARN: projectName paragraph not found")
}

// === 2. After section13Content: expectedBenefits, targetAudience, usersCount, architectureSection ===
paras = getParagraphs(xml)
const s13Para = paras.find(p => p.text.includes("{section13Content}"))
if (s13Para) {
  const insertAfter = s13Para.xml
  const newParas = [
    makeParagraph("{expectedBenefits}"),
    makeParagraph("{targetAudience}"),
    makeParagraph("{usersCount}"),
    makeParagraph("{architectureSection}"),
  ].join("")
  xml = xml.replace(insertAfter, insertAfter + newParas)
  changes++
  console.log("2. Project description tags inserted (expectedBenefits, targetAudience, usersCount, architectureSection)")
} else {
  console.warn("WARN: section13Content paragraph not found")
}

// === 3. timelineSection — before section 2.3 timeline header ===
paras = getParagraphs(xml)
const timelineHeader = paras.find(p => p.text.includes("תכנית עבודה ולוחות זמנים"))
if (timelineHeader) {
  const insertBefore = timelineHeader.xml
  const newPara = makeParagraph("{timelineSection}")
  xml = xml.replace(insertBefore, newPara + insertBefore)
  changes++
  console.log("3. timelineSection tag inserted before section 2.3")
} else {
  console.warn("WARN: timeline header not found")
}

// === 4. managementSection — before section 2.4 management header ===
paras = getParagraphs(xml)
const mgmtHeader = paras.find(p => p.text.includes("גורמים מעורבים"))
if (mgmtHeader) {
  const insertBefore = mgmtHeader.xml
  const newPara = makeParagraph("{managementSection}")
  xml = xml.replace(insertBefore, newPara + insertBefore)
  changes++
  console.log("4. managementSection tag inserted before section 2.4")
} else {
  console.warn("WARN: management header not found")
}

// === 5. cloudServicesSection — before section 2.5 scope header ===
paras = getParagraphs(xml)
const scopeHeader = paras.find(p => p.text.includes("היקף הפרויקט והתוצרים"))
if (scopeHeader) {
  const insertBefore = scopeHeader.xml
  const newPara = makeParagraph("{cloudServicesSection}")
  xml = xml.replace(insertBefore, newPara + insertBefore)
  changes++
  console.log("5. cloudServicesSection tag inserted before section 2.5")
} else {
  console.warn("WARN: scope header not found")
}

// === 6. goalsSection — before section 2.3.1 success metrics ===
paras = getParagraphs(xml)
const goalsHeader = paras.find(p => p.text.includes("מדדי הצלחה"))
if (goalsHeader) {
  const insertBefore = goalsHeader.xml
  const newPara = makeParagraph("{goalsSection}")
  xml = xml.replace(insertBefore, newPara + insertBefore)
  changes++
  console.log("6. goalsSection tag inserted before section 2.3.1")
} else {
  console.warn("WARN: success metrics header not found")
}

// ─── Save ───────────────────────────────────────────────────
zip.file("word/document.xml", xml)
const output = zip.generate({ type: "nodebuffer", compression: "DEFLATE" })
fs.writeFileSync(SRC, output)

console.log(`\nDone! ${changes} sections updated.`)
console.log("Updated template saved to:", SRC)
