# מחשבון תכ"ם — שיפורים ותיקוני באגים (שלב א)

**תאריך:** 2026-03-30
**קובץ יעד:** `takam-calculator.html` (single-file, no build step)

---

## סקירה כללית

9 שיפורים ל-client-side של המחשבון הקיים. אין תלויות חדשות, אין שרת, אין build step.

---

## 1. לוגו לחיץ → איפוס לדף הבית

**מה:** ה-`topbar-logo` (🏛️) הופך ללחיץ ומאפס את המחשבון לשלב 1.

**איך:**
- עטוף ב-`<button>` (לא `<a>`) עם `onclick="resetAll()"` — פונקציה `resetAll()` כבר קיימת
- הוסף CSS: `cursor:pointer; background:none; border:none; padding:0`
- אפקט hover: `opacity:0.85` ו-`transform:scale(1.05)` עם `transition:0.15s`

---

## 2. שם פרויקט — שדה חובה

**מה:** שדה `projName` הופך לחובה. כפתור "המשך" בשלב 1 נחסם אם ריק.

**איך:**
- הסר `(אופציונלי)` מה-label → `שם הפרויקט *`
- ב-`proceedToStep2()`: בדוק `if (!document.getElementById('projName').value.trim())` → הצג הודעת שגיאה inline מתחת לשדה: `<span class="field-error">שם הפרויקט הוא שדה חובה</span>` ועצור
- CSS: `.field-error { color:#ef4444; font-size:12px; margin-top:4px; display:block }`

---

## 3. הסרת בלוק "סוג תעריף"

**מה:** הסר את כל בלוק ה-`<div class="field">` שמכיל "סוג תעריף" (שורות 320–326 בקובץ הנוכחי).

**איך:**
- מחק את ה-HTML של הבלוק
- `state.tariff` נשאר קבוע `'ceiling'` בקוד — אין שינוי לוגיקה

---

## 4. אייקון ℹ️ — תיאור תפקיד ב-popup

**מה:** כל כרטיס תפקיד בשלב 2 מקבל כפתור `ℹ` שפותח tooltip עם תיאור קצר.

**תיאורים:** מוסיפים שדה `desc` ל-`ROLES_DATA` לכל 35 תפקידים. 1-2 משפטים לכל תפקיד.

