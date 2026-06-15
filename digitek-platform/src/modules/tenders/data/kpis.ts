// 10 KPIs — §12 באפיון

export type KpiUnit = 'days' | 'percent' | 'count' | 'score'
export type KpiDirection = 'higher_better' | 'lower_better'

export interface KpiDefinition {
  id: string
  label: string
  target: string
  unit: KpiUnit
  direction: KpiDirection
  measurementSource: string
  module: string
}

export const KPIS: KpiDefinition[] = [
  {
    id: 'lead_time',
    label: 'Lead Time ממוצע מאישור תקציב ל-Go-Live',
    target: '≤ 95 ימי עבודה (מעל 5M)',
    unit: 'days',
    direction: 'lower_better',
    measurementSource: 'מעקב סטטוס',
    module: 'M03',
  },
  {
    id: 'on_time_pct',
    label: '% הליכים שמסתיימים בזמן יעד',
    target: '≥ 80%',
    unit: 'percent',
    direction: 'higher_better',
    measurementSource: 'Reports',
    module: 'M01',
  },
  {
    id: 'committee_returns_pct',
    label: '% החזרות מועדת מכרזים (יציאה/זכיה)',
    target: '≤ 10%',
    unit: 'percent',
    direction: 'lower_better',
    measurementSource: 'Reports',
    module: 'M03',
  },
  {
    id: 'professional_sla_pct',
    label: 'שיעור עמידה ב-SLA של גורם מקצועי (3 ימים)',
    target: '≥ 90%',
    unit: 'percent',
    direction: 'higher_better',
    measurementSource: 'M11',
    module: 'M11',
  },
  {
    id: 'vendor_sign_days',
    label: 'זמן ממוצע לחתימת הסכם ע"י ספק',
    target: '≤ 10 ימי עבודה',
    unit: 'days',
    direction: 'lower_better',
    measurementSource: 'Reports',
    module: 'M07',
  },
  {
    id: 'milestones_clean_pct',
    label: 'שיעור אבני דרך שאושרו ללא הערות',
    target: '≥ 70%',
    unit: 'percent',
    direction: 'higher_better',
    measurementSource: 'Reports',
    module: 'M09',
  },
  {
    id: 'vendor_eval_pct',
    label: 'שיעור הליכים שנסגרו עם הערכת ספק',
    target: '100% (בלוקר)',
    unit: 'percent',
    direction: 'higher_better',
    measurementSource: 'Reports',
    module: 'M10',
  },
  {
    id: 'uptime',
    label: 'זמינות מערכת (Uptime)',
    target: '≥ 99.5%',
    unit: 'percent',
    direction: 'higher_better',
    measurementSource: 'מערכת ניטור',
    module: 'M14',
  },
  {
    id: 'nps',
    label: 'שביעות רצון משתמשים פנימיים (NPS)',
    target: '≥ 40',
    unit: 'score',
    direction: 'higher_better',
    measurementSource: 'סקרים',
    module: '—',
  },
  {
    id: 'integration_failures',
    label: 'מספר תקלות אינטגרציה לחודש',
    target: '≤ 3',
    unit: 'count',
    direction: 'lower_better',
    measurementSource: 'M14',
    module: 'M13',
  },
]
