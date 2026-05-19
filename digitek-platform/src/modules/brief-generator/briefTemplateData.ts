import type { TemplateDeliverable, TemplateShush, TimelinePhase } from "./types"

// ─── AI/ML (cluster 8 / specialization 8.16) — from official PDF template ───

const AIML_DELIVERABLES: TemplateDeliverable[] = [
  {
    id: "aiml-brd",
    name: "אפיון עסקי (BRD)",
    description: "קיום סדנאות אפיון מול גורמים עסקיים בארגון להגדרת מטרות הפרויקט. התפוקה תכלול מסמך אפיון עסקי המפרט את הצרכים העסקיים, תרחישי השימוש (Use Cases), הגדרת מדדי הצלחה (KPIs) וערך (ROI), מיפוי קהל היעד והמשתמשים, והגדרת החוקיות העסקית הנדרשת ממאגרי הנתונים והמודלים כדי לתמוך בהחלטות הארגון.",
    selected: true,
  },
  {
    id: "aiml-logical",
    name: "אפיון לוגי (Logical Design)",
    description: "תרגום הדרישות העסקיות למודל נתונים מושגי. התפוקה תכלול יצירת תרשימי ישויות-קשרים (ERD), מיפוי תהליכי זרימת המידע (Data Flow), הגדרת אובייקטים וטבלאות מרכזיות, סיווג רגישות הנתונים (כולל זיהוי מידע פרטי/PII), וקביעת חוקי טיוב נתונים (Data Quality Rules). שלב זה אינו תלוי בטכנולוגיה הסופית.",
    selected: true,
  },
  {
    id: "aiml-physical",
    name: "אפיון פיזי (STT) ואלגוריתמיקה",
    description: `כתיבת מסמך עיצוב טכני מפורט (HLD/LLD):
בעולמות הדאטה: יצירת מסמכי Source-to-Target (STT) הכוללים מיפוי טבלאות ושדות ברמת העמודה (Data Types), אילוצים, ולוגיקת הטרנספורמציה (ETL) הנדרשת למעבר הנתונים.
בעולמות ה-AI/ML: ביצוע מחקר נתונים (EDA), בחירת ארכיטקטורת האלגוריתמים, תכנון תהליך "הנדסת מאפיינים" (Feature Engineering), והגדרת אסטרטגיית אימון ובדיקות למודל.
אפיון: מאגר שאלות ותשובות, מבנה הנתונים עבור הצ'אט בוט, תשתית הנדסית — אימון ה-LLM, הנדסת הפרומפט.`,
    selected: true,
  },
  {
    id: "aiml-dwh-etl",
    name: "הקמת תשתית DWH ועיבודי ETL",
    description: `פיתוח מודל נתונים, תהליכי עיבוד (ETL/ELT) וטיוב מנתוני מקור ליעד.
• קטן: מודל הכולל 1 עד 10 טבלאות/ישויות מרכזיות
• בינוני: מודל הכולל 11 עד 20 טבלאות/ישויות מרכזיות
• גדול: מודל מורכב הכולל 21 עד 40 טבלאות/ישויות מרכזיות`,
    selected: false,
    sizeCategory: "medium",
  },
  {
    id: "aiml-datalake",
    name: "הקמת תשתית Data Lake (אגם נתונים)",
    description: `פיתוח צינורות מידע וקליטת נתונים (מובנים ולא מובנים) לאגם נתונים.
• קטן: קליטה מ-1 עד 5 מקורות מידע שונים
• בינוני: קליטה מ-6 עד 15 מקורות מידע שונים
• גדול: קליטה מ-16 עד 30 מקורות מידע, כולל עיבוד נתונים לא מובנים`,
    selected: false,
    sizeCategory: "medium",
  },
  {
    id: "aiml-mlops",
    name: "הקמת תשתית MLOps וסביבות",
    description: `הקמת סביבות (פיתוח, בדיקות, ייצור) ואוטומציה של פריסת מודלים (CI/CD) וניטור.
• קטן/פשוט: אוטומציה ופריסה של 1 עד 2 תהליכים/מודלים
• בינוני: ניהול ואוטומציה של 3 עד 5 תהליכים/מודלים
• גדול: תהליכים מורכבים עבור 6 עד 10 מודלים, כולל ניטור אוטומטי של דעיכת מודלים`,
    selected: false,
    sizeCategory: "small",
  },
  {
    id: "aiml-models",
    name: "פיתוח ואימון מודלים (ML/DL)",
    description: `פיתוח, אימון וכוונון המודל בפועל בהתאם למורכבות (ML קלאסי או למידה עמוקה/NLP).
התוצר הסופי למסירה: קוד המודל המאומן, קוד פריסה (Inference) ודו"ח דיוק וביצועים (כגון Accuracy/F1 Score).
הפיתוח יכלול: פיתוח מאגר שאלות ותשובות, מבנה הנתונים עבור הצ'אט בוט, תשתית הנדסית — אימון ה-LLM, הנדסת הפרומפט.
• קטן: פיתוח של 1 עד 3 מודלים פשוטים.
• בינוני: פיתוח של 4 עד 7 מודלים בינוניים.
• גדול: פיתוח של 8 עד 12 מודלים מורכבים.`,
    selected: true,
    sizeCategory: "medium",
  },
  {
    id: "aiml-genai-rag",
    name: "מערכת בינה מלאכותית יוצרת (GenAI ו-RAG)",
    description: `הקמת בוט מבוסס LLM וארכיטקטורת RAG (כולל וקטוריזציה).
• קטן: עיבוד ושליפה מתוך טווח של 1 עד 100 מסמכים/קבצים
• בינוני: מערכת RAG עבור טווח של 101 עד 500 מסמכים
• גדול: בנייה מורכבת מול 501 עד 1,200 מסמכים ממקורות שונים, לרבות התאמה עדינה (Fine-tuning) למודל`,
    selected: false,
    sizeCategory: "medium",
  },
  {
    id: "aiml-ui",
    name: "פיתוח ממשק משתמש (UI/UX) — קוד פתוח",
    description: `פיתוח מסכים רספונסיביים בכלים כגון: React, לרבות מסכי ניהול מערכת, משתמשים ומסכי פעולה אקטיביים מול המודל.
• קטן: פיתוח של 1 עד 5 מסכים
• בינוני: פיתוח של 6 עד 15 מסכים
• גדול: פיתוח של 16 עד 25 מסכים`,
    selected: false,
    sizeCategory: "small",
  },
  {
    id: "aiml-bi",
    name: "פיתוח כלי BI, דשבורדים ומדדים",
    description: `פיתוח מסכי דשבורדים ניהוליים באמצעות כלי BI (כגון: LOOKER, Quicksight/Qlik/Tableau), הכוללים הצגת תוצרי אלגוריתמיקה, מעקב אחר מדדים, KPIs ומסכי שימוש.
• קטן: הגדרה של 1 עד 3 דשבורדים עסקיים
• בינוני: הגדרה של 4 עד 7 דשבורדים עסקיים
• גדול: הגדרה של 8 עד 15 דשבורדים עסקיים`,
    selected: false,
    sizeCategory: "small",
  },
  {
    id: "aiml-ttt",
    name: "הכשרת TTT, הטמעה ותיעוד",
    description: `העברת הכשרות מקיפות לצוות הארגון, הכוללות:
• הדרכה מבוססת פרופילים: סדנאות ייעודיות ל-2 עד 4 פרופילים (מנהלים, אנליסטים, משתמשי קצה)
• שימוש במילון נתונים: הדרכה על קטלוג הנתונים להבנת השדות ומקורם
• תרגול תרחישים: העברת סדנאות מעשיות המדמות תרחישים עסקיים מול נתוני אמת
• בקרת איכות (במידת הצורך): הכשרה לדיווח חריגות בנתונים
• פורטל ידע (במידת הצורך): הקמת מרכז ידע בשירות עצמי (סרטונים ומדריכים)`,
    selected: false,
  },
]

