# LIBA — ניהול רכש ממשלתי (דיגיטק)

## תעודת זהות
> ✅ עומדת בתקן "ארכיטקטורה מלאה" ([_INDEX.md](_INDEX.md)) — GitHub + auto-deploy + Supabase/RLS + env ב-Vercel
- **תיקייה**: `digitek-platform/` (+ `api/` בשורש) — הריפו הראשי, ענף עבודה `develop`
- **GitHub**: https://github.com/tomersananes10-spec/calculator (develop→preview, main→production)
- **מסמך מלא**: [CLAUDE.md](../CLAUDE.md) בשורש — חובה לקרוא לפני עבודה
- **פרודקשן**: https://calculator-ashen-delta-32.vercel.app (develop→preview, main→production)
- **DB**: Supabase `digitek-dev` (`ildwyncxoytvallkrqjo`) — בלעדי ל-LIBA
- **מודולים**: מחשבון תכ"ם, מחשבון AI/ML, מחולל בריפים, Tenders CRM (מורשי חתימה, 9 שלבים T0-T8), רובד 5, ספקים זוכים (טק/דיגיטל), מרכז ידע

## איך עובדים
- commit = commit + push ל-develop · אחרי כל commit — שורת היסטוריה ב-CLAUDE.md הראשי
- `npx tsc --noEmit` לפני commit · מובייל 390px ב-Playwright אחרי כל שינוי UI
- באגים: אבחון והצגה → אישור → תיקון · אין לשנות calc.ts / data.ts / theme.css בלי אישור

## סטטוס נוכחי
Tenders CRM שלם (9 שלבים, מורשי חתימה, פינגפונג אישורים, multi-signer AND). ספקים טק/דיגיטל עם טוגל. רובד 5 מסונכרן שבועית מ-Google Sheets דרך pg_cron.

## צעדים פתוחים
- [ ] QA ידני של תומר: `/suppliers` (פיצול טק/דיגיטל), Tenders E2E על 9 השלבים
- [ ] ארכיטקטורת cron להתראות (סעיף 11 ב-CLAUDE.md — pg_cron מומלץ)
- [ ] שיפורי גוף מייל (תרגום request_type, דומיין, טמפלייט)
- [ ] מודול פרוטוקולים (עתידי, מקביל למחולל בריפים)

## יומן
| תאריך | מה נעשה | צעד הבא |
|--------|----------|----------|
| 07.08.2026 | פיצול ספקים טק/דיגיטל (מוקאפ A) end-to-end | QA ידני של תומר |
