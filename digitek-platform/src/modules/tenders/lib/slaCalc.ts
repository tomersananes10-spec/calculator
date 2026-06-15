// לוח שנה ישראלי לחישובי SLA
// שבוע עבודה: ראשון–חמישי. שישי+שבת = סופ"ש.
// חגים יהודיים בהם המשרדים סגורים — רשימה ידנית ל-2026-2027 (לאחר מכן צריך לעדכן).
// החלטה: לא משתמשים בספריה חיצונית בפאזה 2 ([feedback_no_paid_upgrades] + להימנע מ-bloat).

// פורמט YYYY-MM-DD — תאריכים בהם אין עבודה (חוץ מסופ"ש)
export const ISRAELI_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2026
  '2026-03-04', // פורים
  '2026-04-02', // ערב פסח
  '2026-04-03', // פסח א'
  '2026-04-09', // שביעי של פסח
  '2026-04-22', // יום הזיכרון
  '2026-04-23', // יום העצמאות
  '2026-05-22', // שבועות
  '2026-09-12', // ערב ראש השנה
  '2026-09-13', // ראש השנה א'
  '2026-09-14', // ראש השנה ב'
  '2026-09-22', // יום כיפור
  '2026-09-27', // סוכות א'
  '2026-10-04', // שמיני עצרת
  // 2027
  '2027-03-23', // פורים
  '2027-04-21', // פסח א'
  '2027-04-27', // שביעי של פסח
  '2027-05-11', // יום הזיכרון
  '2027-05-12', // יום העצמאות
  '2027-06-10', // שבועות
  '2027-10-01', // ערב ראש השנה
  '2027-10-02', // ראש השנה א'
  '2027-10-03', // ראש השנה ב'
  '2027-10-11', // יום כיפור
  '2027-10-16', // סוכות א'
  '2027-10-23', // שמיני עצרת
])

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** האם תאריך נתון הוא יום עבודה ישראלי (ראשון-חמישי, ולא חג). */
export function isBusinessDay(d: Date): boolean {
  const day = d.getDay() // 0=Sunday, 6=Saturday
  if (day === 5 || day === 6) return false // שישי או שבת
  if (ISRAELI_HOLIDAYS.has(toDateKey(d))) return false
  return true
}

/** מוסיף N ימי עבודה לתאריך (מתעלם מסופ"ש וחגים). */
export function addBusinessDays(start: Date, businessDays: number): Date {
  if (businessDays === 0) return new Date(start)
  const direction = businessDays > 0 ? 1 : -1
  let remaining = Math.abs(businessDays)
  const result = new Date(start)
  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    if (isBusinessDay(result)) remaining--
  }
  return result
}

/** מחזיר את מספר ימי העבודה בין שני תאריכים (start exclusive, end inclusive). */
export function businessDaysBetween(start: Date, end: Date): number {
  if (start >= end) return 0
  let count = 0
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setHours(0, 0, 0, 0)
  while (cursor < last) {
    cursor.setDate(cursor.getDate() + 1)
    if (isBusinessDay(cursor)) count++
  }
  return count
}

/** מחזיר את התאריך הבא שהוא יום עבודה (כולל את התאריך הנוכחי אם הוא יום עבודה). */
export function nextBusinessDay(d: Date): Date {
  const result = new Date(d)
  while (!isBusinessDay(result)) {
    result.setDate(result.getDate() + 1)
  }
  return result
}