const AIML_SHUSH: TemplateShush[] = [
  {
    id: "shush-data-eng-s",
    contentArea: "הנדסת נתונים (DWH ו-Data Lake)",
    complexity: "קטן",
    quantitativeMetrics: "עד 3 טבלאות / מקור מידע 1",
    workDescription: "הוספת מקור נתונים פשוט או עדכון של 1-3 טבלאות במודל הנתונים הקיים, כולל התאמת תהליך ה-ETL",
    quantity: 0,
  },
  {
    id: "shush-data-eng-m",
    contentArea: "הנדסת נתונים (DWH ו-Data Lake)",
    complexity: "בינוני",
    quantitativeMetrics: "4-7 טבלאות / 2-3 מקורות",
    workDescription: "הוספת/שינוי 4-7 טבלאות מורכבות, או קליטת 2-3 מקורות מידע חדשים לאגם הנתונים (Data Lake)",
    quantity: 0,
  },
  {
    id: "shush-data-eng-l",
    contentArea: "הנדסת נתונים (DWH ו-Data Lake)",
    complexity: "מורכב",
    quantitativeMetrics: "8+ טבלאות / 4+ מקורות",
    workDescription: "שינוי ארכיטקטוני במודל הנתונים הלוגי, הוספת שכבת נתונים חדשה או קליטת נתונים לא מובנים כבדים (וידאו/שמע)",
    quantity: 0,
  },
  {
    id: "shush-ml-s",
    contentArea: "למידת מכונה (ML/DL)",
    complexity: "קטן",
    quantitativeMetrics: "אימון מחדש / 1-3 מאפיינים",
    workDescription: "הוספת 1-3 מאפיינים (Features) חדשים למודל קיים, או ביצוע אימון מחדש (Retraining) על דאטה עדכני באותה ארכיטקטורה",
    quantity: 0,
  },
  {
    id: "shush-ml-m",
    contentArea: "למידת מכונה (ML/DL)",
    complexity: "בינוני",
    quantitativeMetrics: "כוונון / משתנה יעד 1",
    workDescription: "כוונון היפר-פרמטרים (Hyperparameter tuning) לשיפור דיוק, או הוספת חיזוי למשתנה יעד (Target Variable) חדש אך מבוסס על אותו דאטה",
    quantity: 0,
  },
  {
    id: "shush-ml-l",
    contentArea: "למידת מכונה (ML/DL)",
    complexity: "מורכב",
    quantitativeMetrics: "שינוי ארכיטקטורת מודל",
    workDescription: "שינוי מהותי בארכיטקטורת המודל (למשל מעבר מ-Random Forest לרשת נוירונים) לטובת פתרון בעיה עסקית קיימת",
    quantity: 0,
  },
  {
    id: "shush-genai-s",
    contentArea: "בינה מלאכותית יוצרת (GenAI/RAG)",
    complexity: "קטן",
    quantitativeMetrics: "עדכון Prompts / עד 50 קבצים",
    workDescription: "שינוי התנהגות או סגנון הבוט (System Prompt), או העשרת מאגר הידע (RAG) בעשרות בודדות של קבצים טקסטואליים",
    quantity: 0,
  },
  {
    id: "shush-genai-m",
    contentArea: "בינה מלאכותית יוצרת (GenAI/RAG)",
    complexity: "בינוני",
    quantitativeMetrics: "הרחבת RAG / API חיצוני 1",
    workDescription: "הרחבת מאגר ה-RAG בפורמטים שונים, או חיבור מודל השפה לכלי עזר / API חיצוני אחד",
    quantity: 0,
  },
  {
    id: "shush-genai-l",
    contentArea: "בינה מלאכותית יוצרת (GenAI/RAG)",
    complexity: "מורכב",
    quantitativeMetrics: "Fine-Tuning / החלפת מודל",
    workDescription: "ביצוע התאמה עדינה (Fine-tuning) למודל שפה קיים, או שדרוג והחלפת מודל הבסיס (Foundation Model) במודל מתקדם יותר והתאמת כלל המערכת",
    quantity: 0,
  },
  {
    id: "shush-mlops-s",
    contentArea: "MLOps",
    complexity: "פשוט-בינוני",
    quantitativeMetrics: "1 Pipeline / עד 3 מדדים",
    workDescription: "הוספת פייפליין CI/CD למודל, או הוספת חוקים ומדדים אוטומטיים לניטור דעיכת מודלים (Model Drift) וטיב נתונים בסביבת הייצור",
    quantity: 0,
  },
  {
    id: "shush-ui-s",
    contentArea: "ממשק משתמש (UI) ודשבורדים (BI)",
    complexity: "פשוט",
    quantitativeMetrics: "1-2 מסכים / 1 דשבורד BI",
    workDescription: "הוספת עד 2 מסכים באפליקציה (React), או יצירת דשבורד אחד (BI) הכולל עד 4 גרפים להצגת תוצרי המודלים",
    quantity: 0,
  },
  {
    id: "shush-ui-m",
    contentArea: "ממשק משתמש (UI) ודשבורדים (BI)",
    complexity: "בינוני",
    quantitativeMetrics: "3-5 מסכים / 2-3 דשבורדים",
    workDescription: "פיתוח תהליך ממשקי הכולל 3-5 מסכים, או בניית 2-3 דשבורדים חדשים המשלבים מספר מקורות נתונים",
    quantity: 0,
  },
  {
    id: "shush-ui-l",
    contentArea: "ממשק משתמש (UI) ודשבורדים (BI)",
    complexity: "מורכב",
    quantitativeMetrics: "6+ מסכים / 4+ דשבורדים",
    workDescription: "פיתוח מודול אפליקטיבי שלם וחדש למשתמשים, או הקמת מערך ניהול BI רחב",
    quantity: 0,
  },
]

