import type { RoleTemplate } from '../modules/engine/types'

export const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  cio: {
    id: 'cio',
    name: 'סמנכ"ל/ית טכנולוגיות מידע CIO',
    takamCode: '51037483',
    source: 'הגדרת עיסוק CIO, עדכון 25.01.2026',
    description: 'אחראי כולל על מערכות המידע הארגוניות — אסטרטגיה, תכנון ותפעול',
    isActive: true,
    requirements: [
      {
        id: 'cio-education',
        category: 'education',
        label: 'השכלה אקדמית / חלופת הנדסאי-טכנאי',
        description: 'זכאות לתואר אקדמי מוכר. לחלופין: הנדסאי/טכנאי מוסמך הרשום בפנקס, בהתאם לסעיף 39, עם תוספת שנות ניסיון.',
        acceptedEvidence: ['תעודת תואר', 'אישור זכאות לתואר', 'אישור שקילות לתואר זר', 'תעודת הנדסאי/טכנאי', 'אישור רישום בפנקס'],
        keywords: ['תואר', 'זכאות לתואר', 'B.A', 'B.Sc', 'M.A', 'M.Sc', 'מוסמך', 'הנדסאי', 'טכנאי', 'פנקס', 'שקילות', 'מל"ג', 'המועצה להשכלה גבוהה'],
        minScore: 15,
        hardRule: true,
        weight: 3,
      },
      {
        id: 'cio-professionalExperience',
        category: 'professional_exp',
        label: 'ניסיון מקצועי בתחום מערכות מידע',
        description: '6 שנות ניסיון מקצועי בתחום מערכות מידע; לבעלי תואר שני — 5 שנות ניסיון. להנדסאים — 7 שנים; לטכנאים — 8 שנים.',
        keywords: ['מערכות מידע', 'CIO', 'טכנולוגיות מידע', 'IT', 'דיגיטל', 'דאטה', 'סייבר', 'יישומים', 'תשתיות', 'ארכיטקטורה', 'ERP', 'CRM', 'ענן', 'IT Operations', 'Information Systems'],
        yearsByTrack: { bachelor: 6, master: 5, practicalEngineer: 7, technician: 8 },
        minScore: 25,
        hardRule: true,
        weight: 5,
      },
      {
        id: 'cio-teamManagement',
        category: 'team_management',
        label: 'ניסיון ניהולי — ניהול צוות',
        description: '3 שנות ניסיון בניהול צוות. ניתן למנות את הניסיון הניהולי בחופף או במצטבר לניסיון המקצועי.',
        keywords: ['ניהול צוות', 'מנהל צוות', 'מנהלת צוות', 'ניהל צוות', 'ניהלה צוות', 'ראש צוות', 'ראשת צוות', 'Team Lead', 'ניהלתי', 'הובלתי צוות', 'הובלת צוות', 'הוביל צוות', 'הובילה צוות', 'ניהול עובדים', 'כפיפים', 'מנהלים', 'יחידה', 'אגף'],
        minYears: 3,
        minScore: 15,
        hardRule: true,
        weight: 4,
      },
      {
        id: 'cio-budgetManagement',
        category: 'budget_management',
        label: 'ניסיון בניהול תקציב',
        description: 'ניסיון בניהול תקציב בהיקף שנתי של 5 מלש"ח לפחות.',
        keywords: ['תקציב', 'מלש"ח', 'מיליון', '₪', 'שנתי', 'התקשרויות', 'רכש', 'ספקים', 'ניהול תקציב'],
        minBudgetNis: 5_000_000,
        minScore: 20,
        hardRule: false,
        weight: 3,
      },
    ],
  },

  infraSenior: {
    id: 'infraSenior',
    name: 'מנהל/ת תחום בכיר תשתיות טכנולוגיות',
    takamCode: '51037473',
    source: 'הגדרת עיסוק תשתיות טכנולוגיות, עדכון 25.01.2026',
    description: 'ניהול תחום תשתיות טכנולוגיות — שרתים, ענן, תקשורת ואבטחת מידע',
    isActive: true,
    requirements: [
      {
        id: 'infra-education',
        category: 'education',
        label: 'השכלה אקדמית / חלופת הנדסאי-טכנאי',
        description: 'השכלה אקדמית — תואר ראשון. לחלופין: הנדסאי מוסמך עם 6 שנות ניסיון או טכנאי מוסמך עם 7 שנות ניסיון.',
        acceptedEvidence: ['תעודת תואר ראשון', 'אישור זכאות', 'אישור שקילות', 'תעודת הנדסאי/טכנאי', 'אישור רישום בפנקס'],
        keywords: ['תואר ראשון', 'תואר', 'B.A', 'B.Sc', 'הנדסאי', 'טכנאי', 'פנקס', 'שקילות', 'מל"ג'],
        minScore: 15,
        hardRule: true,
        weight: 3,
      },
      {
        id: 'infra-professionalExperience',
        category: 'professional_exp',
        label: 'ניסיון בתחום מערכות מידע',
        description: '5 שנות ניסיון בתחום מערכות מידע; לבעלי תואר שני — 4 שנים. להנדסאים — 6 שנים; לטכנאים — 7 שנים.',
        keywords: ['מערכות מידע', 'תשתיות', 'תשתיות טכנולוגיות', 'ענן', 'Cloud', 'Azure', 'AWS', 'GCP', 'סיסטם', 'שרתים', 'תקשורת', 'Network', 'DevOps', 'Kubernetes', 'Docker', 'אבטחת מידע', 'ארכיטקטורה'],
        yearsByTrack: { bachelor: 5, master: 4, practicalEngineer: 6, technician: 7 },
        minScore: 25,
        hardRule: true,
        weight: 5,
      },
      {
        id: 'infra-teamManagement',
        category: 'team_management',
        label: 'ניהול צוותי תשתיות טכנולוגיות',
        description: 'מתוך הניסיון: שנתיים בניהול צוותי תשתיות טכנולוגיות.',
        keywords: ['ניהול צוותי תשתיות', 'מנהל צוות תשתיות', 'מנהלת צוות תשתיות', 'ראש צוות תשתיות', 'Team Lead', 'DevOps Lead', 'ניהול צוות', 'מנהל צוות', 'מנהלת צוות', 'הובלתי צוות', 'הובלת צוות', 'הובילה צוות', 'ניהול אנשי צוות'],
        minYears: 2,
        minScore: 15,
        hardRule: true,
        weight: 4,
      },
    ],
  },

  appsSenior: {
    id: 'appsSenior',
    name: 'מנהל/ת תחום בכיר יישומים',
    takamCode: '51037471',
    source: 'הגדרת עיסוק יישומים, עדכון 25.01.2026',
    description: 'ניהול תחום יישומים — אפיון, פיתוח, יישום, אינטגרציה והטמעה',
    isActive: true,
    requirements: [
      {
        id: 'apps-education',
        category: 'education',
        label: 'השכלה אקדמית / חלופת הנדסאי-טכנאי',
        description: 'זכאות לתואר אקדמי מוכר. לחלופין: הנדסאי מוסמך עם 6 שנות ניסיון או טכנאי מוסמך עם 5 שנות ניסיון.',
        acceptedEvidence: ['תעודת תואר', 'אישור זכאות', 'אישור שקילות', 'תעודת הנדסאי/טכנאי', 'אישור רישום בפנקס'],
        keywords: ['תואר', 'B.A', 'B.Sc', 'מערכות מידע', 'מדעי המחשב', 'הנדסאי', 'טכנאי', 'פנקס', 'שקילות', 'מל"ג'],
        minScore: 15,
        hardRule: true,
        weight: 3,
      },
      {
        id: 'apps-professionalExperience',
        category: 'professional_exp',
        label: 'ניסיון בתחום מערכות מידע / יישומים',
        description: 'ניסיון מקצועי ביישומים: אפיון, פיתוח, יישום, אינטגרציה, הטמעה ותחזוקת מערכות.',
        keywords: ['יישומים', 'מערכות מידע', 'פיתוח', 'אפיון', 'יישום', 'אינטגרציה', 'הטמעה', 'תחזוקה', 'ERP', 'CRM', 'מערכות', 'Product', 'Agile', 'ניתוח מערכות', 'משתמשים'],
        yearsByTrack: { bachelor: 5, master: 4, practicalEngineer: 6, technician: 5 },
        minScore: 25,
        hardRule: true,
        weight: 5,
      },
      {
        id: 'apps-teamManagement',
        category: 'team_management',
        label: 'ניהול צוותי יישומים / תכנית עבודה',
        description: 'ניהול צוותי עבודה המיישמים את התוכנית השנתית, ניהול משאבים ושיטות עבודה בתחום היישומים.',
        keywords: ['ניהול צוות', 'מנהל צוות', 'מנהלת צוות', 'צוותי יישומים', 'מנהל פיתוח', 'מנהלת פיתוח', 'ראש צוות', 'Team Lead', 'תוכנית עבודה', 'ניהול משאבים', 'Delivery', 'ניהול פרויקטים', 'הטמעה', 'הובלת צוות', 'הובילה צוות', 'ניהול אנשי צוות'],
        minYears: 2,
        minScore: 15,
        hardRule: true,
        weight: 4,
      },
    ],
  },
}

export const SAMPLE_CV = `שם: דנה כהן
השכלה: B.Sc במערכות מידע, אוניברסיטת חיפה
ניסיון:
2021-2025: מנהלת צוות תשתיות ענן בארגון פיננסי. הובלת צוות של 5 אנשי DevOps וסיסטם, ניהול ספקי ענן ותקציב שנתי. עבודה עם Azure, Kubernetes, Docker, Terraform, שרתים וארכיטקטורת תשתיות.
2018-2021: מהנדסת סיסטם ותקשורת. ניהול פרויקטי מיגרציה לענן, אבטחת מידע, רשתות ושרתים.
הסמכות: Azure Administrator, ITIL.`

export function getRoleTemplateList(): RoleTemplate[] {
  return Object.values(ROLE_TEMPLATES).filter(t => t.isActive)
}
