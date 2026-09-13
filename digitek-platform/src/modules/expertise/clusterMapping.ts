// מיפוי אשכול→אשכול בין נספח ב' (מודול "אשכולות והתמחויות", cluster_id 1-12)
// לבין אשכולות הספקים הזוכים (נספח ד1/ד2, מפוצל לעולמות tech/digital).
//
// הטקסונומיות שונות: נספח ב' = 12 אשכולות תיאוריים; הספקים = 5 אשכולות דיגיטל + 7 טק.
// המיפוי מבוסס cluster_slug (יציב — לא נשבר על רווחים/פיסוק בשם).
// מקור: expertise_clusters ↔ service_clusters ב-digitek-dev (נשלף 13.09.2026).

export type SupplierDomain = 'tech' | 'digital'

export interface SupplierClusterRef {
  domain: SupplierDomain
  clusterSlug: string
  /** שם האשכול בצד הספקים — לתצוגה ב-chip */
  clusterName: string
}

// cluster_id (נספח ב') → אשכול הספקים המקביל
export const EXPERTISE_TO_SUPPLIER_CLUSTER: Record<number, SupplierClusterRef> = {
  1:  { domain: 'digital', clusterSlug: 'user-experience',              clusterName: 'חווית משתמש' },        // עיצוב שירות
  2:  { domain: 'digital', clusterSlug: 'content',                      clusterName: 'תוכן' },
  3:  { domain: 'digital', clusterSlug: 'process-change',               clusterName: 'שינוי תהליכים' },
  4:  { domain: 'digital', clusterSlug: 'product-management',           clusterName: 'ניהול מוצר' },
  5:  { domain: 'digital', clusterSlug: 'data',                         clusterName: 'דאטה' },
  6:  { domain: 'tech',    clusterSlug: 'infra-cloud-migration',        clusterName: 'תשתיות והגירה לענן' },
  7:  { domain: 'tech',    clusterSlug: 'training',                     clusterName: 'הדרכה' },              // הדרכה והטמעה
  8:  { domain: 'tech',    clusterSlug: 'planning-analysis-development', clusterName: 'תיכנון ניתוח ופיתוח' }, // ניתוח ופיתוח
  9:  { domain: 'tech',    clusterSlug: 'databases',                    clusterName: 'בסיסי נתונים' },
  10: { domain: 'tech',    clusterSlug: 'tech-innovation',              clusterName: 'חדשנות טכנולוגית' },
  11: { domain: 'tech',    clusterSlug: 'infosec',                      clusterName: 'אבטחת מידע' },
  12: { domain: 'tech',    clusterSlug: 'third-party-cloud-integration', clusterName: 'אינטגרציה של פתרונות צד ג לענן' }, // נימבוס
}

export function resolveSupplierCluster(expertiseClusterId: number): SupplierClusterRef | null {
  return EXPERTISE_TO_SUPPLIER_CLUSTER[expertiseClusterId] ?? null
}

const DOMAIN_LABEL: Record<SupplierDomain, string> = {
  tech: 'ספקי טק',
  digital: 'ספקי דיגיטל',
}
export const domainLabel = (d: SupplierDomain) => DOMAIN_LABEL[d]
