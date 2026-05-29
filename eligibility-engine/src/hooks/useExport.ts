import type { CheckResult, HumanDecision } from '../modules/engine/types'

export function exportJson(params: {
  candidateName: string
  candidateCompany: string
  roleName: string
  checkResult: CheckResult
  decisions: Record<string, HumanDecision>
  decisionNotes: string
}) {
  const payload = {
    candidateName: params.candidateName,
    candidateCompany: params.candidateCompany,
    role: params.roleName,
    checkResult: params.checkResult,
    humanDecisions: params.decisions,
    decisionNotes: params.decisionNotes,
    generatedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `eligibility_${params.candidateName || 'report'}_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportPdf(params: {
  candidateName: string
  roleName: string
  overallStatus: string
  overallScore: number
  estimatedYears: number
  results: any[]
  decisionNotes?: string
}) {
  const html2pdf = (await import('html2pdf.js')).default

  const statusText = params.overallStatus === 'pass' ? 'עומד/ת בתנאי הסף'
    : params.overallStatus === 'requires_review' ? 'נדרשת בדיקה אנושית'
    : 'לא עומד/ת בתנאי הסף'

  const statusColor = params.overallStatus === 'pass' ? '#22c55e'
    : params.overallStatus === 'requires_review' ? '#f59e0b' : '#ef4444'

  const reqRows = params.results.map((r: any) => {
    const reqStatus = r.status === 'pass' ? 'עומד' : r.status === 'requires_review' ? 'לבדיקה' : 'לא עומד'
    return `<tr>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${r.requirement.label}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${r.score}%</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${reqStatus}</td>
      <td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; font-size:11px; color:#6b7280;">${r.summary}</td>
    </tr>`
  }).join('')

  const html = `
    <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 700px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 11px; color: #6366f1; font-weight: 600; letter-spacing: 1px;">✦ ELIGIBILITY ENGINE</div>
        <h1 style="font-size: 22px; margin: 8px 0 4px;">דוח בדיקת תנאי סף</h1>
        <div style="font-size: 13px; color: #64748b;">${new Date().toLocaleDateString('he-IL')}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 6px 0; font-weight: 600; width: 120px;">שם מועמד/ת:</td><td>${params.candidateName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">תפקיד:</td><td>${params.roleName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">שנות ניסיון:</td><td>${params.estimatedYears}</td></tr>
      </table>

      <div style="background: ${statusColor}15; border: 1px solid ${statusColor}40; border-radius: 8px; padding: 12px 16px; text-align: center; margin-bottom: 20px;">
        <span style="color: ${statusColor}; font-weight: 700; font-size: 16px;">${statusText}</span>
        <span style="color: ${statusColor}; margin-right: 12px;">ציון: ${params.overallScore}%</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b;">תנאי סף</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b;">ציון</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b;">סטטוס</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b;">אינדיקציות</th>
          </tr>
        </thead>
        <tbody>${reqRows}</tbody>
      </table>

      ${params.decisionNotes ? `
        <div style="margin-top: 20px;">
          <div style="font-weight: 600; margin-bottom: 6px;">הערות רכזת:</div>
          <div style="background: #f8fafc; border-radius: 8px; padding: 12px; font-size: 13px; color: #475569;">${params.decisionNotes}</div>
        </div>
      ` : ''}

      <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 12px;">
        נוצר באמצעות AI Eligibility Engine · ${new Date().toISOString()}
      </div>
    </div>
  `

  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  await html2pdf().set({
    margin: 10,
    filename: `eligibility_${params.candidateName}_${new Date().toISOString().slice(0, 10)}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(container).save()

  document.body.removeChild(container)
}
