# Platform Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the React + TypeScript + Vite project with Supabase auth, RTL Hebrew theme, and migrate the existing dashboard and topbar from HTML to React components.

**Architecture:** Single-page React app (Vite) with React Router for navigation. Supabase handles auth (email + Google OAuth). CSS custom properties ported from existing HTML files into a shared theme. Protected routes redirect unauthenticated users to /login.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, @supabase/supabase-js, Vitest + React Testing Library

---

## File Map

| File | Responsibility |
|------|---------------|
| `digitek-platform/src/styles/theme.css` | All CSS variables + global resets (ported from HTML) |
| `digitek-platform/src/lib/supabase.ts` | Supabase client singleton |
| `digitek-platform/src/hooks/useAuth.ts` | Auth state hook (session, user, loading) |
| `digitek-platform/src/components/Topbar.tsx` | Shared topbar component |
| `digitek-platform/src/components/ProtectedRoute.tsx` | Route guard — redirects to /login if not authenticated |
| `digitek-platform/src/pages/Login.tsx` | Login + Register page |
| `digitek-platform/src/pages/Dashboard.tsx` | Dashboard page — 6 module cards |
| `digitek-platform/src/App.tsx` | Router setup |
| `digitek-platform/src/main.tsx` | Entry point |
| `digitek-platform/supabase/migrations/001_profiles.sql` | profiles table + RLS |

---

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `digitek-platform/` (new directory at project root)

- [ ] **Step 1: Run Vite scaffold**

In the terminal, from `c:/Users/tomer/OneDrive/Desktop/CLAUDE_CODE_TOMER`:

```bash
npm create vite@latest digitek-platform -- --template react-ts
cd digitek-platform
npm install
```

Expected output: `✓ Done. Now run: cd digitek-platform && npm run dev`

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Configure Vitest in vite.config.ts**

Replace the contents of `digitek-platform/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `digitek-platform/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

In `digitek-platform/package.json`, add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Create .env file**

Create `digitek-platform/.env` (do NOT commit):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `digitek-platform/.env.example` (DO commit):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 7: Add .env to .gitignore**

In `digitek-platform/.gitignore`, add:

```
.env
.env.local
```

- [ ] **Step 8: Run dev server to verify scaffold works**

```bash
npm run dev
```

Expected: browser opens at `http://localhost:5173` with Vite default page.

- [ ] **Step 9: Commit**

```bash
cd ..
git add digitek-platform/
git commit -m "feat: scaffold Vite React TypeScript project"
```

---

### Task 2: Port CSS theme from HTML files

**Files:**
- Create: `digitek-platform/src/styles/theme.css`
- Modify: `digitek-platform/src/main.tsx`
- Delete: `digitek-platform/src/index.css`, `digitek-platform/src/App.css`

- [ ] **Step 1: Create theme.css**

Create `digitek-platform/src/styles/theme.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --teal: #0d9488;
  --teal2: #14b8a6;
  --teal3: #5eead4;
  --teal-pale: #f0fdfa;
  --teal-mid: #ccfbf1;
  --navy: #0f172a;
  --slate: #1e293b;
  --text: #0f172a;
  --text2: #475569;
  --text3: #94a3b8;
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --border2: #cbd5e1;
  --green: #10b981;
  --red: #ef4444;
  --amber: #f59e0b;
  --radius: 12px;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Heebo', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  direction: rtl;
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
}

a {
  text-decoration: none;
  color: inherit;
}

button {
  font-family: inherit;
}
```

- [ ] **Step 2: Update main.tsx to import theme**

Replace `digitek-platform/src/main.tsx`:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Delete unused CSS files**

```bash
rm digitek-platform/src/index.css digitek-platform/src/App.css
```

- [ ] **Step 4: Verify — run dev server**

```bash
cd digitek-platform && npm run dev
```

Expected: page background is `#f8fafc`, font is Heebo, direction is RTL.

- [ ] **Step 5: Commit**

```bash
cd ..
git add digitek-platform/src/styles/ digitek-platform/src/main.tsx
git commit -m "feat: port CSS theme variables from HTML to React"
```

---

### Task 3: Supabase client + profiles migration

**Files:**
- Create: `digitek-platform/src/lib/supabase.ts`
- Create: `digitek-platform/supabase/migrations/001_profiles.sql`

- [ ] **Step 1: Create Supabase client**

Create `digitek-platform/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Create profiles migration**

Create `digitek-platform/supabase/migrations/001_profiles.sql`:

```sql
-- Profiles: extends auth.users
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Run migration in Supabase dashboard**

1. פתח `supabase.com` → הפרויקט שלך
2. לחץ `SQL Editor` → `New query`
3. הדבק את תוכן `001_profiles.sql`
4. לחץ `Run`
5. Expected: `Success. No rows returned`

