# COE Recruit — מערכת גיוס ובחינת מועמדים

## תעודת זהות
- **תיקייה**: `coe-recruit/` — ריפו git מקומי נפרד
- **מסמך מלא**: `coe-recruit/CLAUDE.md` — חובה לקרוא לפני עבודה
- **פרודקשן**: https://coe-recruit-sigma.vercel.app (שים לב: בלי `-sigma` זה אתר של מישהו אחר!)
- **DB**: Supabase `coe-hub` — **סכמת `recruit`** (client עם `db:{schema:'recruit'}`), bucket `recruit-cvs`
- **תפקידים**: admin (הכל) · interviewer (עיוור — RLS חוסם ציונים/החלטות/מבחנים/ראיונות אחרים) · viewer (קריאה בלבד)
- **הרשמה**: חופשית → pending → אישור מנהל ב-⚙️ ניהול · תומר = admin
- **מקור**: נולד מ-`קוח/screening-results.html` (נשאר כגיבוי + עותק בשולחן העבודה)

## איך עובדים
- deploy: `npx vercel pull --yes --environment production && npx vercel build --prod && npx vercel deploy --prebuilt --prod --yes`
- migrations דרך Supabase MCP על coe-hub — הכול בסכמת recruit בלבד
- משתמשי QA: qa-admin/qa-interviewer/qa-viewer@recruit.test (מושבתים; הפעלה זמנית ב-⚙️ ניהול)

## סטטוס נוכחי
חי ומלא: מכרז 31-2026 + 29 מועמדים + קו"ח. מסכים: מפ"ל, מבחנים, ראיונות, סיכום, ניהול.

## צעדים פתוחים
- [ ] כניסה ראשונה של תומר + ייבוא ה-JSON מהמערכת הישנה (⚙️ ניהול → ייבוא)
- [ ] אופציונלי: הוספת הכתובת ל-Redirect URLs ב-Supabase כדי ש-magic link יחזור לכאן
- [ ] הזמנת מראיינים אמיתיים (נרשמים → תומר מאשר כ"מראיין")

## יומן
| תאריך | מה נעשה | צעד הבא |
|--------|----------|----------|
| 18.08.2026 | הקמה מלאה E2E + deploy + QA לכל תפקיד | כניסת תומר + ייבוא JSON |
| 18.08.2026 | הגירה למחיצת סכמה `recruit` (migration 004) + QA חוזר | — |
