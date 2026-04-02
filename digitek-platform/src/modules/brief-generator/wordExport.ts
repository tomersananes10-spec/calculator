import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType,
} from "docx"
import type { WizardState } from "./types"

const RTL = true
const FONT = "Arial"

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
  })
}


function body(text: string): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, font: FONT, size: 24 })],
  })
}

function emptyLine(): Paragraph {
  return new Paragraph({ text: "" })
}

function sectionHeader(num: string, title: string): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    children: [
      new TextRun({ text: `${num} ${title}`, bold: true, font: FONT, size: 26 }),
    ],
    spacing: { before: 200, after: 100 },
  })
}

function labeledField(label: string, value: string): Paragraph[] {
  if (!value?.trim()) return []
  return [
    new Paragraph({
      bidirectional: RTL,
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: `${label}: `, bold: true, font: FONT, size: 24 }),
        new TextRun({ text: value, font: FONT, size: 24 }),
      ],
    }),
  ]
}

function makeTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h =>
          new TableCell({
            children: [new Paragraph({
              bidirectional: RTL,
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: h, bold: true, font: FONT, size: 22 })],
            })],
            shading: { fill: "E8F4F8" },
          })
        ),
      }),
      ...rows.map(row =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              children: [new Paragraph({
                bidirectional: RTL,
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: cell ?? "", font: FONT, size: 22 })],
              })],
            })
          ),
        })
      ),
    ],
  })
}

