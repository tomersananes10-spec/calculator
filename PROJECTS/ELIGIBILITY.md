# Eligibility Engine — מנוע בדיקת זכאות

## תעודת זהות
- **תיקייה**: `eligibility-engine/` (בתוך הריפו הראשי)
- **מהות**: העלאת קו"ח (PDF/DOCX) → מנוע keyword → בדיקת עמידה בתנאי סף של משרות
- **DB**: Supabase **coe-hub** (`aukflcgnzzppxnimyrcw`), סכמת `eligibility` (מחיצה פר-אפליקציה, לצד public/recruit/trips) — **פעיל**
- **Frontend**: https://eligibility-engine-sigma.vercel.app (Vercel, פרוס דרך CLI). client עם `db:{schema:'eligibility'}`
- **סטטוס**: הוגר מ-DB עצמאי מושהה ל-coe-hub ב-31.08.2026 (לפני הקפאה לצמיתות). שלבים 1-4 (מנוע, דשבורד, העלאת קבצים); `VITE_BYPASS_AUTH=true` (עדיין בלי auth אמיתי)

## מבנה DB (סכמת eligibility ב-coe-hub)
- `candidates`, `eligibility_checks` (FK→candidates), `decisions` (FK→checks, cascade), `audit_log`
- triggers: `check_created` על insert לצ'ק, `decision_made` על insert להחלטה → כותבים ל-audit_log
- RLS: פרמיסיבי ל-anon+authenticated (כלי פנימי, BYPASS auth), scoped לסכמה בלבד
- storage bucket `cv-files` (מדולג ב-BYPASS mode כי אין userId)
- הסכמה חשופה ל-Data API דרך `pgrst.db_schemas` על role authenticator

## פתוח
- **נתונים היסטוריים**: הסכמה נבנתה מהקוד (structure), נטענה נקייה. אם צריך את הנתונים הישנים — להוריד גיבוי מ-`ksosadyupiflqselvybv` (ניתן גם אחרי הקפאה) ולייבא
- **פרויקט Supabase ישן** `ksosadyupiflqselvybv` — להשאיר להיקפא, או למחוק ידנית אחרי גיבוי
- החייאה מלאה = auth אמיתי (כיבוי BYPASS) + RLS פר-משתמש; חפיפה רעיונית עם מסך המפ"ל של COE-Recruit — לשקול איחוד

## יומן
| תאריך | מה נעשה | צעד הבא |
|--------|----------|----------|
| 21.06.2026 | תיקון העלאת PDF ב-iOS Safari (pdfjs legacy build) | רדום |
| 31.08.2026 | **הגירה ל-coe-hub סכמת `eligibility`** לפני הקפאת ה-DB העצמאי — migration (4 טבלאות+triggers+RLS+grants), חשיפת סכמה ל-API, הפניית frontend (`db:{schema}`+env), deploy CLI, אימות חי (REST 200, 0 שגיאות) | ייבוא נתונים היסטוריים אם צריך |