// ─── Generic cluster deliverables in template format ───

const CLUSTER_1_DELIVERABLES: TemplateDeliverable[] = [
  { id: "cx-research", name: "מחקר משתמשים ופרסונות", description: "ביצוע מחקר משתמשים, ראיונות עומק, סקרים ומיפוי פרסונות — יצירת מסמך פרסונות מפורט המתאר את קהלי היעד.", selected: true },
  { id: "cx-journey", name: "מסעות לקוח קיימים ועתידיים", description: "מיפוי מסעות לקוח (Customer Journey Maps) למצב הקיים והרצוי, כולל נקודות מגע, כאבים והזדמנויות.", selected: true },
  { id: "ux-wireframes", name: "Wireframes ואפיון פונקציונלי", description: "יצירת Wireframes לכלל המסכים, כולל אפיון פונקציונלי מפורט של כל תהליך ומסך.", selected: false },
  { id: "ux-userflow", name: "תרשימי User Flow", description: "תרשימי זרימת משתמש המתארים את מסלולי הניווט והאינטראקציה במערכת.", selected: false },
  { id: "ui-design", name: "עיצוב מלא של מסכים", description: "עיצוב Visual Design מלא לכל המסכים בהתאם לאפיון ולשפה העיצובית.", selected: false },
  { id: "ui-styleguide", name: "Style Guide ושפה עיצובית", description: "יצירת מסמך שפה עיצובית (Design System) כולל רכיבים, צבעים, טיפוגרפיה ודפוסי עיצוב.", selected: false },
  { id: "usab-test", name: "בדיקת שימושיות עם משתמשים", description: "ביצוע בדיקות שימושיות (Usability Testing) מול משתמשי אמת, כולל תסריטי בדיקה, ניתוח ממצאים והמלצות.", selected: false },
  { id: "brand", name: "אסטרטגיית מותג ומעטפת ויזואלית", description: "בניית אסטרטגיית מיתוג דיגיטלי כוללת: לוגו, זהות ויזואלית, טון דיבור ומעטפת גרפית.", selected: false },
]