export async function exportBriefToWord(state: WizardState): Promise<void> {
  const { identification, currentSituation, existingArchitecture,
          projectDescription, deliverables, workPackages,
          timeline, management, goals } = state

  const specName = identification.selectedSpecialization?.name ?? ""
  const clusterName = identification.selectedCluster?.name ?? ""
  const projectName = identification.projectName || "[שם הפרויקט]"
  const ministry = identification.ministry || "[שם המשרד]"

  const titleSection = [
    new Paragraph({
      bidirectional: RTL, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "בריף לתיחור ספקים", bold: true, font: FONT, size: 36 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      bidirectional: RTL, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: clusterName + " — " + specName, bold: true, font: FONT, size: 28 })],
      spacing: { after: 400 },
    }),
    ...labeledField("שם הפרויקט", projectName),
    ...labeledField("גוף מזמין", ministry),
    ...labeledField("מספר תיחור", identification.tenderNumber),
    ...labeledField("תאריך כתיבה", identification.writtenDate),
    ...labeledField("גודל פרויקט", identification.projectSize === "large" ? "גדול (מעל 200,000 שח)" : "קטן (עד 200,000 שח)"),
    emptyLine(),
  ]

  const part1 = [
    h1("חלק א: תיאור הפרויקט והשירותים המבוקשים"),
    emptyLine(),
    sectionHeader("1.1", "תיאור כללי של הצורך העסקי"),
    body(currentSituation.businessProblem || "[יש למלא תיאור כללי]"),
    emptyLine(),
    sectionHeader("1.2", "המצב הקיים / הבעיה"),
    body(currentSituation.existingSystems || ""),
    ...(currentSituation.infrastructure ? [body("תשתית: " + currentSituation.infrastructure)] : []),
    ...(currentSituation.dataVolumes ? [body("נפחי מידע: " + currentSituation.dataVolumes)] : []),
    ...(currentSituation.mainGaps ? [body("פערים עיקריים: " + currentSituation.mainGaps)] : []),
    emptyLine(),
  ]

  const hasArch = existingArchitecture.cloudProvider || existingArchitecture.techStack
  const archSection = hasArch ? [
    sectionHeader("1.3", "ארכיטקטורה ומבנה לוגי של הקיים"),
    ...(existingArchitecture.cloudProvider ? [body("ספק ענן: " + existingArchitecture.cloudProvider)] : []),
    ...(existingArchitecture.techStack ? [body("Tech Stack: " + existingArchitecture.techStack)] : []),
    ...(existingArchitecture.databases ? [body("בסיסי נתונים: " + existingArchitecture.databases)] : []),
    ...(existingArchitecture.externalInterfaces ? [body("ממשקים חיצוניים: " + existingArchitecture.externalInterfaces)] : []),
    ...(existingArchitecture.notes ? [body(existingArchitecture.notes)] : []),
    emptyLine(),
  ] : []

  const descSection = [
    sectionHeader("1.4", "תיאור התוצרים והשירותים המבוקשים"),
    body(projectDescription.general || ""),
    ...(projectDescription.requestedDeliverables ? [body(projectDescription.requestedDeliverables)] : []),
    emptyLine(),
    ...(projectDescription.technicalCharacteristics ? [
      sectionHeader("1.5", "מאפיינים טכנולוגיים"),
      body(projectDescription.technicalCharacteristics), emptyLine(),
    ] : []),
    ...(projectDescription.expectedBenefits ? [
      sectionHeader("1.6", "תועלות הצפויות"),
      body(projectDescription.expectedBenefits), emptyLine(),
    ] : []),
    ...(projectDescription.targetAudience ? [
      sectionHeader("1.7", "קהל יעד"),
      body(projectDescription.targetAudience + (projectDescription.usersCount ? " | " + projectDescription.usersCount + " משתמשים" : "")),
      emptyLine(),
    ] : []),
  ]

  const selectedDeliverables = deliverables.filter(d => d.selected)
  const delivTableSection = selectedDeliverables.length > 0 ? [
    sectionHeader("1.8", "רשימת תוצרים נדרשים"),
    makeTable(
      ["תוצר", "כמות", "הערות"],
      selectedDeliverables.map(d => [d.name, String(d.quantity), d.notes])
    ),
    emptyLine(),
  ] : []

  const part2 = [h1("חלק ב: אופן מימוש הפרויקט"), emptyLine()]

  function sizeLabel(sz: string): string {
    return sz === "small" ? "קטן" : sz === "medium" ? "בינוני" : sz === "large" ? "גדול" : "קבוע"
  }

  const filledWP = workPackages.filter(w => w.quantity > 0)
  const wpSection = [
    sectionHeader("2.1", "חבילות עבודה נדרשות"),
    filledWP.length > 0
      ? makeTable(
          ["שם השו\"ש", "גודל", "תיאור / קריטריונים", "כמות"],
          filledWP.map(w => [w.name, sizeLabel(w.size), w.description, String(w.quantity)])
        )
      : body("[יש להגדיר שו\"שים]"),
    emptyLine(),
  ]

  const serviceLocationLabel = (loc: string) =>
    loc === "vendor" ? "אצל הספק" : loc === "client" ? "אצל הלקוח" : "היברידי"

  const mgmtSection = [
    sectionHeader("2.2", "ניהול הפרויקט"),
    ...labeledField("איש קשר מטעם המשרד",
      management.clientContactName + (management.clientContactRole ? " — " + management.clientContactRole : "")),
    ...labeledField("מקום מתן השירות", serviceLocationLabel(management.serviceLocation)),
    ...labeledField("סיווג ביטחוני", management.securityClassification),
  ]

  const meetings: string[] = []
  if (management.weeklyMeetings) meetings.push("פגישות שבועיות")
  if (management.steeringCommittee) meetings.push("ועדת היגוי")
  if (meetings.length > 0) {
    mgmtSection.push(body("פגישות: " + meetings.join(", ")))
  }
  mgmtSection.push(emptyLine())

  const tests: string[] = []
  const tr = management.testingRequirements
  if (tr.unitTests) tests.push("בדיקות יחידה")
  if (tr.acceptanceTests) tests.push("בדיקות קבלה")
  if (tr.performanceTests) tests.push("בדיקות ביצועים")
  if (tr.penetrationTests) tests.push("בדיקות חדירה")
  const testingSection = [
    sectionHeader("2.3", "דרישות בדיקות"),
    body(tests.length > 0 ? tests.join(" | ") : "לא הוגדרו דרישות בדיקות"),
    emptyLine(),
  ]

  const slaTypeLabel = (t: string) =>
    t === "critical" ? "קריטית" : t === "severe" ? "חמורה" : "רגילה"

  const slaSection = [
    sectionHeader("2.4", "הסכם רמת שירות (SLA)"),
    management.sla.length > 0
      ? makeTable(
          ["רמת חומרה", "תיאור", "זמן תגובה (שעות)", "קנס (₪)"],
          management.sla.map(s => [
            slaTypeLabel(s.type),
            s.description,
            String(s.responseHours),
            String(s.penaltyNIS),
          ])
        )
      : body("[לא הוגדרו SLA]"),
    emptyLine(),
  ]

  const timelineSection = [
    sectionHeader("2.5", "לוח זמנים"),
    ...labeledField("תאריך התחלה משוער", timeline.estimatedStartDate || "טרם נקבע"),
    ...labeledField("משך כולל", timeline.totalDurationMonths + " חודשים"),
    ...labeledField("אחריות", timeline.warrantyMonths + " חודשים"),
    ...labeledField("תחזוקה", timeline.maintenanceMonths + " חודשים"),
    emptyLine(),
    timeline.phases.length > 0
      ? makeTable(
          ["שלב", "שבוע התחלה", "משך (שבועות)", "תוצר מפתח", "קריטריון סיום"],
          timeline.phases.map(p => [
            p.name,
            String(p.startWeek),
            String(p.durationWeeks),
            p.keyDeliverable,
            p.completionCriteria,
          ])
        )
      : body("[לא הוגדרו שלבים]"),
    emptyLine(),
  ]

  const part3 = [h1("חלק ג: מדדים ויעדים"), emptyLine()]

  const goalsSection = [
    sectionHeader("3.1", "מדדי הצלחה (KPIs)"),
    body(goals.kpis || "[יש להגדיר KPIs]"),
    emptyLine(),
    sectionHeader("3.2", "קריטריוני הצלחה"),
    body(goals.successCriteria || "[יש להגדיר קריטריונים]"),
    emptyLine(),
    sectionHeader("3.3", "הערכת הצעות"),
    makeTable(
      ["קריטריון", "משקל (%)"],
      [
        ["איכות ספק", String(goals.evaluationWeights.vendorQuality)],
        ["איכות הצעה טכנית", String(goals.evaluationWeights.proposalQuality)],
        ["מחיר", String(goals.evaluationWeights.price)],
      ]
    ),
    emptyLine(),
    sectionHeader("3.4", "תקציב ואבני דרך לתשלום"),
    ...labeledField("אומדן תקציב", goals.budgetEstimateNIS > 0 ? goals.budgetEstimateNIS.toLocaleString() + " ₪" : "טרם נקבע"),
    body(goals.paymentMilestones || ""),
    emptyLine(),
  ]

  const allSections = [
    ...titleSection,
    ...part1,
    ...archSection,
    ...descSection,
    ...delivTableSection,
    ...part2,
    ...wpSection,
    ...mgmtSection,
    ...testingSection,
    ...slaSection,
    ...timelineSection,
    ...part3,
    ...goalsSection,
  ]

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "David", size: 24 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: allSections,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = (identification.projectName || "brief") + ".docx"
  a.click()
  URL.revokeObjectURL(url)
}
