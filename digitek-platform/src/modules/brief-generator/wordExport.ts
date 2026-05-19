import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import type { WizardState } from "./types"
import { DEFAULT_BOILERPLATE } from "./wordExportBoilerplate"

const LOCATION_LABELS: Record<string, string> = {
  vendor: "אצל הספק",
  client: "אצל המזמין",
  hybrid: "משולב (ספק + מזמין)",
}

function buildArchitectureText(arch: WizardState["existingArchitecture"]): string {
  const lines = [
    arch.cloudProvider && `ספק ענן: ${arch.cloudProvider}`,
    arch.techStack && `טכנולוגיות: ${arch.techStack}`,
    arch.databases && `בסיסי נתונים: ${arch.databases}`,
    arch.externalInterfaces && `ממשקים חיצוניים: ${arch.externalInterfaces}`,
    arch.notes && `הערות: ${arch.notes}`,
  ].filter(Boolean)
  return lines.join("\n")
}

function buildTimelineText(tl: WizardState["timeline"]): string {
  const lines: string[] = []
  if (tl.estimatedStartDate) lines.push(`תאריך התחלה משוער: ${tl.estimatedStartDate}`)
  if (tl.totalDurationMonths) lines.push(`משך כולל: ${tl.totalDurationMonths} חודשים`)
  if (tl.warrantyMonths) lines.push(`תקופת אחריות: ${tl.warrantyMonths} חודשים`)
  if (tl.maintenanceMonths) lines.push(`תקופת תחזוקה: ${tl.maintenanceMonths} חודשים`)

  const phases = tl.phases.filter(p => p.name)
  if (phases.length > 0) {
    lines.push("")
    lines.push("שלבי הפרויקט:")
    for (const p of phases) {
      const parts = [`• ${p.name}`]
      if (p.startWeek) parts.push(`שבוע ${p.startWeek}`)
      if (p.durationWeeks) parts.push(`${p.durationWeeks} שבועות`)
      if (p.keyDeliverable) parts.push(`תוצר: ${p.keyDeliverable}`)
      lines.push(parts.join(" — "))
    }
  }
  return lines.join("\n")
}

function buildManagementText(mgmt: WizardState["management"]): string {
  const lines: string[] = []
  if (mgmt.clientContactName) lines.push(`איש קשר: ${mgmt.clientContactName}`)
  if (mgmt.clientContactRole) lines.push(`תפקיד: ${mgmt.clientContactRole}`)
  lines.push(`מקום מתן שירות: ${LOCATION_LABELS[mgmt.serviceLocation] ?? mgmt.serviceLocation}`)
  if (mgmt.securityClassification) lines.push(`סיווג ביטחוני: ${mgmt.securityClassification}`)
  lines.push(`פגישות שבועיות: ${mgmt.weeklyMeetings ? "כן" : "לא"}`)
  lines.push(`ועדת היגוי: ${mgmt.steeringCommittee ? "כן" : "לא"}`)

  const tests = []
  if (mgmt.testingRequirements.unitTests) tests.push("בדיקות יחידה")
  if (mgmt.testingRequirements.acceptanceTests) tests.push("בדיקות קבלה")
  if (mgmt.testingRequirements.performanceTests) tests.push("בדיקות ביצועים")
  if (mgmt.testingRequirements.penetrationTests) tests.push("בדיקות חדירה")
  if (tests.length > 0) lines.push(`דרישות בדיקות: ${tests.join(", ")}`)

  if (mgmt.maintenancePeriodMonths) lines.push(`תקופת תחזוקה: ${mgmt.maintenancePeriodMonths} חודשים`)

  const slaRows = mgmt.sla.filter(s => s.responseHours > 0)
  if (slaRows.length > 0) {
    lines.push("")
    lines.push("רמות שירות (SLA):")
    for (const s of slaRows) {
      lines.push(`• ${s.description} — זמן תגובה: ${s.responseHours} שעות, קנס: ${s.penaltyNIS} ₪`)
    }
  }
  return lines.join("\n")
}

function buildCloudText(services: WizardState["cloudServices"]): string {
  const filled = services.filter(s => s.serviceName)
  if (filled.length === 0) return ""

  const unitLabels: Record<string, string> = {
    per_month: "לחודש",
    per_hour: "לשעה",
    per_gb: "ל-GB",
    per_user: "למשתמש",
  }

  const lines = ["שירותי ענן:"]
  let total = 0
  for (const s of filled) {
    const cost = s.monthlyCost * s.quantity * s.months * (1 - s.discountPct / 100)
    total += cost
    lines.push(`• ${s.serviceName} (${s.provider}) — ${s.quantity} ${unitLabels[s.unitType] ?? s.unitType}, ${s.months} חודשים, עלות: ${Math.round(cost).toLocaleString()} ₪`)
  }
  lines.push(`סה"כ עלות ענן: ${Math.round(total).toLocaleString()} ₪`)
  return lines.join("\n")
}