const CLUSTER_5_DELIVERABLES: TemplateDeliverable[] = [
  { id: "data-strategy", name: "מסמך אסטרטגיית דאטה", description: "מסמך אסטרטגיה הכולל חזון דאטה ארגוני, מיפוי מקורות מידע, תעדוף יוזמות ומפת דרכים.", selected: true },
  { id: "data-arch", name: "ארכיטקטורת נתונים", description: "תכנון ארכיטקטורת נתונים כולל: מודל לוגי ופיזי, שכבות עיבוד, Data Flow ותרשימי ERD.", selected: true },
  { id: "data-quality", name: "תוכנית הבטחת איכות נתונים", description: "מסמך Data Quality הכולל: חוקי טיוב, מדדי איכות, תהליכי ניטור ואכיפה.", selected: false },
  { id: "etl-pipelines", name: "צינורות ETL", description: "פיתוח תהליכי ETL/ELT לקליטה, טרנספורמציה וטעינת נתונים ממקורות שונים.", selected: false },
  { id: "bi-dashboards", name: "דשבורדים אנליטיים", description: "פיתוח דשבורדים ניהוליים ואנליטיים בכלי BI, כולל גרפים, KPIs ומסכי drill-down.", selected: false },
  { id: "data-catalog", name: "קטלוג נתונים", description: "הקמת קטלוג נתונים (Data Catalog) הכולל תיאור ישויות, שדות, מקורות ומיפוי PII.", selected: false },
  { id: "ai-analytics", name: "מודלים אנליטיים", description: "פיתוח מודלים סטטיסטיים ואנליטיים לחיזוי, סיווג או אופטימיזציה עסקית.", selected: false },
  { id: "training-data", name: "הדרכה לצוות הדאטה", description: "העברת הכשרות לצוות הארגוני על כלי הדאטה, שימוש בדשבורדים ותהליכי עבודה.", selected: false },
]

const CLUSTER_6_DELIVERABLES: TemplateDeliverable[] = [
  { id: "cloud-readiness", name: "הערכת מוכנות למעבר לענן", description: "ביצוע הערכת מוכנות (Cloud Readiness Assessment) הכוללת מיפוי מערכות, סיכונים, עלויות והמלצות.", selected: true },
  { id: "migration-plan", name: "תוכנית הגירה מפורטת", description: "מסמך תכנון הגירה מפורט הכולל: שלבים, לוחות זמנים, סיכונים, תלויות וקריטריוני הצלחה.", selected: true },
  { id: "cloud-setup", name: "הקמת סביבת ענן", description: "הקמת חשבונות ענן, VPC, שירותי אבטחה, IAM, ותצורת רשת בהתאם לארכיטקטורה.", selected: false },
  { id: "cicd", name: "תשתית CI-CD", description: "הקמת תשתית CI/CD כולל: pipelines לבנייה, בדיקות ופריסה אוטומטית.", selected: false },
  { id: "iac", name: "Infrastructure as Code", description: "כתיבת קוד תשתית (Terraform/CloudFormation) לניהול ופריסת משאבי ענן.", selected: false },
  { id: "ha-dr", name: "פתרון HA-DR", description: "תכנון ומימוש פתרונות זמינות גבוהה (HA) והתאוששות מאסון (DR).", selected: false },
  { id: "finops", name: "אופטימיזציה פיננסית FinOps", description: "ניתוח עלויות ענן, המלצות לחיסכון, הגדרת תקציבים והתראות.", selected: false },
  { id: "load-tests", name: "בדיקות עומסים", description: "תכנון וביצוע בדיקות עומס וביצועים בסביבת הענן.", selected: false },
]