**תיאורים מוצעים לכל תפקיד:**
| id | desc |
|----|------|
| 1.1 | אחראי על ניהול צוות פיתוח ואפליקציות. מתאם בין דרישות עסקיות לפיתוח טכני. |
| 1.2 | אחראי על ניהול צוות פיתוח ותשתיות. מתאם פיתוח תוכנה עם צרכי תשתית. |
| 1.3 | מוביל תהליכי תפעול והטמעה של מערכות בארגון. |
| 1.5 | מומחה בתהליכי עבודה, מתודולוגיות ואינטגרציה בין מערכות. |
| 1.6 | אחראי על תהליכי PMO, תכנון, מעקב ובקרה על פרויקטים. |
| 2.1 | מוביל פרויקט מקצה לקצה — תכנון, לוחות זמנים, תקציב וסיכונים. |
| 2.2 | מנתח דרישות, מגדיר מפרטים פונקציונליים, מתאם בין לקוח לפיתוח. |
| 2.3 | מפתח קוד, בונה מודולים, אחראי על איכות הקוד ואינטגרציה. |
| 2.4 | בודק מערכות, כותב תסריטי בדיקה, מאתר ומתעד באגים. |
| 2.5 | מנהל מידע ותוכן דיגיטלי, אחראי על ארגון ידע ותיעוד. |
| 2.6 | מעצב חוויית משתמש ממשקים (UX/UI), בונה אב-טיפוס ומבצע בדיקות שמישות. |
| 2.7 | מנתח נתונים, בונה דוחות ודשבורדים, תומך בקבלת החלטות מבוססת-נתונים. |
| 2.8 | מטמיע ומפתח פלטפורמות טכנולוגיות (CRM, ERP, BI וכו'). |
| 2.9 | מבצע אוטומציה של תהליכי פיתוח, CI/CD, ניהול תשתיות ו-containerization. |
| 2.11 | מפתח מודלים של ML/AI, עובד עם נתונים גדולים לצורך חיזוי והסקה. |
| 2.12 | בונה pipelines לנתונים, מנהל data warehouses ומאגרי נתונים גדולים. |
| 2.13 | מגדיר אסטרטגיית מוצר, עדיפויות ו-roadmap בשיתוף צוות הפיתוח. |
| 3.1 | מתקין ומתחזק רשתות תקשורת, ניתוב, firewall ותקשורת בין-אתרית. |
| 3.2 | מתקין ומתחזק ציוד קצה — מחשבים, מדפסות, ציוד היקפי. |
| 3.3 | מנהל שרתים, מערכות הפעלה ותשתית IT כוללת. |
| 3.4 | מנהל בסיסי נתונים — ביצועים, גיבוי, אבטחה, תחזוקה. |
| 3.7 | מפעיל מערכות בקרה תעשייתיות ו-SCADA. |
| 3.8 | מיישם פתרונות הגנת סייבר — SIEM, EDR, מניעת חדירה. |
| 3.9 | מנהל תשתיות ענן (AWS/Azure/GCP) — provisioning, ניטור, עלויות. |
| 4.1 | נאמן מחשוב ברמת יחידה — ממשק ראשון לתמיכה טכנית. |
| 4.2 | מספק תמיכה ראשונית למשתמשי קצה — help desk. |
| 4.3 | מדריך ומטמיע מערכות אצל משתמשי קצה. |
| 4.4 | מפעיל מערכות ומבצע עבודות ביצוע שגרתיות. |
| 5.1 | מיישם ומתפעל מודולי SAP בסביבת ERP ממשלתית. |
| 5.2 | מנהל תשתיות טכניות של מערכות SAP/ERP. |
| 6.1 | אחראי כולל על מערכות המידע הארגוניות — אסטרטגיה ותפעול. |
| 6.2 | מגדיר ארכיטקטורה טכנית כוללת למערכות ה-IT. |
| 6.4 | מומחה בטכנולוגיות הגנת סייבר — כלים, כלים ופרוטוקולים. |
| 6.5 | מומחה במתודולוגיות ותהליכי הגנת סייבר. |
| 6.6 | חוקר איומי סייבר, מנתח מתקפות, מבצע בדיקות חדירה. |
| 6.7 | מגדיר ארכיטקטורת פתרונות עבור פרויקטים ספציפיים. |

**HTML של כרטיס עם ℹ️:**
```html
<div class="role-card${selected}" onclick="toggleRole('${r.id}')" data-id="${r.id}">
  <span class="role-card-name">${r.name}</span>
  <span class="role-check">✓</span>
  <button class="role-info-btn" onclick="showRoleInfo(event,'${r.id}')">ℹ</button>
</div>
```

**Popup:**
- `<div id="roleInfoPopup" class="role-info-popup hidden">` — singleton div
- פתיחה: `showRoleInfo(event, id)` — מציב popup ליד האייקון, מציג `role.desc`
- סגירה: לחיצה מחוץ ל-popup
- CSS: `position:fixed; background:#0f172a; color:#fff; border-radius:10px; padding:12px 16px; max-width:260px; font-size:13px; z-index:500; box-shadow:0 4px 20px rgba(0,0,0,0.3); line-height:1.5`

---

## 5. בדיקת תמהיל עם AI (סעיפים 7+8)

**מה:** כפתור inline בשלב 2, מתחת לרשימת התפקידים. שולח ל-Gemini את תיאור הפרויקט + התפקידים הנבחרים. מקבל חזרה: תפקידים חשודים + תפקידים חסרים.

**תנאי הצגה:** גלוי רק אם נבחרו תפקידים (לפחות 1) **ויש שם פרויקט** ב-state.

**HTML (נוסף בסוף `#p2` לפני `nav-row`):**
```html
<div id="aiCheckWrap" style="display:none; margin-top:20px">
  <button class="btn-outline" id="aiCheckBtn" onclick="runAiCheck()">
    🔍 בדוק את התמהיל שלי עם AI
  </button>
</div>
```

**Modal תוצאות:**
```html
<div id="aiCheckModal" class="ai-overlay hidden" onclick="handleAiCheckOverlayClick(event)">
  <div class="ai-modal" style="max-width:520px">
    <div class="ai-modal-head">
      <span>🔍 בדיקת תמהיל</span>
      <button class="ai-modal-close" onclick="closeAiCheckModal()">✕</button>
    </div>
    <div class="ai-modal-body" id="aiCheckBody">...</div>
  </div>
</div>
```

**System prompt ל-Gemini:**
```
אתה יועץ לתמהיל משאבי IT לפרויקטים ממשלתיים ישראליים.
קיבלת תמהיל תפקידים לפרויקט. בדוק:
1. האם יש תפקידים שנראים לא רלוונטיים לפרויקט מסוג זה?
2. האם חסרים תפקידים קריטיים לפרויקט מסוג זה?

החזר JSON בלבד:
{
  "suspicious": [{"id":"3.2","reason":"טכנאי ציוד מחשבים לא טיפוסי לפרויקט BI"}],
  "missing": [{"name":"מנתח מערכות","reason":"פרויקט BI בדרך כלל דורש מנתח מערכות"}]
}
אם אין הערות — החזר רשימות ריקות.
```

**User message:**
```
פרויקט: [שם הפרויקט]
תפקידים נבחרים: [רשימת שמות התפקידים]
```

**הצגת תוצאות:**
- חלק "שים לב" (suspicious): אזהרה ⚠️ + שם תפקיד + סיבה
- חלק "שקול להוסיף" (missing): הצעה 💡 + שם תפקיד + סיבה
- אם שתי הרשימות ריקות: "✅ התמהיל נראה מאוזן לפרויקט מסוג זה"

---

## 6. עריכת שעות חודשיות בשלב 4

**מה:** בטבלת הפירוט בשלב 4, לכל תפקיד מוסיפים עמודת "שעות/חודש" עם אפשרות עריכה.

**חישוב ברירת מחדל:** `HOURS_PER_MONTH (176) × scope / 100`

**state:** מוסיפים שדה `customHours` אופציונלי ל-mix entry: `{id, level, scope, customHours?}`

**renderResults:** עמודה חדשה "שעות/חודש" בטבלה עם כפתור ✏️. לחיצה מחליפה את הטקסט ב-`<input type="number">` (min:1, max:999) inline. שינוי ערך → `m.customHours = val` → מחשב מחדש `calcRoleMonthlyCost`.

**`calcRoleMonthlyCost` — שינוי:**
```javascript
function calcRoleMonthlyCost(mixEntry) {
  const role = ROLES_DATA.find(r => r.id === mixEntry.id);
  if (!role) return 0;
  const rate = role.rates[mixEntry.level];
  if (!rate) return 0;
  const hours = mixEntry.customHours ?? (HOURS_PER_MONTH * mixEntry.scope / 100);
  return Math.round(rate * hours * VAT);
}
```

---

## קבצים שמשתנים

| קובץ | שינוי |
|------|-------|
| `takam-calculator.html` | כל 6 השינויים — CSS + HTML + JS |

---

## מה לא משתנה

- לוגיקת חישוב (חוץ מ-`calcRoleMonthlyCost` — תוספת `customHours`)
- כל 4 שלבי ה-wizard
- share URL, print, reset
- ה-AI Advisor הקיים (כפתור ✨ בפינה)
- כל ה-CSS הקיים — רק מוסיפים, לא משנים
