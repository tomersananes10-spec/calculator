// קיבוץ מסמכי ההליך לפי doc_type — לארכיון המסמכים המרכזי בתיקיית ההליך.
// הקבוצות מוצגות בסיידבר של DocumentArchiveModal; בתוך כל קבוצה הגרסאות
// מסודרות לפי created_at יורד (העדכניות בראש).

import type { TenderDocument } from '../types'

export interface DocTypeGroup {
  docType: string
  /** מסודר לפי created_at יורד — האחרון בראש (=הגרסה האחרונה). */
  documents: TenderDocument[]
}

/** קיבוץ מסמכים לפי doc_type. כל קבוצה ממוינת מהחדש לישן. */
export function groupDocumentsByType(docs: TenderDocument[]): DocTypeGroup[] {
  const byType = new Map<string, TenderDocument[]>()
  for (const d of docs) {
    const t = d.doc_type ?? 'other'
    const arr = byType.get(t) ?? []
    arr.push(d)
    byType.set(t, arr)
  }
  const groups: DocTypeGroup[] = []
  for (const [docType, arr] of byType) {
    arr.sort((a, b) => b.created_at.localeCompare(a.created_at))
    groups.push({ docType, documents: arr })
  }
  // סדר תצוגה ב-sidebar — לפי הסדר ההגיוני של תהליך ההליך, לא אלפבית
  groups.sort((a, b) => DOC_TYPE_ORDER.indexOf(a.docType) - DOC_TYPE_ORDER.indexOf(b.docType))
  return groups
}

/** סדר התצוגה של סוגי המסמכים בארכיון — לפי הזרימה של ההליך. */
export const DOC_TYPE_ORDER: string[] = [
  'brief',
  'budget_approval',
  'olma_approval',
  'committee_request',
  'committee_protocol',
  'tender_publication',
  'qa_questions',
  'qa_answers',
  'proposal',
  'evaluation_score',
  'contract',
  'guarantee',
  'insurance',
  'purchase_order',
  'invoice',
  'milestone_deliverable',
  'vendor_evaluation',
  'other',
]

/** תווית עברית לסוג מסמך, לתצוגה בסיידבר וב-headings. */
export const DOC_TYPE_LABELS: Record<string, string> = {
  brief: 'בריף הפרויקט',
  budget_approval: 'אישור תקציבי',
  olma_approval: 'אישור מינהל הרכש',
  committee_request: 'בקשת ועדה',
  committee_protocol: 'פרוטוקול ועדה',
  tender_publication: 'פרסום תיחור',
  qa_questions: 'שאלות הבהרה',
  qa_answers: 'תשובות הבהרה',
  proposal: 'הצעת ספק',
  evaluation_score: 'ניקוד הצעה',
  contract: 'חוזה',
  guarantee: 'ערבות',
  insurance: 'ביטוח',
  purchase_order: 'הזמנת רכש',
  invoice: 'חשבונית',
  milestone_deliverable: 'תוצרי אבן דרך',
  vendor_evaluation: 'הערכת ספק',
  other: 'מסמכים נוספים',
}

/** אייקון אמוג'י לסוג מסמך — לעקביות עם המוקאפ. */
export const DOC_TYPE_ICONS: Record<string, string> = {
  brief: '📋',
  budget_approval: '💰',
  olma_approval: '🏛',
  committee_request: '📨',
  committee_protocol: '⚖️',
  tender_publication: '📢',
  qa_questions: '❓',
  qa_answers: '💬',
  proposal: '📊',
  evaluation_score: '⭐',
  contract: '📜',
  guarantee: '🛡',
  insurance: '📑',
  purchase_order: '🛒',
  invoice: '🧾',
  milestone_deliverable: '🎯',
  vendor_evaluation: '✅',
  other: '📎',
}

export function docTypeLabel(t: string): string {
  return DOC_TYPE_LABELS[t] ?? t
}

export function docTypeIcon(t: string): string {
  return DOC_TYPE_ICONS[t] ?? '📄'
}