const CLUSTER_7_DELIVERABLES: TemplateDeliverable[] = [
  { id: "training-plan", name: "תוכנית הדרכה מפורטת", description: "מסמך תכנון הדרכה הכולל: קהלי יעד, תכנים, לוחות זמנים, שיטות הדרכה ומדדי הצלחה.", selected: true },
  { id: "training-mat", name: "חומרי הדרכה", description: "פיתוח חומרי הדרכה: מצגות, מדריכים כתובים, כרטיסי עזר ותרגילים.", selected: true },
  { id: "training-videos", name: "סרטוני הדרכה", description: "הפקת סרטוני הדרכה (לומדות) ייעודיים למערכת.", selected: false },
  { id: "training-class", name: "הדרכות פרונטליות", description: "הדרכות פרונטליות (כיתות/Webinar) לקבוצות משתמשים.", selected: false },
  { id: "ttt", name: "תוכנית TTT הכשרת מדריכים", description: "העברת הכשרת Train-the-Trainer למדריכים פנימיים בארגון.", selected: false },
  { id: "embed-support", name: "ליווי הטמעה", description: "ליווי הטמעה אישי ורוחבי בשטח — סיוע למשתמשים בתקופת ההרצה.", selected: false },
  { id: "knowledge-base", name: "מאגר ידע", description: "הקמת מרכז ידע בשירות עצמי (פורטל ידע, FAQ, סרטונים ומדריכים).", selected: false },
]

const CLUSTER_8_DELIVERABLES: TemplateDeliverable[] = [
  { id: "sys-analysis", name: "מסמך ניתוח מערכות", description: "ניתוח מערכת מעמיק הכולל: מיפוי תהליכים, דרישות פונקציונליות ולא-פונקציונליות, ישויות ומערכות משיקות.", selected: true },
  { id: "tech-spec", name: "מסמך אפיון טכני מפורט", description: "מסמך אפיון טכני (SRS/STD) הכולל: מסכים, שדות, ולידציות, תהליכי זרימה וממשקים.", selected: true },
  { id: "architecture", name: "ארכיטקטורת הפתרון", description: "מסמך ארכיטקטורה כולל: דיאגרמות רכיבים, שכבות, טכנולוגיות, אינטגרציות ואבטחת מידע.", selected: true },
  { id: "dev-system", name: "פיתוח המערכת", description: "פיתוח המערכת בהתאם לאפיון: קוד מקור, בסיסי נתונים, ממשקים ואינטגרציות.", selected: true },
  { id: "test-docs", name: "תסריטי בדיקות", description: "כתיבת תסריטי בדיקות מסירה וקבלה, כולל תרחישי קצה וסבבי רגרסיה.", selected: true },
  { id: "source-code", name: "קוד מקור ותיעוד טכני", description: "מסירת קוד מקור מלא בניהול גרסאות, כולל תיעוד טכני מפורט.", selected: true },
  { id: "user-manual", name: "מדריך למשתמש", description: "מדריך למשתמש הקצה הכולל: הסברים, צילומי מסך ותרחישי שימוש.", selected: false },
  { id: "ttt-dev", name: "הדרכת TTT לצוות", description: "העברת הכשרת Train-the-Trainer לצוות הטכני בארגון.", selected: false },
  { id: "data-migration", name: "הסבת נתונים", description: "תכנון וביצוע הסבת נתונים ממערכות קודמות, כולל מיפוי, טיוב וולידציה.", selected: false },
]