- [ ] **Step 4: Commit**

```bash
git add digitek-platform/src/lib/ digitek-platform/supabase/
git commit -m "feat: supabase client + profiles table migration"
```

---

### Task 4: useAuth hook

**Files:**
- Create: `digitek-platform/src/hooks/useAuth.ts`
- Create: `digitek-platform/src/test/hooks/useAuth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `digitek-platform/src/test/hooks/useAuth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../../hooks/useAuth'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

describe('useAuth', () => {
  it('starts with loading true and no user', async () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets loading false after session check', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd digitek-platform && npm run test:run
```

Expected: FAIL — `Cannot find module '../../hooks/useAuth'`

- [ ] **Step 3: Create useAuth hook**

Create `digitek-platform/src/hooks/useAuth.ts`:

```typescript
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signIn, signUp, signOut }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run
```

Expected: PASS — 2 tests passed

- [ ] **Step 5: Commit**

```bash
cd ..
git add digitek-platform/src/hooks/ digitek-platform/src/test/
git commit -m "feat: useAuth hook with session management"
```

---

### Task 5: Topbar component

**Files:**
- Create: `digitek-platform/src/components/Topbar.tsx`
- Create: `digitek-platform/src/components/Topbar.module.css`
- Create: `digitek-platform/src/test/components/Topbar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `digitek-platform/src/test/components/Topbar.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'

const renderTopbar = (props = {}) =>
  render(
    <BrowserRouter>
      <Topbar title="מחשבון תכ&quot;ם" showHomeLink={false} {...props} />
    </BrowserRouter>
  )

describe('Topbar', () => {
  it('renders the title', () => {
    renderTopbar()
    expect(screen.getByText(/מחשבון/)).toBeInTheDocument()
  })

  it('shows home link when showHomeLink is true', () => {
    renderTopbar({ showHomeLink: true })
    expect(screen.getByText('← דשבורד')).toBeInTheDocument()
  })

  it('hides home link when showHomeLink is false', () => {
    renderTopbar({ showHomeLink: false })
    expect(screen.queryByText('← דשבורד')).not.toBeInTheDocument()
  })

  it('renders user initial when userName is provided', () => {
    renderTopbar({ userName: 'תומר' })
    expect(screen.getByText('ת')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd digitek-platform && npm run test:run
```

Expected: FAIL — `Cannot find module '../../components/Topbar'`

- [ ] **Step 3: Create Topbar component**

Create `digitek-platform/src/components/Topbar.tsx`:

```typescript
import { Link } from 'react-router-dom'
import styles from './Topbar.module.css'

interface TopbarProps {
  title: string
  subtitle?: string
  showHomeLink?: boolean
  badge?: string
  userName?: string
}

export function Topbar({
  title,
  subtitle = 'שירותי מחשוב, דאטה ובינה מלאכותית',
  showHomeLink = false,
  badge,
  userName,
}: TopbarProps) {
  const initial = userName ? userName[0] : null

  return (
    <div className={styles.topbar}>
      <Link to="/" className={styles.logo}>🏛️</Link>
      <span className={styles.title}>{title}</span>
      <div className={styles.sep} />
      <span className={styles.sub}>{subtitle}</span>
      <div className={styles.spacer} />
      {showHomeLink && (
        <Link to="/" className={styles.homeLink}>← דשבורד</Link>
      )}
      {badge && (
        <div className={styles.badge}>
          <div className={styles.badgeDot} />
          {badge}
        </div>
      )}
      {initial && (
        <div className={styles.avatar}>{initial}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create Topbar.module.css**

Create `digitek-platform/src/components/Topbar.module.css`:

```css
.topbar {
  height: 60px;
  background: var(--navy);
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 14px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--teal), var(--teal2));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  text-decoration: none;
  transition: opacity 0.15s, transform 0.15s;
}

.logo:hover {
  opacity: 0.8;
  transform: scale(1.08);
}

.title {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.3px;
}

.sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.spacer {
  flex: 1;
}

.homeLink {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 8px;
  transition: all 0.15s;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.homeLink:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.badge {
  background: rgba(13, 148, 136, 0.2);
  border: 1px solid rgba(20, 184, 166, 0.35);
  border-radius: 20px;
  padding: 5px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--teal3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.badgeDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--teal3);
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--slate);
  border: 2px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test:run
```

Expected: PASS — all tests pass

- [ ] **Step 6: Commit**

```bash
cd ..
git add digitek-platform/src/components/
git commit -m "feat: Topbar React component with CSS modules"
```

---

### Task 6: Login page

**Files:**
- Create: `digitek-platform/src/pages/Login.tsx`
- Create: `digitek-platform/src/pages/Login.module.css`

- [ ] **Step 1: Create Login.tsx**

Create `digitek-platform/src/pages/Login.tsx`:

```typescript
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './Login.module.css'

