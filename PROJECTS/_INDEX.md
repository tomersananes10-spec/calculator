# 🗂 מפת הפרויקטים של תומר

> **איך זה עובד**: בתחילת יום עבודה על פרויקט — אומרים לקלוד "עבוד על X" והוא קורא את `PROJECTS/X.md` תחילה.
> **בסוף כל סשן** — קלוד מעדכן את היומן בקובץ של הפרויקט שנגעו בו (שורה אחת: תאריך + מה נעשה + מה הצעד הבא).

| קובץ | פרויקט | סטטוס | כתובת חיה |
|------|--------|--------|-----------|
| [LIBA.md](LIBA.md) | LIBA — ניהול רכש ממשלתי (דיגיטק) | 🟢 חי בפרודקשן | calculator-ashen-delta-32.vercel.app |
| [COE-HUB.md](COE-HUB.md) | COE Hub — ניהול יחידת הדאטה וה-AI | 🟢 חי בפרודקשן | coe-hub.vercel.app |
| [COE-RECRUIT.md](COE-RECRUIT.md) | מערכת גיוס ובחינת מועמדים | 🟢 חי בפרודקשן | coe-recruit-sigma.vercel.app |
| [TRIPSHARE.md](TRIPSHARE.md) | רשת חברתית למסלולי טיולים (מיזם אישי) | 🟡 אפיון מאושר, טרם קודד | — |
| [ELIGIBILITY.md](ELIGIBILITY.md) | מנוע בדיקת זכאות (קו"ח מול תנאי סף) | ⚪ רדום | — |
| [MASTER-CONTRACTORS.md](MASTER-CONTRACTORS.md) | קבלני מסגרת — הגירה מ-Lovable | 🟡 תוכנית מוכנה, ממתין לביצוע | — |

## 🏗 תקן "ארכיטקטורה מלאה" — מחייב לכל מערכת חיה (נקבע 19.08.2026)

כל מערכת בפרודקשן חייבת לעמוד ב-5 התנאים, וכל מערכת חדשה מוקמת איתם מיום אחד:

1. **GitHub** — ריפו פרטי תחת `tomersananes10-spec` (גיבוי קוד מרוחק + היסטוריה)
2. **Deploy אוטומטי** — הריפו מחובר לפרויקט Vercel (`vercel git connect`): push → build בענן → production. בלי deploy ידני
3. **Supabase + RLS** — סכמה ייעודית פר-אפליקציה (בעולם COE) או DB ייעודי (LIBA), עם RLS שנאכף ב-DB ולא רק ב-UI
4. **Env vars ב-Vercel** — מוגדרים ב-Production + Preview + Development (לא רק ב-`.env.local` מקומי)
5. **תיעוד** — CLAUDE.md בתיקיית הפרויקט + קובץ ב-PROJECTS/ עם יומן מעודכן

**סטטוס עמידה בתקן:**

| מערכת | GitHub | Auto-deploy | Supabase+RLS | Env ב-Vercel |
|---|---|---|---|---|
| LIBA | ✅ `calculator` | ✅ | ✅ digitek-dev | ✅ |
| COE Hub | ✅ `coe-hub` (19.08) | ✅ אומת חי | ✅ סכמת public | ✅ |
| COE Recruit | ✅ `coe-recruit` (19.08) | ✅ אומת חי | ✅ סכמת recruit | ✅ |
| TripShare | ⬜ יוקם עם תחילת הקוד | ⬜ | סכמת trips שמורה | ⬜ |

## תשתית משותפת (החלטת ארכיטקטורה 18.08.2026)

```
Supabase digitek-dev  ← LIBA בלבד. לא נוגעים ממקומות אחרים.
Supabase coe-hub      ← כל השאר, מחיצת סכמה פר-אפליקציה:
  ├── public   = COE Hub
  ├── recruit  = מערכת הגיוס
  └── trips    = TripShare (שמור, ריק)
```

- אין פרויקט Supabase שלישי (מגבלת 2 חינמיים) · הכול free tier בלבד
- מיזם חדש = סכמה חדשה ב-coe-hub + חשיפה ל-API (דוגמה: migration 004 של coe-recruit)
- keep-alive יומי (GitHub Actions על main של הריפו הראשי) מפנג את שני הפרויקטים