const CLUSTER_11_DELIVERABLES: TemplateDeliverable[] = [
  { id: "pt-infra", name: "בדיקת חדירות תשתיתית", description: "ביצוע בדיקת חדירות לתשתיות הרשת, השרתים ורכיבי התקשורת.", selected: true },
  { id: "pt-app", name: "בדיקת חדירות אפליקטיבית", description: "ביצוע בדיקת חדירות לאפליקציה כולל: OWASP Top 10, הזרקות, XSS, CSRF ועוד.", selected: false },
  { id: "code-review", name: "סקר קוד", description: "ביצוע סקר קוד סטטי ודינמי (Static/Dynamic Analysis), כולל זיהוי חולשות ופגיעויות.", selected: false },
  { id: "pt-report", name: "דוח בדיקות וממצאים", description: "דוח מפורט הכולל: ממצאים, רמות חומרה, הוכחות (PoC), והמלצות לתיקון.", selected: true },
  { id: "remediation", name: "בדיקה חוזרת לאחר תיקון", description: "ביצוע בדיקת רגרסיה/retesting לאחר תיקון הממצאים — אישור שכל הליקויים טופלו.", selected: true },
  { id: "exec-summary", name: "דוח מסכם לניהול", description: "דוח ניהולי מסכם (Executive Summary) עם ציון כולל, סיכום מגמות והמלצות אסטרטגיות.", selected: false },
]

// ─── Generic cluster שו"שים in template format ───

const CLUSTER_1_SHUSH: TemplateShush[] = [
  { id: "shush-cx", contentArea: "תכנון חוויית לקוח CX", complexity: "קבוע", quantitativeMetrics: "מחקר + פרסונות + מסעות", workDescription: "מחקר, פרסונות, מסעות לקוח", quantity: 0 },
  { id: "shush-ux", contentArea: "אפיון חוויית משתמש UX", complexity: "קבוע", quantitativeMetrics: "Wireframes + User Flows", workDescription: "Wireframes, User Flows, אפיון פונקציונלי", quantity: 0 },
  { id: "shush-ui", contentArea: "עיצוב ממשק משתמש UI", complexity: "קבוע", quantitativeMetrics: "עיצוב + Style Guide", workDescription: "Visual Design, Style Guide", quantity: 0 },
  { id: "shush-usab", contentArea: "בדיקת שימושיות", complexity: "קבוע", quantitativeMetrics: "בדיקת UX", workDescription: "User Testing, UX Review", quantity: 0 },
  { id: "shush-brand", contentArea: "מיתוג דיגיטלי", complexity: "קבוע", quantitativeMetrics: "אסטרטגיית מותג", workDescription: "Brand Strategy, Visual Identity", quantity: 0 },
]

const CLUSTER_5_SHUSH: TemplateShush[] = [
  { id: "shush-bi-l", contentArea: "דשבורד BI", complexity: "גדול", quantitativeMetrics: "6+ דשבורדים, 6 גרפים מורכבים, 6 APIs", workDescription: "פיתוח מערך BI מורכב עם מקורות נתונים מרובים", quantity: 0 },
  { id: "shush-bi-m", contentArea: "דשבורד BI", complexity: "בינוני", quantitativeMetrics: "5 דשבורדים, 8 גרפים, 3 APIs", workDescription: "פיתוח דשבורדים עם מספר מקורות נתונים", quantity: 0 },
  { id: "shush-bi-s", contentArea: "דשבורד BI", complexity: "קטן", quantitativeMetrics: "1 דשבורד, 8 גרפים פשוטים", workDescription: "פיתוח דשבורד בסיסי", quantity: 0 },
  { id: "shush-etl-l", contentArea: "מודל נתונים", complexity: "גדול", quantitativeMetrics: "6+ מקורות, 10-15 טבלאות", workDescription: "ETL מורכב עם Feature Store", quantity: 0 },
  { id: "shush-etl-m", contentArea: "מודל נתונים", complexity: "בינוני", quantitativeMetrics: "3 מקורות, 5-10 טבלאות", workDescription: "ETL עד 3 מקורות, Data Catalog", quantity: 0 },
  { id: "shush-etl-s", contentArea: "מודל נתונים", complexity: "קטן", quantitativeMetrics: "מקור יחיד", workDescription: "ETL ממקור יחיד", quantity: 0 },
  { id: "shush-ai-cx", contentArea: "אנליטיקה ו-AI", complexity: "מורכב", quantitativeMetrics: "5+ ישויות, לוגיקה מורכבת", workDescription: "מודלים אנליטיים מורכבים", quantity: 0 },
  { id: "shush-ai-sm", contentArea: "אנליטיקה ו-AI", complexity: "פשוט", quantitativeMetrics: "עד 5 ישויות", workDescription: "מודל אנליטי פשוט", quantity: 0 },
]

