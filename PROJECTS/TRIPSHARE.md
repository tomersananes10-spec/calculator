# TripShare — רשת חברתית למסלולי טיולים (מיזם אישי)

## תעודת זהות
- **תיקייה**: `tripshare/` — ריפו נפרד (עתידי)
- **מסמכים**: `tripshare/CLAUDE.md` + **האפיון המחייב** `tripshare/docs/SPEC.md`
- **פרודקשן**: טרם — יוקם פרויקט Vercel נפרד
- **DB**: Supabase `coe-hub` — **סכמת `trips`** (כבר נוצרה ריקה, 18.08.2026). client עתידי עם `db:{schema:'trips'}` + חשיפה ל-API כמו migration 004 של coe-recruit
- **מהות**: ויזרד בניית מסלול מבלוקים → מנוע רינדור (TripView) → פיד חברתי, פרופילים, עוקבים

## איך עובדים
- Stack כמו LIBA: React 19 + Vite + CSS Modules + theme.css · RTL Heebo · mobile-first
- `trip-model` הוא החוזה המרכזי — שינוי בו = עדכון ויזרד + TripView + schema_version
- 4 פאזות ב-SPEC · חינמי בלבד · Google OAuth נפרד (לא של LIBA) או בלי Google בהתחלה

## סטטוס נוכחי
אפיון מלא נכתב ואושר (16.08.2026). אפס קוד.

> ⚠️ **חובה ביום הראשון של הקוד**: הקמה לפי תקן "ארכיטקטורה מלאה" ([_INDEX.md](_INDEX.md)) — ריפו GitHub פרטי + `vercel git connect` + env vars בכל סביבות Vercel + סכמת trips עם RLS. לא בונים קודם ומחברים אחר-כך.

## צעדים פתוחים
- [ ] תוכנית מימוש לפאזה 1 (skill: superpowers:writing-plans) → פיתוח
- [ ] החלטות פתוחות: שם המוצר הסופי, שפת העיצוב (SPEC סעיף 11)

## יומן
| תאריך | מה נעשה | צעד הבא |
|--------|----------|----------|
| 16.08.2026 | brainstorming + אפיון מלא (SPEC.md) אושר | תוכנית מימוש פאזה 1 |
| 18.08.2026 | הוקצתה סכמת `trips` ב-coe-hub (ארכיטקטורת מחיצות) | — |
