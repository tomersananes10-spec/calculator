import type { DeliverableRow, WorkPackageRow } from "./types"

const DELIVERABLES: Record<string, DeliverableRow[]> = {
  "1": [
    { id: "cx-research",   name: "מחקר משתמשים ופרסונות",            selected: true,  quantity: 1, notes: "" },
    { id: "cx-journey",    name: "מסעות לקוח קיימים ועתידיים",       selected: true,  quantity: 1, notes: "" },
    { id: "ux-wireframes", name: "Wireframes ואפיון פונקציונלי",     selected: false, quantity: 1, notes: "" },
    { id: "ux-userflow",   name: "תרשימי User Flow",                 selected: false, quantity: 1, notes: "" },
    { id: "ui-design",     name: "עיצוב מלא של מסכים",               selected: false, quantity: 1, notes: "" },
    { id: "ui-styleguide", name: "Style Guide ושפה עיצובית",         selected: false, quantity: 1, notes: "" },
    { id: "usab-test",     name: "בדיקת שימושיות עם משתמשים",       selected: false, quantity: 1, notes: "" },
    { id: "brand",         name: "אסטרטגיית מותג ומעטפת ויזואלית",  selected: false, quantity: 1, notes: "" },
  ],
  "5": [
    { id: "data-strategy", name: "מסמך אסטרטגיית דאטה",      selected: true,  quantity: 1, notes: "" },
    { id: "data-arch",     name: "ארכיטקטורת נתונים",         selected: true,  quantity: 1, notes: "" },
    { id: "data-quality",  name: "תוכנית הבטחת איכות נתונים", selected: false, quantity: 1, notes: "" },
    { id: "etl-pipelines", name: "צינורות ETL",               selected: false, quantity: 1, notes: "" },
    { id: "bi-dashboards", name: "דשבורדים אנליטיים",         selected: false, quantity: 1, notes: "" },
    { id: "data-catalog",  name: "קטלוג נתונים",              selected: false, quantity: 1, notes: "" },
    { id: "ai-analytics",  name: "מודלים אנליטיים",           selected: false, quantity: 1, notes: "" },
    { id: "training-data", name: "הדרכה לצוות הדאטה",         selected: false, quantity: 1, notes: "" },
  ],
  "6": [
    { id: "cloud-readiness", name: "הערכת מוכנות למעבר לענן",     selected: true,  quantity: 1, notes: "" },
    { id: "migration-plan",  name: "תוכנית הגירה מפורטת",         selected: true,  quantity: 1, notes: "" },
    { id: "cloud-setup",     name: "הקמת סביבת ענן",              selected: false, quantity: 1, notes: "" },
    { id: "cicd",            name: "תשתית CI-CD",                 selected: false, quantity: 1, notes: "" },
    { id: "iac",             name: "Infrastructure as Code",      selected: false, quantity: 1, notes: "" },
    { id: "ha-dr",           name: "פתרון HA-DR",                 selected: false, quantity: 1, notes: "" },
    { id: "finops",          name: "אופטימיזציה פיננסית FinOps",  selected: false, quantity: 1, notes: "" },
    { id: "load-tests",      name: "בדיקות עומסים",               selected: false, quantity: 1, notes: "" },
  ],
  "7": [
    { id: "training-plan",   name: "תוכנית הדרכה מפורטת",          selected: true,  quantity: 1, notes: "" },
    { id: "training-mat",    name: "חומרי הדרכה",                  selected: true,  quantity: 1, notes: "" },
    { id: "training-videos", name: "סרטוני הדרכה",                 selected: false, quantity: 1, notes: "" },
    { id: "training-class",  name: "הדרכות פרונטליות",             selected: false, quantity: 1, notes: "" },
    { id: "ttt",             name: "תוכנית TTT הכשרת מדריכים",     selected: false, quantity: 1, notes: "" },
    { id: "embed-support",   name: "ליווי הטמעה",                  selected: false, quantity: 1, notes: "" },
    { id: "knowledge-base",  name: "מאגר ידע",                     selected: false, quantity: 1, notes: "" },
  ],
  "8": [
    { id: "sys-analysis",   name: "מסמך ניתוח מערכות",     selected: true,  quantity: 1, notes: "" },
    { id: "tech-spec",      name: "מסמך אפיון טכני מפורט", selected: true,  quantity: 1, notes: "" },
    { id: "architecture",   name: "ארכיטקטורת הפתרון",     selected: true,  quantity: 1, notes: "" },
    { id: "dev-system",     name: "פיתוח המערכת",          selected: true,  quantity: 1, notes: "" },
    { id: "test-docs",      name: "תסריטי בדיקות",         selected: true,  quantity: 1, notes: "" },
    { id: "source-code",    name: "קוד מקור ותיעוד טכני",  selected: true,  quantity: 1, notes: "" },
    { id: "user-manual",    name: "מדריך למשתמש",          selected: false, quantity: 1, notes: "" },
    { id: "ttt-dev",        name: "הדרכת TTT לצוות",       selected: false, quantity: 1, notes: "" },
    { id: "data-migration", name: "הסבת נתונים",           selected: false, quantity: 1, notes: "" },
  ],
  "11": [
    { id: "pt-infra",    name: "בדיקת חדירות תשתיתית",    selected: true,  quantity: 1, notes: "" },
    { id: "pt-app",      name: "בדיקת חדירות אפליקטיבית", selected: false, quantity: 1, notes: "" },
    { id: "code-review", name: "סקר קוד",                  selected: false, quantity: 1, notes: "" },
    { id: "pt-report",   name: "דוח בדיקות וממצאים",       selected: true,  quantity: 1, notes: "" },
    { id: "remediation", name: "בדיקה חוזרת לאחר תיקון",  selected: true,  quantity: 1, notes: "" },
    { id: "exec-summary",name: "דוח מסכם לניהול",          selected: false, quantity: 1, notes: "" },
  ],
  "2": [], "3": [], "4": [], "9": [], "10": [], "12": [],
}