const CLUSTER_6_SHUSH: TemplateShush[] = [
  { id: "shush-cloud-adv", contentArea: "ייעוץ מעבר לענן", complexity: "קבוע", quantitativeMetrics: "הערכת מוכנות + ארכיטקטורה", workDescription: "הערכת מוכנות, המלצות ארכיטקטורה", quantity: 0 },
  { id: "shush-mig-l", contentArea: "הגירה ומודרניזציה", complexity: "גדול", quantitativeMetrics: "מעל 200,000 שח", workDescription: "הגירה מורכבת כולל מודרניזציה", quantity: 0 },
  { id: "shush-mig-s", contentArea: "הגירה ומודרניזציה", complexity: "קטן", quantitativeMetrics: "עד 200,000 שח", workDescription: "הגירה פשוטה", quantity: 0 },
  { id: "shush-cicd-l", contentArea: "CI-CD ו-XOps", complexity: "גדול", quantitativeMetrics: "מעל 200,000 שח", workDescription: "תשתית CI/CD מורכבת", quantity: 0 },
  { id: "shush-cicd-s", contentArea: "CI-CD ו-XOps", complexity: "קטן", quantitativeMetrics: "עד 200,000 שח", workDescription: "תשתית CI/CD בסיסית", quantity: 0 },
  { id: "shush-finops", contentArea: "FinOps", complexity: "קבוע", quantitativeMetrics: "ייעוץ + יישום", workDescription: "ייעוץ ויישום אופטימיזציה פיננסית", quantity: 0 },
  { id: "shush-load", contentArea: "בדיקות עומסים", complexity: "קבוע", quantitativeMetrics: "תכנון + ביצוע", workDescription: "תכנון וביצוע בדיקות עומס", quantity: 0 },
]

const CLUSTER_7_SHUSH: TemplateShush[] = [
  { id: "shush-train-dev", contentArea: "פיתוח מערכי הדרכה", complexity: "קבוע", quantitativeMetrics: "תכנית + תרגילים + מבדקים", workDescription: "פיתוח מערכי הדרכה מותאמים", quantity: 0 },
  { id: "shush-train-mat", contentArea: "הכנת חומרי הדרכה", complexity: "קבוע", quantitativeMetrics: "מצגות + סרטונים + לומדות", workDescription: "הכנת חומרי הדרכה ומולטימדיה", quantity: 0 },
  { id: "shush-train-cls", contentArea: "הדרכה פרונטלית", complexity: "קבוע", quantitativeMetrics: "כיתות מחשב + Webinar", workDescription: "הדרכות פרונטליות ומקוונות", quantity: 0 },
  { id: "shush-embed", contentArea: "הטמעה", complexity: "קבוע", quantitativeMetrics: "ליווי אישי ורוחבי", workDescription: "ליווי הטמעה בשטח", quantity: 0 },
]

const CLUSTER_8_SHUSH: TemplateShush[] = [
  { id: "shush-ds-cx", contentArea: "Design System", complexity: "מורכב", quantitativeMetrics: "6-12 מסכים, 41-100 שדות, 7-12 טבלאות", workDescription: "פיתוח מודול אפליקטיבי מורכב", quantity: 0 },
  { id: "shush-ds-md", contentArea: "Design System", complexity: "בינוני", quantitativeMetrics: "2-5 מסכים, 11-40 שדות, 3-6 טבלאות", workDescription: "פיתוח רכיב בינוני", quantity: 0 },
  { id: "shush-ds-sm", contentArea: "Design System", complexity: "פשוט", quantitativeMetrics: "1 מסך, 1-10 שדות, 1-2 טבלאות", workDescription: "פיתוח מסך פשוט", quantity: 0 },
  { id: "shush-flow-cx", contentArea: "קונטיינר תהליכי", complexity: "מורכב", quantitativeMetrics: "11-20 שלבים, 7-12 טבלאות", workDescription: "תהליך עסקי מורכב", quantity: 0 },
  { id: "shush-flow-md", contentArea: "קונטיינר תהליכי", complexity: "בינוני", quantitativeMetrics: "6-10 שלבים, 4-6 טבלאות", workDescription: "תהליך עסקי בינוני", quantity: 0 },
  { id: "shush-flow-sm", contentArea: "קונטיינר תהליכי", complexity: "פשוט", quantitativeMetrics: "עד 5 שלבים, 1-3 טבלאות", workDescription: "תהליך עסקי פשוט", quantity: 0 },
  { id: "shush-api-cx", contentArea: "API ואינטגרציה", complexity: "מורכב", quantitativeMetrics: "61-150 שדות, 6-10 טבלאות, Real-time", workDescription: "אינטגרציה מורכבת בזמן אמת", quantity: 0 },
  { id: "shush-api-md", contentArea: "API ואינטגרציה", complexity: "בינוני", quantitativeMetrics: "21-60 שדות, 3-5 טבלאות, Batch-Sync", workDescription: "אינטגרציה בינונית", quantity: 0 },
  { id: "shush-api-sm", contentArea: "API ואינטגרציה", complexity: "פשוט", quantitativeMetrics: "1-20 שדות, 1-2 טבלאות, REST GET", workDescription: "אינטגרציה פשוטה", quantity: 0 },
]

