# Digitek Platform — ארכיטקטורה ראשית

**תאריך:** 2026-03-31
**סטטוס:** מאושר

---

## מה בונים

מערכת SaaS ממשלתית-עסקית לניהול פרויקטי דיגיטק. כוללת כלים (מחשבון תכ"ם, מחולל בריפים, ועוד), ניהול קבצים, הרשאות per ארגון, ומנויים בתשלום.

---

## Stack

| שכבה | טכנולוגיה | סיבה |
|------|-----------|-------|
| Frontend | React + TypeScript + Vite | מהיר לפתח, ecosystem עשיר |
| DB + Auth + Storage + Realtime | Supabase | הכל managed, Row Level Security מובנה |
| Payments | Stripe | תמיכה ב-individual + org subscriptions |
| Deploy | Vercel | deploy אוטומטי מ-GitHub, חינם |

---

## מבנה הפרויקט

```
digitek-platform/
├── src/
│   ├── pages/           # מסכים ראשיים
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Pricing.tsx
│   │   └── ...
│   ├── modules/         # לוגיקה per פיצ'ר
│   │   ├── calculator/
│   │   ├── brief-generator/
│   │   └── ...
│   ├── components/      # רכיבים משותפים
│   │   ├── Topbar.tsx
│   │   ├── ModuleCard.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts  # supabase client
│   │   └── stripe.ts    # stripe client
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSubscription.ts
│   │   └── useTenant.ts
│   ├── styles/
│   │   └── theme.css    # CSS variables משותפים לכל הפרויקט
│   └── data/
│       └── clusters.ts  # נתוני האשכולות (static)
├── supabase/
│   └── migrations/      # schema של ה-DB
└── public/
```

---

## מודל נתונים (Supabase / PostgreSQL)

```sql
-- משתמשים (מורחב מ-auth.users של Supabase)
profiles
  id            uuid (FK → auth.users)
  full_name     text
  avatar_url    text
  created_at    timestamp

-- ארגונים
organizations
  id            uuid
  name          text
  type          enum: 'government' | 'private' | 'individual'
  created_at    timestamp

-- חברות בארגון
memberships
  id            uuid
  user_id       uuid (FK → profiles)
  org_id        uuid (FK → organizations)
  role          enum: 'admin' | 'member'
  created_at    timestamp

-- מנויים
subscriptions
  id            uuid
  user_id       uuid nullable (individual)
  org_id        uuid nullable (org)
  plan          enum: 'basic' | 'pro' | 'enterprise'
  stripe_subscription_id  text
  status        enum: 'active' | 'canceled' | 'past_due'
  current_period_end      timestamp

-- פרויקטים (מחשבונים, בריפים, וכו')
projects
  id            uuid
  owner_id      uuid (FK → profiles)
  org_id        uuid nullable (FK → organizations)
  name          text
  type          enum: 'calculator' | 'brief' | ...
  data          jsonb  (תוכן הפרויקט)
  created_at    timestamp
  updated_at    timestamp

-- קבצים
files
  id            uuid
  project_id    uuid nullable (FK → projects)
  owner_id      uuid (FK → profiles)
  org_id        uuid nullable
  storage_path  text
  name          text
  size          bigint
  created_at    timestamp
```

**Row Level Security:** כל user רואה רק rows שבהם `owner_id = auth.uid()` או שהוא חבר בארגון הרלוונטי.

---

## רמות מנוי

| תכונה | Basic | Pro | Enterprise |
|-------|-------|-----|------------|
| מחשבון תכ"ם | ✅ | ✅ | ✅ |
| מחולל בריפים | מוגבל | ✅ | ✅ |
| שמירת פרויקטים | 3 | ללא הגבלה | ללא הגבלה |
| העלאת קבצים | ❌ | ✅ 1GB | ✅ 10GB |
| ניהול ארגון + משתמשים | ❌ | ❌ | ✅ |
| Stripe plan ID | `basic` | `pro` | `enterprise` |

---

## זרימת משתמש

1. משתמש מגיע → דף שיווק / Login
2. הרשמה → Supabase Auth (email או Google OAuth)
3. בחירת מנוי → Stripe Checkout
4. אחרי תשלום → Webhook מ-Stripe מעדכן `subscriptions` ב-DB
5. Dashboard → רואה modules לפי רמת המנוי שלו
6. כל פעולה (שמירה, העלאת קובץ) → נבדקת מול subscription בזמן אמת

---

## Migration מה-HTML הקיים

| קובץ נוכחי | יעד ב-React |
|------------|-------------|
| `dashboard.html` | `src/pages/Dashboard.tsx` |
| `takam-calculator.html` | `src/modules/calculator/` |
| CSS variables ב-`:root` | `src/styles/theme.css` |

העיצוב עובר **ללא שינוי** — אותם צבעים, אותו Heebo, אותו RTL. המשתמש לא ירגיש הבדל.

---

## מה לא בספק הזה

- תוכן ספציפי לכל module (brief-generator, רובד 5, וכו') — כל module יקבל spec נפרד
- דף שיווק / landing page
- לוגיקת Stripe Webhooks המפורטת
- Admin panel לניהול כל המשתמשים

---

## סדר פיתוח מומלץ

1. **Scaffold** — Vite + React + TypeScript + Supabase + Tailwind/CSS vars
2. **Auth** — Login, Register, Google OAuth
3. **Dashboard** — migration מ-HTML, הצגה לפי subscription
4. **Calculator** — migration מ-HTML עם שמירה ל-DB
5. **Subscriptions** — Stripe integration
6. **Brief Generator** — פיצ'ר חדש על הארכיטקטורה החדשה
7. **Files** — Supabase Storage
8. **Org management** — Enterprise tier
