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
**כל מפת הדרכים ממומשת + merge לפרודקשן (21.08.2026)** — פאזה 4b (ערכות עיצוב פר-מסלול, ייצוא HTML עצמאי, OG previews לווטסאפ) הושלמה ובוצע merge develop→main. **פרודקשן: https://tripshare-beta.vercel.app**. נותר לתומר: הוספת כתובת הפרודקשן ל-Redirect URLs ב-Supabase (בשביל Google login בפרודקשן).

**פאזות 2+3+4a הושלמו (21.08.2026)** — פרופיל ציבורי, פיד עוקבים, Google, צפיות, ציון משוקלל, התראות, **AI Trip Builder** (Gemini — תיאור חופשי → מסלול מלא בוויזרד) ופיד מומלצים. נותר: QA תומר → merge ל-main. פאזה 4b עתידית (ערכות עיצוב, ייצוא, OG).

**פאזה 2 הושלמה (21.08.2026)** — פרופיל ציבורי `/u/:username`, פיד עוקבים, כפתור Google. ערכת UI חדשה: **Arctic Minimal** (לבן + כחול חשמלי, מוקאפ A נבחר מ-3). ממתין: QA תומר, merge ל-main, הוספת redirect URLs של TripShare בדשבורד Supabase coe-hub (ל-Google login).

**פאזה 1 הושלמה (19.08.2026)** — ויזרד מלא + TripView + auth + מדיה, עומד בתקן הארכיטקטורה המלאה (GitHub פרטי tomersananes10-spec/tripshare + Vercel git-connect + env vars + סכמת trips עם RLS ב-coe-hub). QA דפדפן בוצע כולל מובייל. ממתין ל-QA ידני של תומר ול-merge ל-main.

> ⚠️ **חובה ביום הראשון של הקוד**: הקמה לפי תקן "ארכיטקטורה מלאה" ([_INDEX.md](_INDEX.md)) — ריפו GitHub פרטי + `vercel git connect` + env vars בכל סביבות Vercel + סכמת trips עם RLS. לא בונים קודם ומחברים אחר-כך.

## צעדים פתוחים
- [ ] QA ידני של תומר ב-Vercel preview → merge ל-main
- [ ] פאזה 2: פרסום + פיד + פרופיל + עוקבים + Google OAuth
- [ ] החלטות פתוחות: שם המוצר הסופי, שפת העיצוב (SPEC סעיף 11)

## יומן
| תאריך | מה נעשה | צעד הבא |
|--------|----------|----------|
| 16.08.2026 | brainstorming + אפיון מלא (SPEC.md) אושר | תוכנית מימוש פאזה 1 |
| 18.08.2026 | הוקצתה סכמת `trips` ב-coe-hub (ארכיטקטורת מחיצות) | — |
| 19.08.2026 | פאזה 1 מלאה — 16 משימות SDD: ויזרד 9 בלוקים, TripView, auth, מדיה, GitHub+Vercel, QA דפדפן | QA של תומר → merge → פאזה 2 |
| 20.08.2026 | פאזה 1.5 — הבית החברתי (A+C): פיד+לייקים+onboarding+פרסום+פרופיל, 5 מסלולי דוגמה, QA מלא | QA של תומר → merge ל-main |
| 20.08.2026 | פאזה 1.6 — נאמנות מלאה למוקאפים: A=בית (עמודת צד, טאב-בר, עקוב/שמור/שתף), C=פרופיל (נקודות, באדג'ים, טלפון), תגובות+דירוגים | QA של תומר → merge ל-main |
| 21.08.2026 | רענון UI ל-Arctic Minimal (3 מוקאפים → A נבחר) + תיקוני פוליש (מרכוז, סטוריז, טופבר) + **פאזה 2**: פרופיל ציבורי /u/:username, פיד עוקבים, כפתור Google (redirect URLs נוספו ע"י תומר) + **פאזה 3**: מונה צפיות + ציון משוקלל + מערכת התראות (פעמון חי, migration 005, טריגרים) | QA תומר → merge ל-main |
| 21.08.2026 | **פאזה 4a**: AI Trip Builder (api/ai-trip + Gemini structured output + מסך יצירה דו-מסלולי) + פיד "🔥 מומלצים". תקלת env ב-vercel CLI אובחנה ותוקנה דרך REST API. E2E חי אומת | QA תומר → merge ל-main |
| 21.08.2026 | **פאזה 4b + merge לפרודקשן**: ערכות עיצוב (migration 006 + themes.ts + סלקטור בוויזרד), ייצוא HTML עצמאי (exportHtml + כפתור לבעלים), OG previews (api/og-trip + bot-UA rewrite — אומת חי מול UA של ווטסאפ). merge develop→main → tripshare-beta.vercel.app | תומר: production URL ל-Redirect URLs ב-Supabase; אפיון פונקציונלי |
| 23.08.2026 | Redirect URL של הפרודקשן נוסף ע"י תומר (Google login מלא). **הגדרות פרופיל + PWA** (`a69d6f1` ל-develop): migration 007 (phone/location/is_public + bucket avatars), העלאת תמונת פרופיל + כרטיסי פרטים/אבטחה/פרטיות ב-/profile, Avatar בכל המערכת, פרופיל ציבורי מכבד פרטיות, manifest+אייקונים ל"הוסף למסך הבית". QA חי מלא כולל 390px | QA תומר ב-preview → merge ל-main; אפיון פונקציונלי |