const CLUSTER_11_SHUSH: TemplateShush[] = [
  { id: "shush-pt-infra", contentArea: "בדיקת חדירות תשתיתית", complexity: "קבוע", quantitativeMetrics: "Penetration Test Infrastructure", workDescription: "בדיקת חדירות לתשתיות", quantity: 0 },
  { id: "shush-pt-app", contentArea: "בדיקת חדירות אפליקטיבית", complexity: "קבוע", quantitativeMetrics: "Penetration Test Application", workDescription: "בדיקת חדירות לאפליקציה", quantity: 0 },
  { id: "shush-cr", contentArea: "סקר קוד", complexity: "קבוע", quantitativeMetrics: "Static + Manual Review", workDescription: "סקר קוד סטטי ודינמי", quantity: 0 },
]

// ─── Lookup maps ───

const TEMPLATE_DELIVERABLES: Record<string, TemplateDeliverable[]> = {
  "1": CLUSTER_1_DELIVERABLES,
  "5": CLUSTER_5_DELIVERABLES,
  "6": CLUSTER_6_DELIVERABLES,
  "7": CLUSTER_7_DELIVERABLES,
  "8": CLUSTER_8_DELIVERABLES,
  "11": CLUSTER_11_DELIVERABLES,
  "8.16": AIML_DELIVERABLES,
}

const TEMPLATE_SHUSH: Record<string, TemplateShush[]> = {
  "1": CLUSTER_1_SHUSH,
  "5": CLUSTER_5_SHUSH,
  "6": CLUSTER_6_SHUSH,
  "7": CLUSTER_7_SHUSH,
  "8": CLUSTER_8_SHUSH,
  "11": CLUSTER_11_SHUSH,
  "8.16": AIML_SHUSH,
}

export function getTemplateDeliverables(clusterId: string, specId?: string): TemplateDeliverable[] {
  if (specId && TEMPLATE_DELIVERABLES[specId]) {
    return TEMPLATE_DELIVERABLES[specId].map(d => ({ ...d }))
  }
  return (TEMPLATE_DELIVERABLES[clusterId] ?? []).map(d => ({ ...d }))
}

export function getTemplateShush(clusterId: string, specId?: string): TemplateShush[] {
  if (specId && TEMPLATE_SHUSH[specId]) {
    return TEMPLATE_SHUSH[specId].map(s => ({ ...s }))
  }
  return (TEMPLATE_SHUSH[clusterId] ?? []).map(s => ({ ...s }))
}

// ─── Timeline defaults per the PDF template ───

export const TEMPLATE_TIMELINE_PHASES: TimelinePhase[] = [
  { id: "tp1", name: "שלב מקדים", startWeek: 1, durationWeeks: 2, keyDeliverable: "תכנית עבודה מפורטת", completionCriteria: "אישור תכנית עבודה" },
  { id: "tp2", name: "הקמת תשתיות ענן והשירותים הנדרשים", startWeek: 3, durationWeeks: 4, keyDeliverable: "חשבון ענן עם שירותים פעילים", completionCriteria: "אישור תשתיות" },
  { id: "tp3", name: "פיתוח End-to-End", startWeek: 7, durationWeeks: 15, keyDeliverable: "תוצרי פיתוח ואינטגרציה", completionCriteria: "סיום פיתוח ובדיקות מסירה" },
  { id: "tp4", name: "בדיקות ותיקונים", startWeek: 22, durationWeeks: 10, keyDeliverable: "תסריטי הבדיקות", completionCriteria: "אישור בדיקות קבלה" },
  { id: "tp5", name: "העברת ידע", startWeek: 32, durationWeeks: 2, keyDeliverable: "הדרכה מקצועית טכנית", completionCriteria: "אישור העברת ידע" },
  { id: "tp6", name: "העברה לייצור", startWeek: 34, durationWeeks: 2, keyDeliverable: "פרויקט מותקן ועובד בסביבת הייצור", completionCriteria: "עלייה לאוויר מוצלחת" },
  { id: "tp7", name: "מסירה", startWeek: 36, durationWeeks: 1, keyDeliverable: "השקת הפרויקט והצגה להנהלה", completionCriteria: "אישור מסירה" },
  { id: "tp8", name: "אחריות", startWeek: 37, durationWeeks: 52, keyDeliverable: "תיקון ליקויים ובאגים", completionCriteria: "סיום תקופת אחריות 12 חודשים" },
  { id: "tp9", name: "תחזוקה (אופציונלי)", startWeek: 89, durationWeeks: 26, keyDeliverable: "תיקון ליקויים ובאגים", completionCriteria: "סיום תקופת תחזוקה" },
]