function buildGoalsText(goals: WizardState["goals"]): string {
  const lines: string[] = []
  if (goals.kpis) lines.push(`מדדי ביצוע (KPIs): ${goals.kpis}`)
  if (goals.successCriteria) lines.push(`קריטריוני הצלחה: ${goals.successCriteria}`)

  const w = goals.evaluationWeights
  if (w.vendorQuality || w.proposalQuality || w.price) {
    lines.push(`משקולות הערכה: איכות ספק ${w.vendorQuality}%, איכות הצעה ${w.proposalQuality}%, מחיר ${w.price}%`)
  }
  return lines.join("\n")
}

function buildTemplateData(state: WizardState): Record<string, unknown> {
  const { identification: id, currentSituation: sit, projectDescription: desc, goals } = state

  const deliverables = (() => {
    const selected = state.templateDeliverables.filter(d => d.selected)
    if (selected.length > 0)
      return selected.map(d => ({ name: d.name, description: d.description }))
    const old = state.deliverables.filter(d => d.selected)
    if (old.length > 0)
      return old.map(d => ({ name: d.name, description: d.notes || `כמות: ${d.quantity}` }))
    return [{ name: "", description: "" }]
  })()

  const shushRows = (() => {
    const filled = state.templateShush.filter(s => s.quantity > 0)
    if (filled.length > 0)
      return filled.map(s => ({
        contentArea: s.contentArea,
        complexity: s.complexity,
        quantitativeMetrics: s.quantitativeMetrics,
        workDescription: s.workDescription,
      }))
    const sizeLabel = (sz: string) =>
      sz === "small" ? "קטן" : sz === "medium" ? "בינוני" : sz === "large" ? "גדול" : sz
    const old = state.workPackages.filter(wp => wp.quantity > 0)
    if (old.length > 0)
      return old.map(wp => ({
        contentArea: wp.name,
        complexity: sizeLabel(wp.size),
        quantitativeMetrics: wp.description,
        workDescription: `כמות: ${wp.quantity}`,
      }))
    return [{ contentArea: "", complexity: "", quantitativeMetrics: "", workDescription: "" }]
  })()

  const bp = state.boilerplateSections
  const bpData: Record<string, string> = {}
  for (const key of Object.keys(DEFAULT_BOILERPLATE) as (keyof typeof DEFAULT_BOILERPLATE)[]) {
    bpData[`bp_${key}`] = bp[key]?.trim() || DEFAULT_BOILERPLATE[key]
  }

  return {
    specName: id.selectedSpecialization?.name ?? "AI/ML",
    projectName: id.projectName || "XXX",
    ministry: id.ministry || "",
    tenderNumber: id.tenderNumber || "",
    writtenDate: id.writtenDate || "",
    budgetAmount: goals.budgetEstimateNIS > 0
      ? goals.budgetEstimateNIS.toLocaleString() + " ₪"
      : "XXX ₪",
    paymentMilestones: goals.paymentMilestones || "תשלום עבור כל תוצר עם סיומו ואישורו על ידי המשרד.",
    section11Content: sit.businessProblem || desc.general || "",
    section12Content: [
      sit.existingSystems && `מערכות קיימות: ${sit.existingSystems}`,
      sit.infrastructure && `תשתיות: ${sit.infrastructure}`,
      sit.dataVolumes && `נפחי מידע: ${sit.dataVolumes}`,
      sit.mainGaps && `פערים עיקריים: ${sit.mainGaps}`,
    ].filter(Boolean).join("\n"),
    section13Content: [desc.general, desc.requestedDeliverables, desc.technicalCharacteristics]
      .filter(Boolean).join("\n"),

    architectureSection: buildArchitectureText(state.existingArchitecture),
    timelineSection: buildTimelineText(state.timeline),
    managementSection: buildManagementText(state.management),
    cloudServicesSection: buildCloudText(state.cloudServices),
    goalsSection: buildGoalsText(goals),

    expectedBenefits: desc.expectedBenefits || "",
    targetAudience: desc.targetAudience || "",
    usersCount: desc.usersCount || "",

    deliverables,
    shushRows,
    ...bpData,
  }
}

export async function generateBriefBlob(state: WizardState): Promise<Blob> {
  const res = await fetch("/brief-template.docx")
  if (!res.ok) throw new Error(`Failed to load template: ${res.status}`)
  const buf = await res.arrayBuffer()

  const doc = new Docxtemplater(new PizZip(buf), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() { return "" },
  })

  doc.render(buildTemplateData(state))

  return doc.getZip().generate({
    type: "blob",
    compression: "DEFLATE",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
}

export async function exportBriefToWord(state: WizardState): Promise<void> {
  const blob = await generateBriefBlob(state)

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = (state.identification.projectName || "בריף") + ".docx"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