type Mode = 'login' | 'register'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError('אימייל או סיסמה שגויים')
      } else {
        navigate('/')
      }
    } else {
      if (!fullName.trim()) {
        setError('נא להזין שם מלא')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, fullName)
      if (error) {
        setError(error.message)
      } else {
        setError(null)
        // Show success message
        setMode('login')
        setError('חשבון נוצר בהצלחה — אנא אמת את האימייל שלך')
      }
    }

    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🏛️</div>
        <h1 className={styles.title}>[שם המערכת]</h1>
        <p className={styles.sub}>שירותי מחשוב, דאטה ובינה מלאכותית</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => setMode('login')}
            type="button"
          >
            כניסה
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => setMode('register')}
            type="button"
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>שם מלא</label>
              <input
                className={styles.input}
                type="text"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>אימייל</label>
            <input
              className={styles.input}
              type="email"
              placeholder="name@gov.il"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>סיסמה</label>
            <input
              className={styles.input}
              type="password"
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Login.module.css**

Create `digitek-platform/src/pages/Login.module.css`:

```css
.page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 40px 36px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.logo {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--teal), var(--teal2));
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin: 0 auto 16px;
}

.title {
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 4px;
}

.sub {
  font-size: 13px;
  color: var(--text3);
  margin-bottom: 28px;
}

.tabs {
  display: flex;
  background: var(--bg);
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 24px;
  gap: 4px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text3);
  cursor: pointer;
  transition: all 0.15s;
}

.tabActive {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: right;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text2);
}

.input {
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: var(--text);
  background: var(--surface);
  transition: border-color 0.15s;
  direction: ltr;
  text-align: right;
}

.input:focus {
  outline: none;
  border-color: var(--teal);
}

.error {
  font-size: 13px;
  color: var(--red);
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
}

.submit {
  padding: 12px;
  background: var(--teal);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}

.submit:hover:not(:disabled) {
  background: var(--teal2);
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add digitek-platform/src/pages/Login.tsx digitek-platform/src/pages/Login.module.css
git commit -m "feat: Login and Register page"
```

---

### Task 7: Dashboard page

**Files:**
- Create: `digitek-platform/src/pages/Dashboard.tsx`
- Create: `digitek-platform/src/pages/Dashboard.module.css`

- [ ] **Step 1: Create Dashboard.tsx**

Create `digitek-platform/src/pages/Dashboard.tsx`:

