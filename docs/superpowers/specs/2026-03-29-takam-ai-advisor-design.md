# מחשבון תכ"ם — AI Advisor Feature Design

**תאריך:** 2026-03-29
**קובץ יעד:** `takam-calculator.html` (single-file, no build step)

---

## סקירה כללית

שני שדרוגים למחשבון הקיים:

1. **תיקון שם** — כל מופע של "תק"ם" מוחלף ב-"תכ"ם" (כותרת, topbar, title, badge)
2. **כפתור AI Advisor** — כפתור Pill צף בכל השלבים שפותח panel ייעוץ מבוסס Claude API

---

## 1. תיקון שם

החלף בכל הקובץ:
- `תק"ם` → `תכ"ם`
- `מחשבון תק"ם` → `מחשבון תכ"ם`
- ה-`<title>` של הדף

---

## 2. כפתור AI Advisor — Pill Button צף

### מיקום ומראה
- פינה **שמאל-תחתית** (`position:fixed; bottom:24px; left:24px; z-index:200`)
- עיצוב: gradient teal, border-radius:50px, טקסט "✨ התייעץ עם AI"
- גובה: 44px, padding: 0 20px
- `box-shadow` teal כדי לבלוט מעל התוכן

### התנהגות
- **תמיד גלוי** בכל 4 השלבים
- לחיצה פותחת את **AI Advisor Modal**
- הכפתור **לא נסגר** כשה-modal פתוח (אלא אם רוצים להוסיף אנימציה)

---

## 3. AI Advisor Modal

### מבנה
Modal overlay (`position:fixed; inset:0`) עם panel מרכזי (max-width: 560px, RTL).

**אזורים בתוך ה-modal:**

#### Header
- כותרת: "✨ יועץ AI — תמהיל משאבים"
- כפתור X לסגירה

#### אזור הזנת API Key
- שדה סיסמה `<input type="password">` עם label: "מפתח Claude API"
- טקסט עזר: "המפתח נשמר על המחשב שלך בלבד (localStorage)"
- קישור טקסט: "איך מקבלים מפתח?" → `https://console.anthropic.com/`
- המפתח נטען מ-localStorage בפתיחה אם קיים
- נשמר ב-localStorage על `blur` או לחיצת "נתח"

#### אזור תיאור פרויקט
- `<textarea>` עם placeholder: "תאר את הפרויקט שלך — למשל: מערכת BI ממשלתית, 18 חודשים, 3 משרדים, כולל פיתוח, דאטה ותשתיות..."
- גובה: 120px

#### כפתור ניתוח
- "✨ נתח את הפרויקט" — disabled אם API key ריק או textarea ריק
- בזמן ניתוח: spinner + "מנתח..."

#### אזור תוצאות (נסתר עד שמתקבלת תשובה)
- כותרת: "המלצת AI לתמהיל"
- רשימת תפקידים מומלצים — כל שורה:
  - שם תפקיד + רמה מומלצת + % משרה מוצע
  - כפתור "+ הוסף לתמהיל" (מוסיף לשלב 2 ומסמן)
- הסבר קצר (טקסט חופשי מ-Claude) מעל הרשימה
- כפתור "הוסף הכל לתמהיל"

---

## 4. Claude API Integration

### קריאה ל-API
- Endpoint: `https://api.anthropic.com/v1/messages`
- Method: POST, Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`
- Model: `claude-haiku-4-5-20251001` (מהיר וזול)
- max_tokens: 1024

**חשוב:** הקריאה נעשית מ-JavaScript בדפדפן. Anthropic חוסמת CORS לקריאות ישירות מדפדפן. **פתרון:** להשתמש ב-`anthropic-dangerous-direct-browser-access: true` header (קיים ב-SDK, נוסיף ידנית).

### System Prompt
```
אתה יועץ לתמהיל משאבי IT לפרויקטים ממשלתיים ישראליים.
הכר את תפקידי תכ"ם הבאים (35 תפקידים):
[רשימה מלאה של ROLES_DATA — id, name, cat, רמות זמינות]

על בסיס תיאור הפרויקט, החזר JSON בלבד (ללא טקסט נוסף) בפורמט:
{
  "summary": "הסבר קצר של 2-3 משפטים על ההמלצה",
  "roles": [
    {"id": "1.1", "level": "b", "scope": 100, "reason": "נדרש ל..."}
  ]
}
רמות: a=בסיסי, b=מתקדם, c=מומחה, d=בכיר. scope הוא % משרה (25/50/75/100).
```

### User Message
```
תאר פרויקט: [textarea content]
```

### טיפול בשגיאות
- API key שגוי → הודעה: "מפתח API שגוי — בדוק את המפתח"
- JSON לא תקין בתשובה → "לא הצלחנו לנתח את התשובה, נסה שוב"
- שגיאת רשת → "שגיאת חיבור, בדוק אינטרנט"

---

## 5. הוספת תפקידים ל-state

כשהמשתמש לוחץ "+ הוסף לתמהיל" על תפקיד מומלץ:
1. `state.selectedIds.add(role.id)`
2. אם התפקיד לא קיים ב-`state.mix` — מוסיף `{id, level, scope}`
3. אם כבר קיים — מעדכן level ו-scope לערכים המומלצים
4. מעדכן את ה-sticky bar count
5. הכפתור הופך ל-"✓ נוסף" (disabled)

---

## 6. CSS

CSS חדש שנוסף ל-`<style>` הקיים:

```css
/* ─── AI ADVISOR ─── */
.ai-fab { position:fixed; bottom:24px; left:24px; z-index:200; ... }
.ai-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:300; ... }
.ai-modal { ... }
.ai-result-role { ... }
```

---

## 7. מה לא משתנה

- כל לוגיקת החישוב הקיימת (`calcTotalCost`, `calcRoleMonthlyCost`)
- כל 4 שלבי ה-wizard
- share URL, print, reset
- כל ה-CSS הקיים — רק מוסיפים, לא משנים

---

## קבצים שמשתנים

| קובץ | שינוי |
|------|-------|
| `takam-calculator.html` | תיקון שם + הוספת AI FAB + Modal + CSS + JS |

אין קבצים חדשים, אין תלויות חדשות.
