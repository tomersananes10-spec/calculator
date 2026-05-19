import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import type { WizardState } from "./types"
import { DEFAULT_BOILERPLATE } from "./wordExportBoilerplate"

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
    deliverables,
    shushRows,
    ...bpData,
  }
}

export async function exportBriefToWord(state: WizardState): Promise<void> {
  const res = await fetch("/brief-template.docx")
  if (!res.ok) throw new Error(`Failed to load template: ${res.status}`)
  const buf = await res.arrayBuffer()

  const doc = new Docxtemplater(new PizZip(buf), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() { return "" },
  })

  doc.render(buildTemplateData(state))

  const blob = doc.getZip().generate({
    type: "blob",
    compression: "DEFLATE",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = (state.identification.projectName || "בריף") + ".docx"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
