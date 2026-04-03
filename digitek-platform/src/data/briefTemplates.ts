import type { Cluster, Specialization } from "./clusters"
import type { WizardState, DeliverableRow, WorkPackageRow } from "../modules/brief-generator/types"

interface ClusterTemplate {
  businessProblem: string
  existingSystems: string
  mainGaps: string
  archNotes: string
  general: string
  expectedBenefits: string
  targetAudience: string
  technicalCharacteristics: string
  kpis: string
  successCriteria: string
  paymentMilestones: string
}

const CLUSTER_TEMPLATES: Record<string, ClusterTemplate> = {
  "1": {
    businessProblem: "השירות הממשלתי הקיים אינו עונה על צרכי המשתמשים ולא מספק חוויה נאותה. תהליכי השירות מורכבים, לא ברורים ומקשים על האזרח לקבל את השירות בצורה יעילה.",
    existingSystems: "מערכות ממשלתיות קיימות, ממשקי אינטרנט ישנים, מסמכי אפיון קודמים.",
    mainGaps: "היעדר מחקר משתמשים עדכני, ממשקים לא נגישים, חוויית שירות לא עקבית.",
    archNotes: "פרויקט עיצוב שירות — אין דרישות תשתית טכנולוגית ישירות.",
    general: "פרויקט לעיצוב ושיפור חוויית השירות הממשלתי. הפרויקט כולל מחקר משתמשים, מיפוי מסעות לקוח, עיצוב ממשקים ובדיקות שמישות.",
    expectedBenefits: "שיפור שביעות רצון המשתמשים, קיצור זמני טיפול, הפחתת פניות לשירות לקוחות, עמידה בתקני נגישות.",
    targetAudience: "אזרחים, עובדי המשרד, גורמים ממשלתיים נוספים.",
    technicalCharacteristics: "עיצוב רספונסיבי, תאימות לתקני נגישות WCAG 2.1, תמיכה בדפדפנים מודרניים.",
    kpis: "ציון שביעות רצון משתמשים (CSAT), שיעור השלמת משימות, זמן ממוצע לביצוע פעולה.",
    successCriteria: "אישור כל התוצרים על ידי הגורם המזמין, עמידה בתקני נגישות, תוצאות חיוביות בבדיקות משתמשים.",
    paymentMilestones: "20% בעת חתימה, 30% עם השלמת מחקר ומיפוי, 30% עם אישור עיצוב, 20% עם מסירה סופית.",
  },
  "2": {
    businessProblem: "תוכן קיים אינו ברור, נגיש או מעודכן. המידע מוצג בשפה מורכבת, אינו מותאם לקהלי היעד השונים ואינו עומד בתקני נגישות.",
    existingSystems: "אתר אינטרנט קיים, מסמכים, חומרי הדרכה, רשתות חברתיות.",
    mainGaps: "היעדר אסטרטגיית תוכן, שפה לא ברורה, חוסר בתוכן נגיש, ערוצי הפצה לא מנוצלים.",
    archNotes: "יש לבחון תאימות עם מערכות ניהול תוכן קיימות (CMS).",
    general: "פרויקט לפיתוח וייצור תוכן מקצועי, ברור ונגיש. הפרויקט כולל גיבוש אסטרטגיית תוכן, כתיבה, עריכה ופיתוח חומרים ויזואליים.",
    expectedBenefits: "תוכן ברור ומובן לכלל הציבור, שיפור התקשורת עם האזרח, עמידה בתקני נגישות, חיזוק המותג הממשלתי.",
    targetAudience: "אזרחים, עיתונאים, עובדי הממשלה, קהלים עם מוגבלויות.",
    technicalCharacteristics: "תאימות לתקני נגישות, עיצוב רספונסיבי, פורמטים מגוונים (טקסט, וידאו, אינפוגרפיקה).",
    kpis: "מדדי מעורבות (views, shares), ציון קריאות, שיעור עמידה בתקני נגישות.",
    successCriteria: "אישור כל תכני הפרויקט על ידי הגורם המזמין, עמידה בתקני נגישות, לוח זמנים מוסכם.",
    paymentMilestones: "25% בעת חתימה, 25% עם אישור אסטרטגיית תוכן, 30% עם השלמת ייצור, 20% עם פרסום ומסירה.",
  },
  "3": {
    businessProblem: "תהליכים ארגוניים קיימים אינם יעילים, מכילים חפיפות וצווארי בקבוק. הדיגיטציה חלקית ואינה מנצלת את מלוא הפוטנציאל הטכנולוגי הקיים.",
    existingSystems: "מערכות ERP/CRM קיימות, מסמכי נהלים, תהליכי עבודה ידניים.",
    mainGaps: "תהליכים ידניים, העדר אוטומציה, נהלים לא מתועדים, חוסר ב-KPIs ומדדי ביצוע.",
    archNotes: "יש לבחון ממשקים עם מערכות קיימות ואפשרויות לאוטומציה.",
    general: "פרויקט לניתוח ושיפור תהליכים ארגוניים. הפרויקט כולל מיפוי מצב קיים, ניתוח פערים, עיצוב תהליכים עתידיים וגיבוש תכנית יישום.",
    expectedBenefits: "קיצור זמני תהליכים, הפחתת עלויות תפעוליות, שיפור שביעות רצון עובדים ולקוחות, עמידה בדרישות רגולטוריות.",
    targetAudience: "עובדי המשרד, מנהלים, גורמי שירות פנימיים וחיצוניים.",
    technicalCharacteristics: "תאימות עם מערכות קיימות, אפשרות לאינטגרציה עם כלי אוטומציה.",
    kpis: "זמן תהליך ממוצע, שיעור שגיאות, עלות לעסקה, שביעות רצון עובדים.",
    successCriteria: "אישור מסמכי תהליכים חדשים, תכנית יישום מאושרת, הדרכת גורמים רלוונטיים.",
    paymentMilestones: "20% בעת חתימה, 30% עם אישור מיפוי מצב קיים, 30% עם אישור תהליכים עתידיים, 20% עם השלמת תכנית היישום.",
  },
  "4": {
    businessProblem: "ניהול המוצר הדיגיטלי חסר מתודולוגיה ברורה, חסרה הגדרת MVP מדויקת ויש קושי בתיאום בין בעלי עניין מרובים.",
    existingSystems: "מוצרים דיגיטליים קיימים, מערכות ניהול פרויקטים, תיעוד טכני.",
    mainGaps: "היעדר Product roadmap, חוסר בהגדרת מדדי הצלחה, קושי בניהול בעלי עניין.",
    archNotes: "יש לתאם עם צוותי פיתוח, עיצוב ותפעול.",
    general: "פרויקט לניהול מוצר דיגיטלי מקצה לקצה. הפרויקט כולל הגדרת אסטרטגיית מוצר, ניהול backlog, תיאום בין צוותים ומעקב אחר KPIs.",
    expectedBenefits: "פיתוח מוצר מסודר ומתועד, עמידה בלוחות זמנים, שביעות רצון גבוהה מהמוצר, ROI ברור.",
    targetAudience: "משתמשי קצה, בעלי עניין פנימיים, צוותי פיתוח ועיצוב.",
    technicalCharacteristics: "עבודה עם מתודולוגיית Agile/Scrum, כלי ניהול פרויקטים, תיעוד מלא.",
    kpis: "מהירות ספרינט (Velocity), NPS מוצר, אחוז עמידה ב-roadmap.",
    successCriteria: "השלמת MVP מוגדר, אישור בעלי עניין, תיעוד מלא של המוצר.",
    paymentMilestones: "20% בעת חתימה, 20% עם אישור Product roadmap, 40% לפי אבני דרך, 20% עם מסירה סופית.",
  },
  "5": {
    businessProblem: "המשרד אינו מנצל את הנתונים הקיימים לקבלת החלטות. חסרה תשתית דאטה מסודרת, ניתוח הנתונים ידני ואד-הוק, וחסרים דשבורדים ניהוליים.",
    existingSystems: "מסדי נתונים קיימים, Excel, דוחות BI קיימים, מערכות עסקיות.",
    mainGaps: "היעדר Data Governance, נתונים לא אחידים ולא מטויבים, חוסר ב-Single Source of Truth.",
    archNotes: "יש להגדיר ארכיטקטורת Data Warehouse/Lake, כלי BI, ושכבת ETL.",
    general: "פרויקט לבניית תשתית דאטה ואנליטיקה ארגונית. הפרויקט כולל מיפוי מקורות נתונים, בניית מודלי נתונים, פיתוח דשבורדים ויישום כלי אנליטיקה.",
    expectedBenefits: "קבלת החלטות מבוססת נתונים, חיסכון בזמן עיבוד נתונים, גילוי תובנות עסקיות חדשות.",
    targetAudience: "מנהלים, אנליסטים, עובדי שטח.",
    technicalCharacteristics: "Data Warehouse/Lake, כלי BI (Power BI / Tableau), ETL/ELT pipeline, אבטחת מידע ברמת עמודות.",
    kpis: "זמן עיבוד נתונים, כמות דשבורדים פעילים, שביעות רצון משתמשי הדאטה.",
    successCriteria: "דשבורדים פעילים ומאושרים, תיעוד מלא של מודלי נתונים, הדרכת משתמשים.",
    paymentMilestones: "20% בעת חתימה, 30% עם השלמת מיפוי וארכיטקטורה, 30% עם הקמת תשתית, 20% עם מסירה סופית.",
  },
  "6": {
    businessProblem: "התשתיות הטכנולוגיות הקיימות ישנות, קשות לתחזוקה ולא מאפשרות גמישות וסקאלאביליות. עלויות התפעול גבוהות ואמינות המערכת נמוכה.",
    existingSystems: "שרתים On-premise, מערכות ישנות (Legacy), תשתיות רשת קיימות.",
    mainGaps: "תשתיות לא מאובטחות, עלויות גבוהות, קושי בסקאלאביליות, חוסר זמינות גבוהה.",
    archNotes: "יש להגדיר ארכיטקטורת ענן (AWS/Azure/GCP), אסטרטגיית Lift and Shift לעומת Re-architecture.",
    general: "פרויקט להגירת תשתיות לענן ומודרניזציה. הפרויקט כולל מיפוי מערכות, תכנון ארכיטקטורת ענן, הגירה, בדיקות ותפעול.",
    expectedBenefits: "הפחתת עלויות תשתית, שיפור אמינות וזמינות, סקאלאביליות גמישה, שיפור אבטחת המידע.",
    targetAudience: "צוותי IT, מנהלי מערכות, משתמשי הקצה של המערכות.",
    technicalCharacteristics: "ענן ממשלתי מאושר, IaC (Terraform/CloudFormation), אוטומציה של CI/CD, ניטור ולוגים.",
    kpis: "זמן uptime, עלות לחישוב, זמן deployment, מספר אירועי אבטחה.",
    successCriteria: "הגירה מוצלחת של כל המערכות, עמידה ב-SLAs, אישור אבטחת מידע.",
    paymentMilestones: "15% בעת חתימה, 25% עם השלמת תכנון, 40% לפי אבני הגירה, 20% עם יציאה לאוויר.",
  },
  "7": {
    businessProblem: "הטמעת מערכות חדשות נתקלת בהתנגדות ובקושי אצל המשתמשים. חסרים חומרי הדרכה מתאימים, ולא קיים תהליך הטמעה מסודר.",
    existingSystems: "מערכת ממשלתית חדשה או מעודכנת, חומרי הדרכה קיימים (אם יש).",
    mainGaps: "היעדר חומרי הדרכה מותאמים, לא קיים מנגנון תמיכה, שיעור אימוץ נמוך של המערכת.",
    archNotes: "יש לוודא גישה למערכת לצורך בניית חומרי ההדרכה. יש לבחון שילוב עם LMS קיים.",
    general: "פרויקט לפיתוח חומרי הדרכה והטמעת מערכת. הפרויקט כולל לימוד המערכת, פיתוח מערכי שיעור, בניית חומרי הדרכה ועריכת הדרכות.",
    expectedBenefits: "שיפור אימוץ המערכת, הפחתת פניות לתמיכה, עצמאות משתמשים, תיעוד ידע ארגוני.",
    targetAudience: "עובדי המשרד, מנהלים, Train the Trainers.",
    technicalCharacteristics: "חומרי הדרכה בפורמטים מגוונים (PDF, וידאו, לומדה), תאימות עם LMS, נגישות.",
    kpis: "שיעור השלמת הדרכות, ציון מבדקי ידע, שיעור ירידה בפניות לתמיכה.",
    successCriteria: "חומרי הדרכה מאושרים, כלל העובדים עברו הדרכה, מדדי ידע חיוביים.",
    paymentMilestones: "20% בעת חתימה, 40% עם אישור חומרי ההדרכה, 40% עם השלמת ביצוע ההדרכות.",
  },
  "8": {
    businessProblem: "המשרד זקוק לפיתוח מערכת ממוחשבת חדשה לתמיכה בתהליכים עסקיים קריטיים. המערכת הנוכחית אינה עונה על הצרכים ומגבילה את יכולת הפעולה.",
    existingSystems: "מערכות קיימות שעמן נדרשת אינטגרציה, מסדי נתונים, APIs ממשלתיים.",
    mainGaps: "חסרות פונקציונליות קריטיות, קושי בתחזוקה, ביצועים נמוכים, חוסר בממשק משתמש ידידותי.",
    archNotes: "יש להגדיר ארכיטקטורת Client-Server / Web, תשתית שרתים, מדיניות אבטחת מידע.",
    general: "פרויקט לניתוח ופיתוח מערכת ממוחשבת. הפרויקט כולל ניתוח דרישות, אפיון, פיתוח, בדיקות והטמעה.",
    expectedBenefits: "אוטומציה של תהליכים, שיפור ביצועים, הפחתת שגיאות אנוש, ממשק משתמש משופר.",
    targetAudience: "עובדי המשרד, מנהלים, אזרחים (בהתאם לסוג המערכת).",
    technicalCharacteristics: "ארכיטקטורת Web/API, אבטחת מידע ברמה ממשלתית, נגישות WCAG 2.1, ביצועים גבוהים.",
    kpis: "זמן תגובה מערכת, שיעור שגיאות, זמינות מערכת (SLA), שביעות רצון משתמשים.",
    successCriteria: "בדיקות קבלה מוצלחות, עמידה בכל דרישות האפיון, אישור ועדת היגוי.",
    paymentMilestones: "15% בעת חתימה, 20% עם אישור אפיון, 35% עם השלמת פיתוח, 20% לאחר בדיקות, 10% לאחר יציאה לאוויר.",
  },
  "9": {
    businessProblem: "בסיסי הנתונים הקיימים אינם עונים על דרישות הביצועים, אינם מתאימים לעומסי עבודה עתידיים, ועלות התחזוקה גבוהה.",
    existingSystems: "Oracle / SQL Server קיים, אפליקציות תלויות, נתונים עסקיים קריטיים.",
    mainGaps: "ביצועים נמוכים, עלויות רישוי גבוהות, תאימות מוגבלת עם טכנולוגיות חדשות.",
    archNotes: "יש לבחון ארכיטקטורת בסיס נתונים יעד, תכנון מיגרציה, גיבויים ושחזור.",
    general: "פרויקט לשדרוג / הסבת בסיסי נתונים. הפרויקט כולל תכנון מפורט, ביצוע הסבה, בדיקות מסירה ותפעול.",
    expectedBenefits: "שיפור ביצועים, הפחתת עלויות רישוי, שדרוג אבטחה, תאימות עם פלטפורמות ענן.",
    targetAudience: "צוות DBA, מפתחים, מנהלי IT.",
    technicalCharacteristics: "SQL Server / NoSQL יעד, שכבת Migration, כלי בדיקות ביצועים, תכנון Disaster Recovery.",
    kpis: "זמן שאילתה ממוצע, uptime מסד נתונים, עלות לעסקה, זמן שחזור מגיבוי.",
    successCriteria: "הסבה מוצלחת ללא אובדן נתונים, עמידה ב-SLAs, אישור DBA ראשי.",
    paymentMilestones: "20% בעת חתימה, 30% עם השלמת תכנון, 35% לאחר ביצוע הסבה ובדיקות, 15% לאחר יציאה לאוויר.",
  },
  "10": {
    businessProblem: "קיים אתגר ייחודי שאין לו פתרון טכנולוגי מוכן. נדרש פתרון חדשני שיטפל בבעיה בצורה יצירתית ויעילה.",
    existingSystems: "מערכות קיימות ותהליכים עסקיים רלוונטיים.",
    mainGaps: "היעדר פתרון מוכן, צורך בחדשנות ובגישה יצירתית לפתרון הבעיה.",
    archNotes: "הארכיטקטורה תיקבע בהתאם לפתרון שיוצע על ידי הספק.",
    general: "פרויקט חדשנות טכנולוגית לפתרון אתגר ייחודי. הספק מוזמן להציע פתרון יצירתי המבוסס על טכנולוגיות חדשניות.",
    expectedBenefits: "פתרון אפקטיבי לאתגר הקיים, שיפור תהליכים, יצירת יתרון תחרותי טכנולוגי.",
    targetAudience: "יוגדר בהתאם לפתרון המוצע.",
    technicalCharacteristics: "ייקבע בהתאם לפתרון המוצע — פתוח לגישות חדשניות כולל AI, IoT, Blockchain וכדומה.",
    kpis: "ייקבעו בהתאם לפתרון המוצע ולמדדי ההצלחה שיוגדרו.",
    successCriteria: "הצגת POC מוצלח, אישור הגורם המזמין, עמידה בדרישות ביצוע מוגדרות.",
    paymentMilestones: "15% בעת חתימה, 35% עם אישור POC, 35% עם השלמת יישום, 15% עם מסירה סופית.",
  },
  "11": {
    businessProblem: "קיימים חשש וסיכונים לאבטחת מידע במערכות וברשתות הארגוניות. נדרשת הערכה מקיפה של רמת האבטחה וגילוי פרצות אפשריות.",
    existingSystems: "מערכות מידע, שרתי ווב, APIs, תשתיות רשת, אפליקציות מובייל.",
    mainGaps: "פרצות אבטחה לא מוכרות, חוסר ב-penetration testing שיטתי, אי-עמידה ברגולציה.",
    archNotes: "יש להסדיר הסכמי NDA ורשאויות גישה מלאות לפני תחילת הבדיקות.",
    general: "פרויקט בדיקות חדירות (Penetration Testing) מקיף. הפרויקט כולל מיפוי תשתיות, סריקת פגיעויות, בדיקה ידנית ומסמכי ממצאים.",
    expectedBenefits: "גילוי וסגירת פרצות אבטחה, שיפור עמידה ברגולציה, הפחתת סיכוני סייבר.",
    targetAudience: "צוות אבטחת מידע, מנהלי IT, CISO.",
    technicalCharacteristics: "כלי סריקה: Nessus/Nmap/Metasploit/Burp Suite, OWASP Top 10, עבודה בסביבת Staging.",
    kpis: "מספר פגיעויות שנמצאו וטופלו, זמן גילוי פגיעות, ציון אבטחה כולל.",
    successCriteria: "דוח PT מפורט עם PoC לפגיעויות קריטיות, בדיקה חוזרת מוצלחת לאחר תיקון.",
    paymentMilestones: "30% בעת חתימה, 40% עם מסירת דוח ראשוני, 30% לאחר בדיקה חוזרת ומסירת דוח סופי.",
  },
  "12": {
    businessProblem: "נדרשת אינטגרציה של פתרון תוכנה צד שלישי לסביבת הענן הארגונית. הפתרון הקיים אינו מותאם לסביבת הענן ואינו עומד בדרישות האבטחה.",
    existingSystems: "פתרון צד שלישי קיים, סביבת ענן AWS קיימת, מערכות ארגוניות.",
    mainGaps: "חוסר באינטגרציה לענן, אי-עמידה בדרישות אבטחה ממשלתיות, קושי בניהול גרסאות.",
    archNotes: "נדרשת ארכיטקטורת AWS מאושרת, הגדרת VPC, IAM roles, ומדיניות אבטחה.",
    general: "פרויקט לאינטגרציה של פתרון צד שלישי לסביבת ענן AWS. הפרויקט כולל תכנון ארכיטקטורה, הקמת סביבות, אינטגרציה ובדיקות.",
    expectedBenefits: "פעולה תקינה של הפתרון בענן, עמידה בדרישות אבטחה, שיפור זמינות וביצועים.",
    targetAudience: "צוותי IT ופיתוח, משתמשי קצה של הפתרון.",
    technicalCharacteristics: "AWS services (EC2, S3, RDS, IAM), Terraform/CloudFormation, ניטור CloudWatch, אבטחה לפי מדיניות ממשלתית.",
    kpis: "זמן uptime, זמן תגובה, מספר אירועי אבטחה, עלות תפעול ענן.",
    successCriteria: "אינטגרציה מוצלחת, אישור ועדת אבטחת מידע, עמידה ב-SLAs.",
    paymentMilestones: "20% בעת חתימה, 30% עם אישור ארכיטקטורה, 30% עם השלמת הקמה ואינטגרציה, 20% לאחר בדיקות ומסירה.",
  },
}

