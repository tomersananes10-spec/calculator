# עיצוב: היסטוריית חישובים ושיתוף עם הרשאות

## סקירה

הוספת יכולת שמירת חישובים במחשבון התכ"ם, צפייה בהיסטוריה, ושיתוף עם משתמשים אחרים עם הרשאות view/edit.

## טבלאות Supabase

### `calculations`

| עמודה | טיפוס | הערות |
|-------|--------|-------|
| `id` | uuid (PK) | auto-generated |
| `owner_id` | uuid (FK → auth.users) | הבעלים |
| `name` | text | שם הפרויקט |
| `ministry` | text | משרד |
| `period` | smallint | 6/12/24 |
| `matching_on` | boolean | |
| `matching_pct` | smallint | 1-100 |
| `risk_pct` | smallint | 0-50 |
| `hours_multiplier` | numeric | |
| `mix` | jsonb | מערך תפקידים: [{id, level, scope, customHours?}] |
| `grand_total` | integer | סכום כולל לתצוגה מהירה |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `calculation_shares`

| עמודה | טיפוס | הערות |
|-------|--------|-------|
| `id` | uuid (PK) | |
| `calculation_id` | uuid (FK → calculations) | |
| `shared_with` | uuid (FK → auth.users, nullable) | null = קישור view ציבורי |
| `permission` | text | 'view' או 'edit' |
| `token` | text (unique) | טוקן לקישור |
| `created_at` | timestamptz | |

## RLS Policies

### calculations
- SELECT: `owner_id = auth.uid()` OR exists in `calculation_shares` with matching user
- INSERT: `owner_id = auth.uid()`
- UPDATE: `owner_id = auth.uid()` OR shared with edit permission
- DELETE: `owner_id = auth.uid()`

### calculation_shares
- SELECT: owner of parent calculation OR `shared_with = auth.uid()`
- INSERT/DELETE: owner of parent calculation only

## זרימות

### שמירת חישוב
1. משתמש מחובר מגיע לשלב 4 (תוצאות)
2. לוחץ כפתור "שמור חישוב"
3. upsert ל-`calculations` (אם כבר נשמר — עדכון, אחרת — חדש)
4. הודעת אישור "החישוב נשמר"

### היסטוריה — במחשבון
1. כפתור "החישובים שלי" בהדר של המחשבון (מוצג רק למחוברים)
2. פותח פאנל צד (slide-in מימין, RTL)
3. רשימת חישובים: שם, משרד, סכום כולל, תאריך, מספר תפקידים, תקופה
4. לחיצה על חישוב → טוען את כל הנתונים לוויזארד ומעביר לשלב 4
5. אפשרות למחוק חישוב (עם אישור)

### היסטוריה — בדשבורד
1. כרטיסייה "חישובים אחרונים" בדף הבית
2. מציגה 3-5 חישובים אחרונים
3. כפתור "הצג הכל" → פותח את המחשבון עם הפאנל פתוח
4. לחיצה על חישוב → פותח את המחשבון עם החישוב טעון

### שיתוף
1. בשלב 4, כפתור "שתף" (קיים כבר, צריך להרחיב)
2. בחירת הרשאה: view או edit
3. מייצר טוקן ושומר ב-`calculation_shares`
4. מייצר קישור: `/takam-calculator?share=TOKEN`
5. שליחה: WhatsApp / email / העתק קישור

### כניסה מקישור שיתוף
- **view**: מסך סטטי בלי login, כמו המצב הקיים (URL hash)
- **edit**: 
  1. בודק אם המשתמש מחובר
  2. אם לא → מפנה ל-login ואחרי חזרה
  3. בודק ב-`calculation_shares` שיש הרשאת edit
  4. טוען את החישוב לוויזארד עם יכולת עריכה מלאה

## רכיבי UI

### כפתור "החישובים שלי"
- ממוקם בהדר של TakamCalculator, ליד הכותרת
- מוצג רק למשתמשים מחוברים
- Badge עם מספר חישובים שמורים

### פאנל היסטוריה (Slide Panel)
- נפתח מימין (RTL)
- רקע חצי-שקוף מאחורי
- רשימת כרטיסים עם: שם, משרד, סכום, תאריך, תפקידים, תקופה
- כפתורי: טען, מחק, שתף
- ריק: "אין חישובים שמורים עדיין"

### כרטיסיית דשבורד
- עיצוב תואם לכרטיסיות קיימות
- 3-5 חישובים אחרונים בלבד
- שם + סכום + תאריך

### דיאלוג שיתוף
- מחליף/מרחיב את תפריט השיתוף הקיים
- בחירת הרשאה (view/edit) עם toggle
- הצגת הקישור שנוצר
- כפתורי שליחה: WhatsApp, email, copy

## מבנה קבצים (חדשים)

```
src/modules/takam-calculator/
  HistoryPanel.tsx        — פאנל צד עם רשימת חישובים
  ShareDialog.tsx         — דיאלוג שיתוף מורחב
  useCalculationHistory.ts — hook לטעינה/שמירה/מחיקה מ-Supabase
```

## שינויים בקבצים קיימים

- `TakamCalculator.tsx` — כפתור "החישובים שלי", טעינת חישוב מ-URL share token
- `Step4Results.tsx` — כפתור "שמור", שיתוף מורחב
- `useCalculator.ts` — action חדש LOAD_CALCULATION
- `types.ts` — הוספת calculationId ל-CalcState
- `TakamCalculator.module.css` — סגנונות לפאנל ודיאלוג
- Dashboard page — כרטיסיית חישובים אחרונים
