# COE Hub — ניהול יחידת הדאטה והבינה המלאכותית

## תעודת זהות
> ✅ עומדת בתקן "ארכיטקטורה מלאה" ([_INDEX.md](_INDEX.md)) — GitHub + auto-deploy + Supabase/RLS + env ב-Vercel (מ-19.08.2026)
- **תיקייה**: `COE/coe-hub-web/` — ריפו git נפרד, **נפרד לחלוטין מ-LIBA**
- **GitHub**: https://github.com/tomersananes10-spec/coe-hub (private, מ-19.08)
- **מסמך מלא**: `COE/coe-hub-web/CLAUDE.md` — חובה לקרוא לפני עבודה
- **פרודקשן**: https://coe-hub.vercel.app — **deploy אוטומטי**: push ל-main → production (כמו ליבה)
- **DB**: Supabase `coe-hub` (`aukflcgnzzppxnimyrcw`) — סכמת `public` (לצד סכמות recruit/trips של אפליקציות אחרות)
- **Auth**: magic link + סיסמה + Google · תפקידים admin/team/viewer ב-`profiles` · RLS פעיל מ-05.08.2026
- **מודולים**: משרדים (40+), פרויקטי AI, פעילויות, קורסים, קבצים, תקציב (8 טבלאות), מפת צוות, Smart Command (Gemini)

## איך עובדים
- styling גלובלי ב-theme.css (לא CSS Modules) · עברית RTL · חינמי בלבד
- **אסור לגעת בסכמות recruit/trips** מהאפליקציה הזו
- OAuth של Google: הסוד `****3g8u` משמש את LIBA — לא למחוק; ל-COE סוד נפרד

## סטטוס נוכחי
פאזות 1-4 הושלמו, RLS מלא, חי ובשימוש.

## צעדים פתוחים
- [ ] (לרשום כאן כשעולה צורך)

## יומן
| תאריך | מה נעשה | צעד הבא |
|--------|----------|----------|
| 08.08.2026 | אבחון OAuth — סוד נפרד ל-COE, מיפוי הצרכנים | — |
| 19.08.2026 | GitHub פרטי + חיבור ל-Vercel — deploy אוטומטי מ-push | — |