export function getBriefTemplate(cluster: Cluster, spec: Specialization): Partial<WizardState> {
  const base = CLUSTER_TEMPLATES[cluster.id] ?? CLUSTER_TEMPLATES["8"]
  const deliverables: DeliverableRow[] = spec.activities.flatMap(activity =>
    activity.deliverables.map(d => ({
      id: d.id,
      name: d.name,
      selected: d.required === "mandatory" || d.required === "recommended",
      quantity: 1,
      notes: d.required === "optional" ? "אופציונלי" : "",
    }))
  )
  const workPackages: WorkPackageRow[] = spec.activities.map(activity => ({
    id: activity.id,
    name: activity.name,
    size: "medium" as const,
    description: "",
    quantity: 1,
  }))
  const requestedDeliverables = spec.activities
    .map((a, i) => String(i + 1) + ". " + a.name).join("\n")
  return {
    currentSituation: {
      businessProblem: base.businessProblem + (spec.description ? ("\n\n" + spec.description) : ""),
      existingSystems: base.existingSystems,
      infrastructure: "",
      dataVolumes: "",
      mainGaps: base.mainGaps,
    },
    existingArchitecture: {
      cloudProvider: "",
      techStack: "",
      databases: "",
      externalInterfaces: "",
      notes: base.archNotes,
    },
    projectDescription: {
      general: base.general,
      requestedDeliverables,
      technicalCharacteristics: base.technicalCharacteristics,
      expectedBenefits: base.expectedBenefits,
      targetAudience: base.targetAudience,
      usersCount: "",
    },
    deliverables,
    workPackages,
    goals: {
      kpis: base.kpis,
      successCriteria: base.successCriteria,
      evaluationWeights: { vendorQuality: 20, proposalQuality: 50, price: 30 },
      budgetEstimateNIS: 0,
      paymentMilestones: base.paymentMilestones,
    },
  }
}