const WORK_PACKAGES: Record<string, WorkPackageRow[]> = {
  "5": [
    { id: "bi-l",    name: "דשבורד BI גדול",      size: "large",  description: "עד 6 דשבורדים, 6 גרפים מורכבים, 6 APIs, 4 מקורות+", quantity: 0 },
    { id: "bi-m",    name: "דשבורד BI בינוני",    size: "medium", description: "עד 5 דשבורדים, 8 גרפים, עד 3 APIs",                  quantity: 0 },
    { id: "bi-s",    name: "דשבורד BI קטן",       size: "small",  description: "דשבורד 1, עד 8 גרפים פשוטים",                       quantity: 0 },
    { id: "etl-l",   name: "מודל נתונים גדול",    size: "large",  description: "ETL מ-6 מקורות ומעלה, Feature Store, 10-15 טבלאות", quantity: 0 },
    { id: "etl-m",   name: "מודל נתונים בינוני",  size: "medium", description: "ETL עד 3 מקורות, Data Catalog, 5-10 טבלאות",        quantity: 0 },
    { id: "etl-s",   name: "מודל נתונים קטן",     size: "small",  description: "ETL ממקור יחיד",                                    quantity: 0 },
    { id: "pipe-cx", name: "Pipeline מורכב",      size: "large",  description: "מעל 5 טבלאות, לוגיקה מורכבת",                      quantity: 0 },
    { id: "pipe-sm", name: "Pipeline פשוט",       size: "small",  description: "עד 5 טבלאות, ללא לוגיקה מורכבת",                   quantity: 0 },
    { id: "ai-cx",   name: "אנליטיקה ו-AI מורכב", size: "large",  description: "מעל 5 ישויות, לוגיקה עסקית מורכבת",                quantity: 0 },
    { id: "ai-sm",   name: "אנליטיקה ו-AI פשוט",  size: "small",  description: "עד 5 ישויות, ללא לוגיקה מורכבת",                   quantity: 0 },
  ],
  "8": [
    { id: "ds-cx",   name: "Design System מורכב",  size: "large",  description: "6-12 מסכים, 41-100 שדות, 7-12 טבלאות DB", quantity: 0 },
    { id: "ds-md",   name: "Design System בינוני", size: "medium", description: "2-5 מסכים, 11-40 שדות, 3-6 טבלאות DB",    quantity: 0 },
    { id: "ds-sm",   name: "Design System פשוט",   size: "small",  description: "מסך אחד, 1-10 שדות, 1-2 טבלאות DB",       quantity: 0 },
    { id: "flow-cx", name: "קונטיינר תהליכי מורכב", size: "large",  description: "11-20 שלבים, 7-12 טבלאות",               quantity: 0 },
    { id: "flow-md", name: "קונטיינר תהליכי בינוני",size: "medium", description: "6-10 שלבים, 4-6 טבלאות",                 quantity: 0 },
    { id: "flow-sm", name: "קונטיינר תהליכי פשוט",  size: "small",  description: "עד 5 שלבים, 1-3 טבלאות",                 quantity: 0 },
    { id: "api-cx",  name: "API ואינטגרציה מורכב",  size: "large",  description: "61-150 שדות, 6-10 טבלאות, Real-time",    quantity: 0 },
    { id: "api-md",  name: "API ואינטגרציה בינוני", size: "medium", description: "21-60 שדות, 3-5 טבלאות, Batch-Sync",     quantity: 0 },
    { id: "api-sm",  name: "API ואינטגרציה פשוט",   size: "small",  description: "1-20 שדות, 1-2 טבלאות, REST GET",       quantity: 0 },
  ],
  "6": [
    { id: "cloud-adv",  name: "ייעוץ מעבר לענן",        size: "fixed", description: "הערכת מוכנות, המלצות ארכיטקטורה",   quantity: 0 },
    { id: "mig-l",      name: "הגירה ומודרניזציה גדול", size: "large", description: "מעל 200,000 שח",                     quantity: 0 },
    { id: "mig-s",      name: "הגירה ומודרניזציה קטן",  size: "small", description: "עד 200,000 שח",                      quantity: 0 },
    { id: "cicd-l",     name: "CI-CD ו-XOps גדול",      size: "large", description: "מעל 200,000 שח",                     quantity: 0 },
    { id: "cicd-s",     name: "CI-CD ו-XOps קטן",       size: "small", description: "עד 200,000 שח",                      quantity: 0 },
    { id: "finops-aws", name: "FinOps AWS",              size: "fixed", description: "ייעוץ ויישום אופטימיזציה פיננסית",   quantity: 0 },
    { id: "finops-gcp", name: "FinOps GCP",              size: "fixed", description: "ייעוץ ויישום אופטימיזציה פיננסית",   quantity: 0 },
    { id: "load-aws",   name: "בדיקות עומסים AWS",      size: "fixed", description: "תכנון וביצוע בדיקות עומס",            quantity: 0 },
    { id: "load-gcp",   name: "בדיקות עומסים GCP",      size: "fixed", description: "תכנון וביצוע בדיקות עומס",            quantity: 0 },
  ],
  "1": [
    { id: "cx-pkg",    name: "תכנון חוויית לקוח CX",  size: "fixed", description: "מחקר, פרסונות, מסעות לקוח",       quantity: 0 },
    { id: "ux-pkg",    name: "אפיון חוויית משתמש UX", size: "fixed", description: "Wireframes, User Flows, אפיון",    quantity: 0 },
    { id: "ui-pkg",    name: "עיצוב ממשק משתמש UI",   size: "fixed", description: "Visual Design, Style Guide",        quantity: 0 },
    { id: "usab-pkg",  name: "בדיקת שימושיות",         size: "fixed", description: "User Testing, UX Review",          quantity: 0 },
    { id: "brand-pkg", name: "מיתוג דיגיטלי",          size: "fixed", description: "Brand Strategy, Visual Identity", quantity: 0 },
  ],
  "7": [
    { id: "train-dev", name: "פיתוח מערכי הדרכה", size: "fixed", description: "תכנית, תרגילים, מבדקים",  quantity: 0 },
    { id: "train-mat", name: "הכנת חומרי הדרכה",  size: "fixed", description: "מצגות, סרטונים, לומדות",  quantity: 0 },
    { id: "train-cls", name: "הדרכה פרונטלית",    size: "fixed", description: "כיתות מחשב, Webinar",     quantity: 0 },
    { id: "embed-pkg", name: "הטמעה",              size: "fixed", description: "ליווי אישי ורוחבי",       quantity: 0 },
  ],
  "11": [
    { id: "pt-infra-pkg", name: "בדיקת חדירות תשתיתית",    size: "fixed", description: "Penetration Test Infrastructure", quantity: 0 },
    { id: "pt-app-pkg",   name: "בדיקת חדירות אפליקטיבית", size: "fixed", description: "Penetration Test Application",    quantity: 0 },
    { id: "cr-pkg",       name: "סקר קוד",                 size: "fixed", description: "Static analysis + manual review", quantity: 0 },
  ],
  "2": [], "3": [], "4": [], "9": [], "10": [], "12": [],
}

export function getClusterDeliverables(clusterId: string): DeliverableRow[] {
  return (DELIVERABLES[clusterId] ?? []).map(d => ({ ...d }))
}

export function getClusterWorkPackages(clusterId: string): WorkPackageRow[] {
  return (WORK_PACKAGES[clusterId] ?? []).map(w => ({ ...w }))
}
