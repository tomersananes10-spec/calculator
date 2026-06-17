// היסטוריית סבבים: בנייה ושימוש בשרשרת בקשות-אישור המקושרת ב-metadata.parent_request_id.
// כשבעל ההליך לוחץ "שלח שוב לאחר תיקון" — נוצרת בקשה חדשה עם parent_request_id מצביע לישנה.
// כך נשמרת היסטוריה מלאה (מי החזיר, מה ההערות, מה תוקן) במקום לדרוס נתונים.

import type { TenderApprovalRequest } from '../types'

/** מחזיר את parent_request_id מ-metadata, או null אם אין שרשרת. */
export function getParentRequestId(req: TenderApprovalRequest): string | null {
  const m = req.metadata as Record<string, unknown> | null
  const pid = m?.parent_request_id
  return typeof pid === 'string' ? pid : null
}

/** מחזיר את מספר האיטרציה הנוכחי (1 לסבב ראשון, 2+ לסבבים חוזרים). */
export function getResubmitIteration(req: TenderApprovalRequest): number {
  const m = req.metadata as Record<string, unknown> | null
  const v = m?.resubmit_iteration
  return typeof v === 'number' && v > 0 ? v : 1
}

/**
 * בונה את שרשרת הסבבים של בקשה — מהראשונה (V1) ועד הנוכחית (Vn).
 * צועד backwards דרך parent_request_id לאיתור כל ההיסטוריה.
 */
export function buildApprovalChain(
  current: TenderApprovalRequest,
  all: TenderApprovalRequest[],
): TenderApprovalRequest[] {
  const byId = new Map<string, TenderApprovalRequest>()
  for (const r of all) byId.set(r.id, r)

  const chain: TenderApprovalRequest[] = [current]
  let node = current
  // הגנה מפני שרשרת מקולקלת — לכל היותר 20 סבבים
  for (let i = 0; i < 20; i++) {
    const pid = getParentRequestId(node)
    if (!pid) break
    const parent = byId.get(pid)
    if (!parent) break
    chain.unshift(parent)
    node = parent
  }
  return chain
}

/** מחזיר את כל ה-ids של השרשרת — שימושי לסינון מסמכים. */
export function getChainRequestIds(chain: TenderApprovalRequest[]): string[] {
  return chain.map(r => r.id)
}
