export interface Deliverable {
  id: string;
  name: string;
  required: 'mandatory' | 'recommended' | 'optional';
}

export interface Activity {
  id: string;
  name: string;
  deliverables: Deliverable[];
}

export interface Specialization {
  id: string;
  name: string;
  description: string;
  activities: Activity[];
  projectSizeThreshold: number;
  maintenanceAllowed: boolean;
  notes?: string;
}

export interface Cluster {
  id: string;
  name: string;
  type: 'digital' | 'tech';
  icon: string;
  specializations: Specialization[];
}

export const clusters: Cluster[] = [
  // ===================== DIGITAL CLUSTERS =====================

  {
    id: '1',
    name: 'עיצוב שירות',
    type: 'digital',
    icon: '🎨',
    specializations: [
      {
        id: '1.1',
        name: 'תכנון חוויית הלקוח (CX)',
        description: 'מחקר, ניתוח ועיצוב חוויית הלקוח המלאה עם ממשקים ממשלתיים',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '1.1.1', name: 'ניתוח מידע קיים', deliverables: [{ id: 'd1.1.1', name: 'מסמך מסכם', required: 'mandatory' }] },
          { id: '1.1.2', name: 'הגדרת מיקוד (Scope)', deliverables: [{ id: 'd1.1.2', name: 'תיעדוף קהלי יעד', required: 'mandatory' }] },
          { id: '1.1.3', name: 'מחקר משתמשים', deliverables: [{ id: 'd1.1.3', name: 'תרשים זרימה', required: 'mandatory' }] },
          { id: '1.1.4', name: 'מחקר השוואתי (בנצ\'מרק)', deliverables: [{ id: 'd1.1.4a', name: 'סיכום תובנות מחקר', required: 'mandatory' }, { id: 'd1.1.4b', name: 'מצגת בנצ\'מרק', required: 'mandatory' }] },
          { id: '1.1.5', name: 'גיבוש פרסונות', deliverables: [{ id: 'd1.1.5', name: 'פרסונות', required: 'mandatory' }] },
          { id: '1.1.6', name: 'מיפוי מסעות לקוח קיימים', deliverables: [{ id: 'd1.1.6', name: 'מסעות לקוח קיימים', required: 'mandatory' }] },
          { id: '1.1.7', name: 'גיבוש פתרונות ותעדוף', deliverables: [{ id: 'd1.1.7', name: 'Long list + Short list', required: 'mandatory' }] },
          { id: '1.1.8', name: 'גיבוש מסעות עתידיים', deliverables: [{ id: 'd1.1.8', name: 'מסעות עתידיים', required: 'mandatory' }] },
          { id: '1.1.9', name: 'גיבוש ארכיטקטורה קונספטואלית', deliverables: [{ id: 'd1.1.9', name: 'מסמך ארכיטקטורה ראשוני', required: 'mandatory' }] },
          { id: '1.1.10', name: 'המחשה ויזואלית', deliverables: [{ id: 'd1.1.10', name: 'מוק-אפ / Service blueprint', required: 'mandatory' }] },
        ],
      },
      {
        id: '1.2',
        name: 'אפיון חוויית משתמש (UX)',
        description: 'אפיון מלא של חוויית המשתמש כולל wireframes, user flows ותרחישי שימוש',
        projectSizeThreshold: 200000,
        maintenanceAllowed: true,
        activities: [
          { id: '1.2.1', name: 'מחקר מקדים', deliverables: [{ id: 'd1.2.1', name: 'מסמך מסכם', required: 'mandatory' }] },
          { id: '1.2.2', name: 'ניתוח קהלי יעד', deliverables: [{ id: 'd1.2.2', name: 'הגדרת קהלי יעד', required: 'mandatory' }] },
          { id: '1.2.3', name: 'גיבוש קונספט UX', deliverables: [{ id: 'd1.2.3', name: 'Wireframes', required: 'mandatory' }] },
          { id: '1.2.4', name: 'אפיון תרחישי שימוש (User flow)', deliverables: [{ id: 'd1.2.4', name: 'תרשים User flow', required: 'mandatory' }] },
          { id: '1.2.5', name: 'אפיון פונקציונלי מלא', deliverables: [{ id: 'd1.2.5', name: 'מפת מסכים + פירוט רכיבים + אפיון כתוב', required: 'mandatory' }] },
          { id: '1.2.6', name: 'הנחיות לבדיקות', deliverables: [{ id: 'd1.2.6', name: 'מסמך הנחיות לבדיקה', required: 'mandatory' }] },
          { id: '1.2.7', name: 'תחזוקה 5%', deliverables: [{ id: 'd1.2.7', name: 'עדכוני אפיון שוטפים', required: 'optional' }] },
        ],
      },
      {
        id: '1.3',
        name: 'עיצוב ממשק המשתמש (UI)',
        description: 'עיצוב גרפי מלא של ממשק המשתמש כולל style guide ושפה עיצובית',
        projectSizeThreshold: 200000,
        maintenanceAllowed: true,
        activities: [
          { id: '1.3.1', name: 'גיבוש קונספט גרפי', deliverables: [{ id: 'd1.3.1', name: 'המחשת קונספט', required: 'mandatory' }] },
          { id: '1.3.2', name: 'גיבוש קונספט שפה', deliverables: [{ id: 'd1.3.2', name: 'המחשת שפה', required: 'mandatory' }] },
          { id: '1.3.3', name: 'ניסוח מיקרו-קופי', deliverables: [{ id: 'd1.3.3', name: 'מסמך מיקרו-קופי', required: 'recommended' }] },
          { id: '1.3.4', name: 'עיצוב מלא של מסכים', deliverables: [{ id: 'd1.3.4', name: 'המחשת מסכים + הנחיות פונט + חיתוכים', required: 'mandatory' }] },
          { id: '1.3.5', name: 'גיבוש הנחיות (Style guide)', deliverables: [{ id: 'd1.3.5', name: 'Style guide', required: 'mandatory' }] },
          { id: '1.3.6', name: 'בניית מותג דיגיטלי', deliverables: [{ id: 'd1.3.6', name: 'מצגת מיני-ברנדינג', required: 'optional' }] },
          { id: '1.3.7', name: 'תחזוקה 5% (QA גרפי, עדכון חיתוכים)', deliverables: [{ id: 'd1.3.7', name: 'עדכוני עיצוב שוטפים', required: 'optional' }] },
        ],
      },
      {
        id: '1.4',
        name: 'מיתוג',
        description: 'בניית אסטרטגיית מותג דיגיטלי ומעטפת ויזואלית מלאה',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '1.4.1', name: 'בניית אסטרטגיית מותג', deliverables: [{ id: 'd1.4.1', name: 'מסמך אסטרטגיית מותג', required: 'mandatory' }] },
          { id: '1.4.2', name: 'יצירת מעטפת ויזואלית דיגיטלית', deliverables: [{ id: 'd1.4.2', name: 'מצגת ברנדינג (לוגו, קריאייטיב, טיפוגרפיה, צבעוניות)', required: 'mandatory' }] },
          { id: '1.4.3', name: 'השלמת מעטפת לפרינט', deliverables: [{ id: 'd1.4.3', name: 'המחשת נראות בפרינט', required: 'optional' }] },
        ],
      },
      {
        id: '1.5',
        name: 'בדיקת שמישות',
        description: 'בדיקות משתמשים ו-UX review לבחינת שמישות הממשק',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          {
            id: '1.5.1',
            name: 'בדיקת משתמשים (User testing) — הכנת שאלונים, גיוס, ביצוע, ניתוח',
            deliverables: [{ id: 'd1.5.1', name: 'מסמך מסכם עם תיעוד (שאלונים, פרטי נבדקים, תמלול/הקלטה)', required: 'mandatory' }],
          },
          {
            id: '1.5.2',
            name: 'סקירת ממשק (UX-review) כולל אנליטיקס',
            deliverables: [{ id: 'd1.5.2', name: 'דוח מומחה עם נקודות לשימור והצעות לשיפור', required: 'mandatory' }],
          },
        ],
      },
    ],
  },

  {
    id: '2',
    name: 'תוכן',
    type: 'digital',
    icon: '✍️',
    specializations: [
      {
        id: '2.1',
        name: 'הפקת תוכן טקסטואלי',
        description: 'פיתוח קונספט תוכן וכתיבה שיווקית, קופי ומיקרו-קופי',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '2.1.1', name: 'פיתוח קונספט תוכן', deliverables: [{ id: 'd2.1.1', name: 'מסמך אסטרטגיית תוכן + הדגמה', required: 'mandatory' }] },
          { id: '2.1.2', name: 'הפקת תוכן טקסטואלי (כתיבה שיווקית, קופי, מיקרו-קופי)', deliverables: [{ id: 'd2.1.2', name: 'קבצים עם התוכן בשפה מאושרת', required: 'mandatory' }] },
        ],
      },
      {
        id: '2.2',
        name: 'הפקת תוכן ויזואלי סטטי',
        description: 'עיצוב גרפי, עריכת תמונות, מצגות ואינפוגרפיקות',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '2.2.1', name: 'עיצוב גרפי', deliverables: [{ id: 'd2.2.1', name: 'קבצי עיצוב', required: 'mandatory' }] },
          { id: '2.2.2', name: 'עריכת תמונות', deliverables: [{ id: 'd2.2.2', name: 'קבצי תמונה מעובדים', required: 'recommended' }] },
          { id: '2.2.3', name: 'עריכת מצגות', deliverables: [{ id: 'd2.2.3', name: 'קובץ מצגת', required: 'recommended' }] },
          { id: '2.2.4', name: 'יצירת אינפוגרפיקות', deliverables: [{ id: 'd2.2.4', name: 'קבצי אינפוגרפיקה', required: 'optional' }] },
          { id: '2.2.5', name: 'יצירת איורים', deliverables: [{ id: 'd2.2.5', name: 'קבצי איור', required: 'optional' }] },
        ],
      },
      {
        id: '2.3',
        name: 'הפקת תוכן אודיו-ויזואלי',
        description: 'הפקת סרטונים, אנימציות, פודקאסטים ותרגום לשפת הסימנים',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'תסריט לסרטון לפרסום במדיה חברתית חייב אישור לשכה משפטית',
        activities: [
          { id: '2.3.1', name: 'הפקת סרטונים (תחקיר, תסריט, בימוי, צילום, עריכה, כתוביות)', deliverables: [{ id: 'd2.3.1', name: 'קובץ וידאו', required: 'mandatory' }] },
          { id: '2.3.2', name: 'הפקת אנימציות', deliverables: [{ id: 'd2.3.2', name: 'קובץ אנימציה', required: 'optional' }] },
          { id: '2.3.3', name: 'הפקת פודקאסטים', deliverables: [{ id: 'd2.3.3', name: 'קובץ קול', required: 'optional' }] },
          { id: '2.3.4', name: 'תרגום לשפת הסימנים', deliverables: [{ id: 'd2.3.4', name: 'קובץ וידאו עם תרגום מסונכרן לשפת הסימנים', required: 'optional' }] },
        ],
      },
      { id: '2.4', name: 'תרגום עברית-אנגלית', description: 'תרגום תוכן מעברית לאנגלית והטמעתו במוצר הדיגיטלי', projectSizeThreshold: 200000, maintenanceAllowed: false, activities: [{ id: '2.4.1', name: 'תרגום + הזנה למוצר הדיגיטלי ובדיקת איכות', deliverables: [{ id: 'd2.4.1', name: 'מסמך בשפה המבוקשת', required: 'mandatory' }, { id: 'd2.4.2', name: 'תוכן מתורגם מעודכן בתוך המוצר הדיגיטלי', required: 'mandatory' }] }] },
      { id: '2.5', name: 'תרגום עברית-ערבית', description: 'תרגום תוכן מעברית לערבית והטמעתו במוצר הדיגיטלי', projectSizeThreshold: 200000, maintenanceAllowed: false, activities: [{ id: '2.5.1', name: 'תרגום + הזנה למוצר הדיגיטלי ובדיקת איכות', deliverables: [{ id: 'd2.5.1', name: 'מסמך בשפה המבוקשת', required: 'mandatory' }, { id: 'd2.5.2', name: 'תוכן מתורגם מעודכן בתוך המוצר הדיגיטלי', required: 'mandatory' }] }] },
      { id: '2.6', name: 'תרגום עברית-צרפתית', description: 'תרגום תוכן מעברית לצרפתית', projectSizeThreshold: 200000, maintenanceAllowed: false, activities: [{ id: '2.6.1', name: 'תרגום + הזנה למוצר הדיגיטלי ובדיקת איכות', deliverables: [{ id: 'd2.6.1', name: 'מסמך בשפה המבוקשת', required: 'mandatory' }, { id: 'd2.6.2', name: 'תוכן מתורגם מעודכן בתוך המוצר הדיגיטלי', required: 'mandatory' }] }] },
      { id: '2.7', name: 'תרגום עברית-רוסית', description: 'תרגום תוכן מעברית לרוסית', projectSizeThreshold: 200000, maintenanceAllowed: false, activities: [{ id: '2.7.1', name: 'תרגום + הזנה למוצר הדיגיטלי ובדיקת איכות', deliverables: [{ id: 'd2.7.1', name: 'מסמך בשפה המבוקשת', required: 'mandatory' }, { id: 'd2.7.2', name: 'תוכן מתורגם מעודכן בתוך המוצר הדיגיטלי', required: 'mandatory' }] }] },
      { id: '2.8', name: 'תרגום עברית-אמהרית', description: 'תרגום תוכן מעברית לאמהרית', projectSizeThreshold: 200000, maintenanceAllowed: false, activities: [{ id: '2.8.1', name: 'תרגום + הזנה למוצר הדיגיטלי ובדיקת איכות', deliverables: [{ id: 'd2.8.1', name: 'מסמך בשפה המבוקשת', required: 'mandatory' }, { id: 'd2.8.2', name: 'תוכן מתורגם מעודכן בתוך המוצר הדיגיטלי', required: 'mandatory' }] }] },
      { id: '2.9', name: 'תרגום לשפה אחרת', description: 'תרגום תוכן מעברית לשפה אחרת לפי בחירה', projectSizeThreshold: 200000, maintenanceAllowed: false, activities: [{ id: '2.9.1', name: 'תרגום + הזנה למוצר הדיגיטלי ובדיקת איכות', deliverables: [{ id: 'd2.9.1', name: 'מסמך בשפה המבוקשת', required: 'mandatory' }, { id: 'd2.9.2', name: 'תוכן מתורגם מעודכן בתוך המוצר הדיגיטלי', required: 'mandatory' }] }] },
      {
        id: '2.10',
        name: 'עריכה לשונית',
        description: 'עריכה לשונית ופישוט לשוני לאנשים עם מוגבלות',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'בהיקף גדול — ההתמחות לא פתוחה לתיחור',
        activities: [
          { id: '2.10.1', name: 'עריכה לשונית', deliverables: [{ id: 'd2.10.1', name: 'קובץ ערוך', required: 'mandatory' }] },
          { id: '2.10.2', name: 'פישוט לשוני לאנשים עם מוגבלות', deliverables: [{ id: 'd2.10.2', name: 'קובץ מונגש', required: 'recommended' }] },
        ],
      },
      {
        id: '2.11',
        name: 'ניהול ניו-מדיה',
        description: 'ניהול רשתות חברתיות ואתרי אינטרנט',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'ניתנת מענה לקידום ממומן אך לא לתוכן ממומן',
        activities: [
          { id: '2.11.1', name: 'ניהול רשתות חברתיות (פייסבוק, לינקדין, אינסטגרם, טוויטר)', deliverables: [{ id: 'd2.11.1', name: 'תכנית עבודה לניהול הרשתות + ביצועה', required: 'mandatory' }] },
          { id: '2.11.2', name: 'ניהול אתרי אינטרנט', deliverables: [{ id: 'd2.11.2', name: 'תכנית עבודה לאתר + ביצועה', required: 'optional' }] },
        ],
      },
    ],
  },

  {
    id: '3',
    name: 'שינוי תהליכים',
    type: 'digital',
    icon: '🔄',
    specializations: [
      {
        id: '3.1',
        name: 'הנדסה מחדש של תהליכים',
        description: 'מיפוי, ניתוח ושיפור תהליכים ארגוניים',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '3.1.1', name: 'תיחום (Scope)', deliverables: [{ id: 'd3.1.1', name: 'רשימת תהליכים', required: 'mandatory' }] },
          { id: '3.1.2', name: 'ביצוע מחקר', deliverables: [{ id: 'd3.1.2', name: 'מטרות ויעדים', required: 'mandatory' }] },
          { id: '3.1.3', name: 'מיפוי תהליך קיים (SIPOC, 5 whys)', deliverables: [{ id: 'd3.1.3', name: 'תרשים תהליך קיים + חסמים', required: 'mandatory' }] },
          { id: '3.1.4', name: 'איתור טכנולוגיות', deliverables: [{ id: 'd3.1.4', name: 'פירוט פתרונות', required: 'recommended' }] },
          { id: '3.1.5', name: 'הערכת פתרונות', deliverables: [{ id: 'd3.1.5', name: 'מסמך תהליך עתידי + רמות שירות', required: 'mandatory' }] },
          { id: '3.1.6', name: 'גיבוש תכנית אופרטיבית', deliverables: [{ id: 'd3.1.6', name: 'תכנית יישום', required: 'mandatory' }] },
          { id: '3.1.7', name: 'הגדרת KPIs', deliverables: [{ id: 'd3.1.7', name: 'תכנית מדידה ובקרה', required: 'mandatory' }] },
          { id: '3.1.8', name: 'ביצוע פיילוט', deliverables: [{ id: 'd3.1.8', name: 'מסמך פיילוט', required: 'optional' }] },
        ],
      },
      {
        id: '3.2',
        name: 'שינוי ארגוני תומך',
        description: 'ניתוח השלכות ארגוניות וגיבוש שיטות עבודה ונהלים',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'בהיקף קטן — לא פתוחה לתיחור',
        activities: [
          { id: '3.2.1', name: 'ניתוח השלכות', deliverables: [{ id: 'd3.2.1', name: 'מסמך המלצות (מבנה ארגוני, הגדרות תפקיד)', required: 'mandatory' }] },
          { id: '3.2.2', name: 'גיבוש שיטות עבודה, הנחיות ונהלים', deliverables: [{ id: 'd3.2.2', name: 'מסמכי שגרות עבודה', required: 'mandatory' }] },
        ],
      },
      {
        id: '3.3',
        name: 'ניתוח עלות-תועלת (ROI)',
        description: 'איסוף נתונים, חישוב ROI וגיבוש המלצות',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'בהיקף קטן — לא פתוחה לתיחור',
        activities: [
          { id: '3.3.1', name: 'איסוף נתונים', deliverables: [{ id: 'd3.3.1', name: 'גליונות נתונים', required: 'mandatory' }] },
          { id: '3.3.2', name: 'קביעת הנחות יסוד', deliverables: [{ id: 'd3.3.2', name: 'מסמך הנחות', required: 'mandatory' }] },
          { id: '3.3.3', name: 'חישוב עלות-תועלת', deliverables: [{ id: 'd3.3.3', name: 'מסמך ניתוח ROI (גליונות נתונים + המחשה גרפית)', required: 'mandatory' }] },
          { id: '3.3.4', name: 'גיבוש המלצות', deliverables: [{ id: 'd3.3.4', name: 'מסמך המלצות', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '4',
    name: 'ניהול מוצר',
    type: 'digital',
    icon: '📋',
    specializations: [
      {
        id: '4.1',
        name: 'ניהול מוצר',
        description: 'ליווי מלא של תהליך ניהול המוצר הדיגיטלי מהגדרה ועד ביצוע',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'הפעלת אשכול זה דרך עורך המכרז בלבד',
        activities: [
          { id: '4.1.1', name: 'ייעוץ להגדרת הבעיה/אתגר', deliverables: [{ id: 'd4.1.1', name: 'הגדרת התמחויות + ניסוח בריף', required: 'mandatory' }] },
          { id: '4.1.2', name: 'גיבוש מטרות ומדדים', deliverables: [{ id: 'd4.1.2', name: 'מסמך אסטרטגיית מוצר', required: 'mandatory' }] },
          { id: '4.1.3', name: 'ליווי הרכש', deliverables: [{ id: 'd4.1.3', name: 'חוות דעת על הצעות', required: 'mandatory' }] },
          { id: '4.1.4', name: 'מיפוי בעלי עניין', deliverables: [{ id: 'd4.1.4', name: 'מפת בעלי עניין', required: 'mandatory' }] },
          { id: '4.1.5', name: 'בניית צוות משימה', deliverables: [{ id: 'd4.1.5', name: 'תכלול + ניהול פגישות', required: 'mandatory' }] },
          { id: '4.1.6', name: 'הגדרת תכולה ו-MVP', deliverables: [{ id: 'd4.1.6', name: 'תכנית יישום', required: 'mandatory' }] },
          { id: '4.1.7', name: 'ליווי קבלת תוצרים', deliverables: [{ id: 'd4.1.7', name: 'אישור תוצרים', required: 'mandatory' }] },
          { id: '4.1.8', name: 'הגדרת SLA', deliverables: [{ id: 'd4.1.8', name: 'אישור SLA', required: 'mandatory' }] },
          { id: '4.1.9', name: 'ניתוח ביצועים', deliverables: [{ id: 'd4.1.9', name: 'תכנית אופרטיבית', required: 'recommended' }] },
        ],
      },
    ],
  },

  {
    id: '5',
    name: 'דאטה',
    type: 'digital',
    icon: '📊',
    specializations: [
      {
        id: '5.1',
        name: 'אסטרטגיית דאטה',
        description: 'מיפוי מצב קיים, הגדרת KPIs, ניתוח פערים וגיבוש ארכיטקטורת נתונים',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '5.1.1', name: 'מיפוי מצב קיים', deliverables: [{ id: 'd5.1.1', name: 'מסמך אפיון תשתית קיימת', required: 'mandatory' }] },
          { id: '5.1.2', name: 'הגדרת KPIs', deliverables: [{ id: 'd5.1.2', name: 'מסמך KPIs', required: 'mandatory' }] },
          { id: '5.1.3', name: 'ניתוח פערים (Gap analysis)', deliverables: [{ id: 'd5.1.3', name: 'מסמך פערים', required: 'mandatory' }] },
          { id: '5.1.4', name: 'גיבוש ארכיטקטורת תשתית נתונים', deliverables: [{ id: 'd5.1.4', name: 'ארכיטקטורה עתידית + מפת דרכים', required: 'mandatory' }] },
          { id: '5.1.5', name: 'גיבוש נהלי משילות דאטה', deliverables: [{ id: 'd5.1.5', name: 'מודלים מוסכמים', required: 'recommended' }] },
          { id: '5.1.6', name: 'המלצה על תפקידים', deliverables: [{ id: 'd5.1.6', name: 'מסמך המלצות', required: 'optional' }] },
        ],
      },
      {
        id: '5.2',
        name: 'אנליטיקה מתקדמת של נתונים',
        description: 'בניית מודלים סטטיסטיים, POC וניתוח נתונים מתקדם',
        projectSizeThreshold: 200000,
        maintenanceAllowed: true,
        activities: [
          { id: '5.2.1', name: 'הגדרת שאלות עסקיות', deliverables: [{ id: 'd5.2.1', name: 'מסמך שאלות עסקיות', required: 'mandatory' }] },
          { id: '5.2.2', name: 'הגדרת תשתית וטיוב נתונים', deliverables: [{ id: 'd5.2.2', name: 'הגדרת נתונים + תיקוף', required: 'mandatory' }] },
          { id: '5.2.3', name: 'בניית מודלים סטטיסטיים/חוקים עסקיים', deliverables: [{ id: 'd5.2.3', name: 'מודלים סטטיסטיים', required: 'mandatory' }] },
          { id: '5.2.4', name: 'ביצוע POC', deliverables: [{ id: 'd5.2.4', name: 'מסקנות POC', required: 'mandatory' }] },
          { id: '5.2.5', name: 'גיבוש פתרונות', deliverables: [{ id: 'd5.2.5', name: 'מסמך המלצות', required: 'mandatory' }] },
          { id: '5.2.6', name: 'תחזוקה — עדכון מודל', deliverables: [{ id: 'd5.2.6', name: 'מודל מעודכן', required: 'optional' }] },
        ],
      },
      {
        id: '5.3',
        name: 'ויזואליזציה של מידע וחקר (Data discovery & visualization)',
        description: 'אפיון ויישום דשבורדים ויזואליים לניתוח נתונים',
        projectSizeThreshold: 200000,
        maintenanceAllowed: true,
        activities: [
          { id: '5.3.1', name: 'אפיון דשבורדים', deliverables: [{ id: 'd5.3.1', name: 'מסמך אפיון ומוק-אפ', required: 'mandatory' }] },
          { id: '5.3.2', name: 'יישום דשבורדים', deliverables: [{ id: 'd5.3.2', name: 'דשבורדים פועלים', required: 'mandatory' }] },
          { id: '5.3.3', name: 'תחזוקה — תמיכה בתפעול', deliverables: [{ id: 'd5.3.3', name: 'דשבורדים מעודכנים', required: 'optional' }] },
        ],
      },
    ],
  },

  // ===================== TECH CLUSTERS =====================

  {
    id: '6',
    name: 'תשתיות והגירה לענן',
    type: 'tech',
    icon: '☁️',
    specializations: [
      {
        id: '6.1',
        name: 'ייעוץ לקראת מעבר לענן ציבורי',
        description: 'מיפוי מערכות, המלצה על ארכיטקטורת ענן והכנה לתהליך המעבר',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'אין הפרדה בין פרויקטים קטנים וגדולים בהתמחות זו',
        activities: [
          { id: '6.1.1', name: 'מיפוי יישומים ותשתיות', deliverables: [{ id: 'd6.1.1', name: 'מסמך מיפוי מערכות', required: 'mandatory' }] },
          { id: '6.1.2', name: 'בחינה מעמיקה והמלצה על תשתית ענן', deliverables: [{ id: 'd6.1.2', name: 'דוח התאמה למעבר לענן ציבורי', required: 'mandatory' }] },
          { id: '6.1.3', name: 'הערכת עלויות', deliverables: [{ id: 'd6.1.3', name: 'מסמך המלצות (Rehost/Revise/Rearchitect/Replace/Retire)', required: 'mandatory' }] },
          { id: '6.1.4', name: 'ליווי תהליך מודרניזציה', deliverables: [{ id: 'd6.1.4', name: 'מסמך הערכת עלויות', required: 'mandatory' }] },
          { id: '6.1.5', name: 'הגדרת KPIs ו-Baseline', deliverables: [{ id: 'd6.1.5', name: 'מסמך סיכום מדדים', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.2',
        name: 'מודרניזציה והקמת סביבה בענן AWS',
        description: 'הגירה ומודרניזציה של מערכות בענן AWS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.2.1', name: 'מיפוי מצב קיים', deliverables: [{ id: 'd6.2.1', name: 'מסמך מיפוי', required: 'mandatory' }] },
          { id: '6.2.2', name: 'תכנון ארכיטקטורה', deliverables: [{ id: 'd6.2.2', name: 'מסמך ארכיטקטורה', required: 'mandatory' }] },
          { id: '6.2.3', name: 'ביצוע הגירה, Hybrid/cloud architectures, High availability/DR, גיבויים', deliverables: [{ id: 'd6.2.3', name: 'ביצוע הגירה', required: 'mandatory' }] },
          { id: '6.2.4', name: 'בדיקות מסירה', deliverables: [{ id: 'd6.2.4', name: 'תוצאות בדיקה', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.3',
        name: 'מודרניזציה והקמת סביבה בענן GCP',
        description: 'הגירה ומודרניזציה של מערכות בענן GCP',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.3.1', name: 'מיפוי מצב קיים', deliverables: [{ id: 'd6.3.1', name: 'מסמך מיפוי', required: 'mandatory' }] },
          { id: '6.3.2', name: 'תכנון ארכיטקטורה', deliverables: [{ id: 'd6.3.2', name: 'מסמך ארכיטקטורה', required: 'mandatory' }] },
          { id: '6.3.3', name: 'ביצוע הגירה, Hybrid/cloud architectures, High availability/DR, גיבויים', deliverables: [{ id: 'd6.3.3', name: 'ביצוע הגירה', required: 'mandatory' }] },
          { id: '6.3.4', name: 'בדיקות מסירה', deliverables: [{ id: 'd6.3.4', name: 'תוצאות בדיקה', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.4',
        name: 'בדיקות עומסים לענן ציבורי AWS',
        description: 'בדיקות עומסים מקיפות (ScaleOut/ScaleUp, HA, DR) בסביבת AWS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [{ id: '6.4.1', name: 'ביצוע בדיקות עומסים', deliverables: [{ id: 'd6.4.1', name: 'תסריטי בדיקה + תוצאות (ScaleOut/ScaleUp, HA, DR, מקרי קצה)', required: 'mandatory' }] }],
      },
      {
        id: '6.5',
        name: 'בדיקות עומסים לענן ציבורי GCP',
        description: 'בדיקות עומסים מקיפות (ScaleOut/ScaleUp, HA, DR) בסביבת GCP',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [{ id: '6.5.1', name: 'ביצוע בדיקות עומסים', deliverables: [{ id: 'd6.5.1', name: 'תסריטי בדיקה + תוצאות (ScaleOut/ScaleUp, HA, DR, מקרי קצה)', required: 'mandatory' }] }],
      },
      {
        id: '6.6',
        name: 'תשתיות בסיסי נתונים (Structured and UnStructured) לענן AWS',
        description: 'תכנון, בחירה והקמת תשתיות בסיסי נתונים בענן AWS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.6.1', name: 'תכנון ובחירת בסיס נתונים', deliverables: [{ id: 'd6.6.1', name: 'מסמך תכנון', required: 'mandatory' }] },
          { id: '6.6.2', name: 'הגדרת ארכיטקטורה ותצורת פריסה, ביצוע', deliverables: [{ id: 'd6.6.2', name: 'ביצוע', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.7',
        name: 'תשתיות בסיסי נתונים לענן GCP',
        description: 'תכנון, בחירה והקמת תשתיות בסיסי נתונים בענן GCP',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.7.1', name: 'תכנון ובחירת בסיס נתונים', deliverables: [{ id: 'd6.7.1', name: 'מסמך תכנון', required: 'mandatory' }] },
          { id: '6.7.2', name: 'הגדרת ארכיטקטורה ותצורת פריסה, ביצוע', deliverables: [{ id: 'd6.7.2', name: 'ביצוע', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.8',
        name: 'CI/CD / XOps — AWS',
        description: 'תכנון, הקמה ויישום pipelines ו-Infrastructure as Code בענן AWS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.8.1', name: 'תכנון הקמה ויישום', deliverables: [{ id: 'd6.8.1', name: 'Pipeline מתאים לענן ציבורי', required: 'mandatory' }] },
          { id: '6.8.2', name: 'Infrastructure as code', deliverables: [{ id: 'd6.8.2', name: 'תהליך הקמת סביבות בקוד', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.9',
        name: 'CI/CD / XOps — GCP',
        description: 'תכנון, הקמה ויישום pipelines ו-Infrastructure as Code בענן GCP',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.9.1', name: 'תכנון הקמה ויישום', deliverables: [{ id: 'd6.9.1', name: 'Pipeline מתאים לענן ציבורי', required: 'mandatory' }] },
          { id: '6.9.2', name: 'Infrastructure as code', deliverables: [{ id: 'd6.9.2', name: 'תהליך הקמת סביבות בקוד', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.10',
        name: 'אופטימיזציה פיננסית בענן AWS (FinOps)',
        description: 'ייעוץ ויישום פעולות ייעול עלויות בענן AWS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.10.1', name: 'ייעוץ ותכנון', deliverables: [{ id: 'd6.10.1', name: 'מסמך המלצות', required: 'mandatory' }] },
          { id: '6.10.2', name: 'יישום פעולות ייעול (רכש, תצורה, יישומים)', deliverables: [{ id: 'd6.10.2', name: 'ביצוע ייעול + דשבורדים ודוחות', required: 'mandatory' }] },
        ],
      },
      {
        id: '6.11',
        name: 'אופטימיזציה פיננסית בענן GCP (FinOps)',
        description: 'ייעוץ ויישום פעולות ייעול עלויות בענן GCP',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '6.11.1', name: 'ייעוץ ותכנון', deliverables: [{ id: 'd6.11.1', name: 'מסמך המלצות', required: 'mandatory' }] },
          { id: '6.11.2', name: 'יישום פעולות ייעול (רכש, תצורה, יישומים)', deliverables: [{ id: 'd6.11.2', name: 'ביצוע ייעול + דשבורדים ודוחות', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '7',
    name: 'הדרכה והטמעה',
    type: 'tech',
    icon: '🎓',
    specializations: [
      {
        id: '7.1',
        name: 'פיתוח הדרכה',
        description: 'פיתוח מערכי שיעור, תרגילים ומבדקי ידע',
        projectSizeThreshold: 70000,
        maintenanceAllowed: false,
        activities: [
          { id: '7.1.1', name: 'לימוד המערכת', deliverables: [{ id: 'd7.1.1', name: 'הכנת חומרי לימוד', required: 'mandatory' }] },
          { id: '7.1.2', name: 'פיתוח הדרכה', deliverables: [{ id: 'd7.1.2a', name: 'מערכי שיעור', required: 'mandatory' }, { id: 'd7.1.2b', name: 'תרגילים', required: 'mandatory' }, { id: 'd7.1.2c', name: 'מבדקי ידע', required: 'mandatory' }] },
        ],
      },
      {
        id: '7.2',
        name: 'הכנת חומרי הדרכה (כולל סרטונים, אנימציות, מבחן ידע)',
        description: 'הכנת חומרי הדרכה מגוונים כולל לומדות מקוונות וסרטוני הדרכה',
        projectSizeThreshold: 70000,
        maintenanceAllowed: false,
        activities: [
          { id: '7.2.1', name: 'לימוד המערכת', deliverables: [{ id: 'd7.2.1', name: 'הכנת חומרי לימוד', required: 'mandatory' }] },
          { id: '7.2.2', name: 'הכנת חומרים', deliverables: [{ id: 'd7.2.2a', name: 'מסמך הדרכה למשתמש', required: 'mandatory' }, { id: 'd7.2.2b', name: 'חומרי הדרכה (מצגות, סרטונים)', required: 'mandatory' }, { id: 'd7.2.2c', name: 'לומדה מקוונת', required: 'recommended' }, { id: 'd7.2.2d', name: 'סרטון הדרכה', required: 'recommended' }, { id: 'd7.2.2e', name: 'קמפיין פנימי לקראת השקה', required: 'optional' }] },
        ],
      },
      {
        id: '7.3',
        name: 'הדרכה פרונטלית',
        description: 'ביצוע הדרכה פרונטלית למשתמשים',
        projectSizeThreshold: 70000,
        maintenanceAllowed: false,
        notes: 'בהיקף קטן — לא פתוחה לתיחור',
        activities: [
          { id: '7.3.1', name: 'לימוד המערכת', deliverables: [{ id: 'd7.3.1', name: 'הכנת חומרי לימוד', required: 'mandatory' }] },
          { id: '7.3.2', name: 'ביצוע הדרכה', deliverables: [{ id: 'd7.3.2', name: 'משוב', required: 'mandatory' }] },
        ],
      },
      {
        id: '7.4',
        name: 'הטמעה',
        description: 'ליווי והטמעת המערכת בארגון',
        projectSizeThreshold: 70000,
        maintenanceAllowed: false,
        notes: 'בהיקף קטן — לא פתוחה לתיחור',
        activities: [
          { id: '7.4.1', name: 'לימוד המערכת', deliverables: [{ id: 'd7.4.1', name: 'הכנת חומרי לימוד', required: 'mandatory' }] },
          { id: '7.4.2', name: 'הטמעה', deliverables: [{ id: 'd7.4.2', name: 'משוב', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '8',
    name: 'ניתוח ופיתוח',
    type: 'tech',
    icon: '💻',
    specializations: [
      {
        id: '8.1',
        name: 'ניתוח מערכות',
        description: 'ניתוח מערכת מעמיק ותיעוד מפורט',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [{ id: '8.1.1', name: 'ניתוח מערכת', deliverables: [{ id: 'd8.1.1', name: 'מסמך ניתוח מערכת מפורט', required: 'mandatory' }] }],
      },
      {
        id: '8.2',
        name: 'פיתוח בסביבת .NET',
        description: 'פיתוח, בדיקות, התקנה ותחזוקה בסביבת .NET',
        projectSizeThreshold: 200000,
        maintenanceAllowed: true,
        activities: [
          { id: '8.2.1', name: 'ייעוץ טכנולוגי/מתודולוגי', deliverables: [{ id: 'd8.2.1', name: 'הנחיות + דוגמאות קוד', required: 'optional' }] },
          { id: '8.2.2', name: 'אפיון (לפרויקטים קטנים)', deliverables: [{ id: 'd8.2.2', name: 'מסמך אפיון', required: 'recommended' }] },
          { id: '8.2.3', name: 'פיתוח', deliverables: [{ id: 'd8.2.3', name: 'המוצר/המערכת + קוד', required: 'mandatory' }] },
          { id: '8.2.4', name: 'בדיקות מסירה', deliverables: [{ id: 'd8.2.4a', name: 'מסמך תכנון בדיקות', required: 'mandatory' }, { id: 'd8.2.4b', name: 'תוצאות בדיקה', required: 'mandatory' }] },
          { id: '8.2.5', name: 'התקנה', deliverables: [{ id: 'd8.2.5a', name: 'תיעוד קוד', required: 'mandatory' }, { id: 'd8.2.5b', name: 'הנחיות התקנה', required: 'mandatory' }] },
          { id: '8.2.6', name: 'ליווי הדרכה (Train the trainer)', deliverables: [{ id: 'd8.2.6', name: 'סיכום הדרכה', required: 'optional' }] },
        ],
      },
      { id: '8.3', name: 'פיתוח אפליקציות WEB', description: 'פיתוח, בדיקות, התקנה ותחזוקה של אפליקציות Web', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.3.1', name: 'פיתוח WEB', deliverables: [{ id: 'd8.3.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.3.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.4', name: 'פיתוח אפליקציות מובייל', description: 'פיתוח, בדיקות, התקנה ותחזוקה של אפליקציות מובייל', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.4.1', name: 'פיתוח מובייל', deliverables: [{ id: 'd8.4.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.4.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.5', name: 'פיתוח מערכות קוד פתוח', description: 'פיתוח ללא העדפה לשפת תכנות', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.5.1', name: 'פיתוח קוד פתוח', deliverables: [{ id: 'd8.5.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.5.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.6', name: 'פיתוח Java', description: 'פיתוח, בדיקות, התקנה ותחזוקה בשפת Java', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.6.1', name: 'פיתוח Java', deliverables: [{ id: 'd8.6.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.6.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.7', name: 'פיתוח Python', description: 'פיתוח, בדיקות, התקנה ותחזוקה בשפת Python', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.7.1', name: 'פיתוח Python', deliverables: [{ id: 'd8.7.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.7.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.8', name: 'פיתוח ב-React', description: 'פיתוח, בדיקות, התקנה ותחזוקה ב-React', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.8.1', name: 'פיתוח React', deliverables: [{ id: 'd8.8.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.8.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.9', name: 'פיתוח באנגולר', description: 'פיתוח, בדיקות, התקנה ותחזוקה ב-Angular', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.9.1', name: 'פיתוח Angular', deliverables: [{ id: 'd8.9.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.9.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      { id: '8.10', name: 'פיתוח בסביבת PHP', description: 'פיתוח, בדיקות, התקנה ותחזוקה ב-PHP', projectSizeThreshold: 200000, maintenanceAllowed: true, activities: [{ id: '8.10.1', name: 'פיתוח PHP', deliverables: [{ id: 'd8.10.1', name: 'המוצר/המערכת + קוד', required: 'mandatory' }, { id: 'd8.10.2', name: 'תיעוד קוד + הנחיות התקנה', required: 'mandatory' }] }] },
      {
        id: '8.11',
        name: 'ארכיטקטורה',
        description: 'ייעוץ וליווי ארכיטקטורי כולל אבטחת מידע וסיסטם',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.11.1', name: 'ייעוץ', deliverables: [{ id: 'd8.11.1', name: 'מסמך ארכיטקטורה (כולל אבטחת מידע, סיסטם/תשתיות ופיתוח)', required: 'mandatory' }] },
          { id: '8.11.2', name: 'ליווי', deliverables: [{ id: 'd8.11.2', name: 'פגישות ליווי שוטפות', required: 'optional' }] },
        ],
      },
      {
        id: '8.12',
        name: 'ייעוץ וליווי טכנולוגי לעולמות הדאטה בענן',
        description: 'ייעוץ לבחירת פתרון דאטה בענן ופיתוח Data as a Service',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.12.1', name: 'ייעוץ לבחירת פתרון (Business Case)', deliverables: [{ id: 'd8.12.1', name: 'מסמך הצעת פתרון (טכנולוגיה + הגדרת תוצר)', required: 'mandatory' }] },
          { id: '8.12.2', name: 'ליווי יישום, פיתוח Data as a Service', deliverables: [{ id: 'd8.12.2', name: 'ביצוע', required: 'mandatory' }] },
        ],
      },
      {
        id: '8.13',
        name: 'Data Governance',
        description: 'ניתוח ותכנון מודל נתונים ארגוני והגדרת תקן משרדי',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.13.1', name: 'ניתוח ותכנון מודל נתונים ארגוני (Domain scheme)', deliverables: [{ id: 'd8.13.1', name: 'מסמך מודל ישויות קונספטואלי (סכמה)', required: 'mandatory' }] },
          { id: '8.13.2', name: 'הגדרת תקן משרדי (Master data)', deliverables: [{ id: 'd8.13.2', name: 'סכמת ERD', required: 'mandatory' }] },
        ],
      },
      {
        id: '8.14',
        name: 'Data Integration',
        description: 'ארכיטקטורת נתונים, אינטגרציה ו-Data Quality',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.14.1', name: 'ארכיטקטורת נתונים (הגדרת מידע, אינטגרציה, עיבוד, שמירה)', deliverables: [{ id: 'd8.14.1', name: 'מסמך אפיון והמלצות מפורט', required: 'mandatory' }] },
          { id: '8.14.2', name: 'Data Quality (טיוב, העשרה, מדדי איכות)', deliverables: [{ id: 'd8.14.2', name: 'קוד המוצר/מערכת', required: 'mandatory' }] },
        ],
      },
      {
        id: '8.15',
        name: 'פיתוח פתרונות מתקדמים ל-BI בענן',
        description: 'ניתוח שאלות עסקיות ופיתוח ETL ל-BI בענן',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.15.1', name: 'ניתוח שאלות עסקיות', deliverables: [{ id: 'd8.15.1', name: 'מסמך אפיון', required: 'mandatory' }] },
          { id: '8.15.2', name: 'פיתוח ETL ל-BI בענן', deliverables: [{ id: 'd8.15.2', name: 'קוד', required: 'mandatory' }] },
        ],
      },
      {
        id: '8.16',
        name: 'ייעוץ ויישום AI/ML בענן',
        description: 'תכנון, אפיון ופיתוח מודלי AI/ML בענן',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.16.1', name: 'תכנון + אפיון פתרון', deliverables: [{ id: 'd8.16.1', name: 'מסמך אפיון מפורט', required: 'mandatory' }] },
          { id: '8.16.2', name: 'פיתוח מודלים (ניתוח תמונה, טקסט, קול, unstructured, tabular, graph)', deliverables: [{ id: 'd8.16.2a', name: 'אלגוריתם', required: 'mandatory' }, { id: 'd8.16.2b', name: 'מסמך המלצות', required: 'mandatory' }, { id: 'd8.16.2c', name: 'הנחיות לפיתוח', required: 'mandatory' }, { id: 'd8.16.2d', name: 'פיתוח', required: 'mandatory' }] },
        ],
      },
      {
        id: '8.17',
        name: 'פיתוח פתרונות GIS',
        description: 'ייעוץ, אפיון, פיתוח ובדיקות מסירה של פתרונות GIS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '8.17.1', name: 'ייעוץ ואפיון', deliverables: [{ id: 'd8.17.1a', name: 'מיפוי מקורות מידע גיאוגרפי', required: 'mandatory' }, { id: 'd8.17.1b', name: 'ארכיטקטורה + מתודולוגיה + שכבות מידע', required: 'mandatory' }, { id: 'd8.17.1c', name: 'מסמך אפיון', required: 'mandatory' }] },
          { id: '8.17.2', name: 'פיתוח, בדיקות מסירה, התקנה', deliverables: [{ id: 'd8.17.2a', name: 'מוצר + קוד', required: 'mandatory' }, { id: 'd8.17.2b', name: 'תיעוד + הנחיות התקנה', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '9',
    name: 'בסיסי נתונים',
    type: 'tech',
    icon: '🗄️',
    specializations: [
      {
        id: '9.1',
        name: 'ייעוץ וליווי בעולמות בסיסי נתונים מתקדמים (NoSQL)',
        description: 'ייעוץ בבחירת בסיס נתונים וליווי במעבר',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'בהיקף קטן — לא פתוחה לתיחור',
        activities: [
          { id: '9.1.1', name: 'ייעוץ בבחירת בסיס נתונים', deliverables: [{ id: 'd9.1.1', name: 'מסמך סיכום המלצות', required: 'mandatory' }] },
          { id: '9.1.2', name: 'ליווי במעבר', deliverables: [{ id: 'd9.1.2', name: 'ליווי מקצועי', required: 'optional' }] },
        ],
      },
      {
        id: '9.2',
        name: 'הסבת בסיס נתונים מ-Oracle ל-SQL Server',
        description: 'תכנון ביצוע הסבת בסיס נתונים מ-Oracle ל-SQL Server',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '9.2.1', name: 'תכנון הסבה', deliverables: [{ id: 'd9.2.1', name: 'מסמך תכנון הסבה', required: 'mandatory' }] },
          { id: '9.2.2', name: 'פיתוח, בדיקות מסירה, התקנה, בדיקות שפיות בסביבת ייצור', deliverables: [{ id: 'd9.2.2', name: 'מסמך תכנון בדיקות', required: 'mandatory' }] },
        ],
      },
      {
        id: '9.3',
        name: 'שדרוג גרסת SQL Server',
        description: 'תכנון וביצוע שדרוג גרסת SQL Server',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '9.3.1', name: 'תכנון שדרוג', deliverables: [{ id: 'd9.3.1', name: 'מסמך תכנון הסבה', required: 'mandatory' }] },
          { id: '9.3.2', name: 'פיתוח, בדיקות מסירה, התקנה, בדיקות שפיות בסביבת ייצור', deliverables: [{ id: 'd9.3.2', name: 'מסמך תכנון בדיקות', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '10',
    name: 'חדשנות טכנולוגית',
    type: 'tech',
    icon: '🚀',
    specializations: [
      {
        id: '10.1',
        name: 'פתרונות תוכנה חדשניים',
        description: 'מציאת פתרונות חדשניים — ההתמחות לא מגדירה פעילויות ספציפיות מראש',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'ההתמחות נועדה למציאת פתרונות חדשניים. הפניה מציגה את הבעיה ומאפשרת לספקים להציע פתרון',
        activities: [
          { id: '10.1.1', name: 'הצעת פתרון חדשני', deliverables: [{ id: 'd10.1.1', name: 'פתרונות מבוססי תכנה (כולל אפשרות לרכיבי חומרה)', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '11',
    name: 'אבטחת מידע',
    type: 'tech',
    icon: '🔒',
    specializations: [
      {
        id: '11.1',
        name: 'בדיקת חדירות (PT) תשתיתית',
        description: 'בדיקות חדירות תשתיתיות: External, Internal, Cloud, IoT, ICS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '11.1.1', name: 'מיפוי ואיסוף מידע (Information gathering)', deliverables: [{ id: 'd11.1.1', name: 'מסמך מיפוי', required: 'mandatory' }] },
          { id: '11.1.2', name: 'סריקת פגיעות (Nessus/Nmap/Metasploit/Burp Suite)', deliverables: [{ id: 'd11.1.2', name: 'דוח מסכם (רשימת פגיעויות, תיאור סיכון, טכניקות תקיפה)', required: 'mandatory' }] },
          { id: '11.1.3', name: 'בדיקה ידנית (Manual Testing)', deliverables: [{ id: 'd11.1.3', name: 'דוח מפורט (תקציר מנהלים, דוח מפורט, PoC, נספחים)', required: 'mandatory' }] },
          { id: '11.1.4', name: 'בדיקה חוזרת (Retesting)', deliverables: [{ id: 'd11.1.4', name: 'דוח בדיקה חוזרת', required: 'mandatory' }] },
        ],
      },
      {
        id: '11.2',
        name: 'בדיקת חדירות (PT) אפליקטיבית',
        description: 'בדיקות חדירות ממוקדות ב-WEB Apps, API וממשקי מובייל',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        activities: [
          { id: '11.2.1', name: 'מיפוי ואיסוף מידע (Information gathering)', deliverables: [{ id: 'd11.2.1', name: 'מסמך מיפוי', required: 'mandatory' }] },
          { id: '11.2.2', name: 'סריקת פגיעות אפליקטיבית', deliverables: [{ id: 'd11.2.2', name: 'דוח מסכם (רשימת פגיעויות, תיאור סיכון, טכניקות תקיפה)', required: 'mandatory' }] },
          { id: '11.2.3', name: 'בדיקה ידנית (Manual Testing)', deliverables: [{ id: 'd11.2.3', name: 'דוח מפורט (תקציר מנהלים, דוח מפורט, PoC, נספחים)', required: 'mandatory' }] },
          { id: '11.2.4', name: 'בדיקה חוזרת (Retesting)', deliverables: [{ id: 'd11.2.4', name: 'דוח בדיקה חוזרת', required: 'mandatory' }] },
        ],
      },
    ],
  },

  {
    id: '12',
    name: 'אינטגרציה של פתרונות צד ג\' לענן (נימבוס)',
    type: 'tech',
    icon: '🔗',
    specializations: [
      {
        id: '12.1',
        name: 'אינטגרציה של פתרון צד ג\' לענן AWS',
        description: 'תכנון, הקמה וליווי אינטגרציה של פתרון צד שלישי בענן AWS',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'הפעלת אשכול זה דרך עורך המכרז בלבד',
        activities: [
          { id: '12.1.1', name: 'תכנון ארכיטקטורה', deliverables: [{ id: 'd12.1.1', name: 'מסמך ארכיטקטורה', required: 'mandatory' }] },
          { id: '12.1.2', name: 'הקמת הסביבות הנדרשות', deliverables: [{ id: 'd12.1.2', name: 'ביצוע', required: 'mandatory' }] },
          { id: '12.1.3', name: 'ליווי אינטגרציה X חודשים', deliverables: [{ id: 'd12.1.3', name: 'ליווי צוות המשרד', required: 'mandatory' }] },
          { id: '12.1.4', name: 'בדיקות מסירה', deliverables: [{ id: 'd12.1.4', name: 'תוצאות בדיקה', required: 'mandatory' }] },
          { id: '12.1.5', name: 'הנחיות להמשך תפעול', deliverables: [{ id: 'd12.1.5', name: 'מסמך הנחיות/נהלי עבודה', required: 'mandatory' }] },
        ],
      },
      {
        id: '12.2',
        name: 'אינטגרציה של פתרון צד ג\' לענן GCP',
        description: 'תכנון, הקמה וליווי אינטגרציה של פתרון צד שלישי בענן GCP',
        projectSizeThreshold: 200000,
        maintenanceAllowed: false,
        notes: 'הפעלת אשכול זה דרך עורך המכרז בלבד',
        activities: [
          { id: '12.2.1', name: 'תכנון ארכיטקטורה', deliverables: [{ id: 'd12.2.1', name: 'מסמך ארכיטקטורה', required: 'mandatory' }] },
          { id: '12.2.2', name: 'הקמת הסביבות הנדרשות', deliverables: [{ id: 'd12.2.2', name: 'ביצוע', required: 'mandatory' }] },
          { id: '12.2.3', name: 'ליווי אינטגרציה X חודשים', deliverables: [{ id: 'd12.2.3', name: 'ליווי צוות המשרד', required: 'mandatory' }] },
          { id: '12.2.4', name: 'בדיקות מסירה', deliverables: [{ id: 'd12.2.4', name: 'תוצאות בדיקה', required: 'mandatory' }] },
          { id: '12.2.5', name: 'הנחיות להמשך תפעול', deliverables: [{ id: 'd12.2.5', name: 'מסמך הנחיות/נהלי עבודה', required: 'mandatory' }] },
        ],
      },
    ],
  },
];