```typescript
import { Link } from 'react-router-dom'
import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import styles from './Dashboard.module.css'

interface Module {
  id: string
  name: string
  desc: string
  icon: string
  iconBg: string
  href: string
  active: boolean
}

const MODULES: Module[] = [
  {
    id: 'calculator',
    name: 'מחשבון תכ"ם',
    desc: 'חישוב עלויות פרויקט — כוח אדם, תשתיות וחומרה',
    icon: '🧮',
    iconBg: '#f0fdfa',
    href: '/calculator',
    active: true,
  },
  {
    id: 'briefs',
    name: 'מחולל בריפים',
    desc: 'יצירת בריף פרויקט אוטומטי',
    icon: '📄',
    iconBg: '#eff6ff',
    href: '/briefs',
    active: false,
  },
  {
    id: 'layer5',
    name: 'רובד 5',
    desc: 'ניהול תקציב ורמות אישור',
    icon: '⚖️',
    iconBg: '#faf5ff',
    href: '/layer5',
    active: false,
  },
  {
    id: 'committees',
    name: 'ועדות משפטיות',
    desc: 'מסלול העלאת בריף עם ועדות',
    icon: '🏛️',
    iconBg: '#fffbeb',
    href: '/committees',
    active: false,
  },
  {
    id: 'signatories',
    name: 'מורשי חתימה',
    desc: 'ניהול הרשאות חתימה',
    icon: '✍️',
    iconBg: '#fff1f2',
    href: '/signatories',
    active: false,
  },
  {
    id: 'vendors',
    name: 'ספקים זוכים',
    desc: 'רשימת ספקים זוכים — דיגיטק',
    icon: '🏆',
    iconBg: '#f0fdf4',
    href: '/vendors',
    active: false,
  },
]

const activeCount = MODULES.filter(m => m.active).length

export function Dashboard() {
  const { user, signOut } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || 'משתמש'

  return (
    <>
      <Topbar
        title="[שם המערכת]"
        badge="Beta"
        userName={fullName}
      />
      <div className={styles.main}>
        <div className={styles.welcome}>
          <div className={styles.greeting}>שלום {firstName} 👋</div>
          <div className={styles.welcomeSub}>בחר מודול להתחיל</div>
        </div>

        <div className={styles.secHeader}>
          <span className={styles.secTitle}>מודולים</span>
          <span className={styles.secCount}>{MODULES.length} מודולים · {activeCount} פעיל</span>
        </div>

        <div className={styles.grid}>
          {MODULES.map(mod =>
            mod.active ? (
              <Link key={mod.id} to={mod.href} className={styles.card}>
                <div className={styles.icon} style={{ background: mod.iconBg }}>{mod.icon}</div>
                <div className={styles.name}>{mod.name}</div>
                <div className={styles.desc}>{mod.desc}</div>
                <div className={styles.arrow}>←</div>
              </Link>
            ) : (
              <div key={mod.id} className={`${styles.card} ${styles.soon}`}>
                <div className={styles.soonBadge}>בקרוב</div>
                <div className={styles.icon} style={{ background: mod.iconBg }}>{mod.icon}</div>
                <div className={styles.name}>{mod.name}</div>
                <div className={styles.desc}>{mod.desc}</div>
              </div>
            )
          )}
        </div>

        <div className={styles.footer}>מערכת בפיתוח פעיל · גרסה 0.1 · 2026</div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create Dashboard.module.css**

Create `digitek-platform/src/pages/Dashboard.module.css`:

```css
.main {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.welcome {
  margin-bottom: 36px;
}

.greeting {
  font-size: 26px;
  font-weight: 900;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.welcomeSub {
  font-size: 15px;
  color: var(--text3);
}

.secHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.secTitle {
  font-size: 13px;
  font-weight: 700;
  color: var(--text3);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.secCount {
  font-size: 12px;
  color: var(--text3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2px 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 40px;
}

.card {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 22px 20px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: block;
  position: relative;
  overflow: hidden;
  color: var(--text);
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.04), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.card:not(.soon):hover {
  border-color: var(--teal);
  box-shadow: 0 6px 24px rgba(13, 148, 136, 0.12);
  transform: translateY(-2px);
}

.card:not(.soon):hover::before {
  opacity: 1;
}

.soon {
  cursor: default;
  opacity: 0.6;
  pointer-events: none;
}

.soonBadge {
  position: absolute;
  top: 14px;
  left: 14px;
  background: #f1f5f9;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text3);
  letter-spacing: 0.3px;
}

.icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 14px;
}

.name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 5px;
}

.desc {
  font-size: 12px;
  color: var(--text3);
  line-height: 1.5;
}

.arrow {
  position: absolute;
  bottom: 18px;
  left: 18px;
  font-size: 16px;
  color: var(--border2);
  transition: all 0.2s;
}

.card:not(.soon):hover .arrow {
  color: var(--teal);
  transform: translateX(-3px);
}

.footer {
  text-align: center;
  color: var(--text3);
  font-size: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}
```

- [ ] **Step 3: Commit**

```bash
cd ..
git add digitek-platform/src/pages/Dashboard.tsx digitek-platform/src/pages/Dashboard.module.css
git commit -m "feat: Dashboard page — 6 module cards, active/soon states"
```

---

### Task 8: ProtectedRoute + Router setup

**Files:**
- Create: `digitek-platform/src/components/ProtectedRoute.tsx`
- Modify: `digitek-platform/src/App.tsx`

- [ ] **Step 1: Create ProtectedRoute**

Create `digitek-platform/src/components/ProtectedRoute.tsx`:

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text3)',
        fontSize: '14px',
      }}>
        טוען...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Replace App.tsx with router**

Replace `digitek-platform/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
cd digitek-platform && npm run test:run
```

Expected: all tests pass

- [ ] **Step 4: Run dev server and verify full flow**

```bash
npm run dev
```

Expected:
1. פתח `http://localhost:5173` — מנותב אוטומטית ל-`/login`
2. דף Login מוצג עם tabs כניסה/הרשמה
3. אחרי הרשמה/כניסה — מנותב ל-`/` עם Dashboard
4. Dashboard מציג 6 כרטיסיות, Topbar עם שם משתמש

- [ ] **Step 5: Final commit**

```bash
cd ..
git add digitek-platform/src/
git commit -m "feat: platform foundation — auth, routing, dashboard complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ React + TypeScript + Vite scaffold
- ✅ Supabase client + profiles table
- ✅ Auth (email login + register)
- ✅ Protected routes
- ✅ Dashboard migration (6 cards, active/soon)
- ✅ Topbar component (shared)
- ✅ CSS theme variables ported

**Not in this plan (separate plans):**
- Calculator migration → Plan 2
- Stripe subscriptions → Plan 3
- Brief Generator → Plan 4
- Google OAuth (requires Supabase dashboard config — documented in Plan 3)
