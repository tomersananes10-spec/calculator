import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'register' | 'forgot'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const authError = searchParams.get('auth_error')
    if (authError) setError('כניסה עם Google נכשלה: ' + authError)
  }, [searchParams])

  const clearMessages = () => { setError(null); setSuccess(null) }

  const switchMode = (next: Mode) => { setMode(next); clearMessages() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) setError('אימייל או סיסמה שגויים')
        else navigate('/')
      } else if (mode === 'register') {
        if (!fullName.trim()) { setError('נא להזין שם מלא'); return }
        const { error } = await signUp(email, password, fullName)
        if (error) setError(error.message)
        else { switchMode('login'); setSuccess('חשבון נוצר — אנא אמת את האימייל שלך') }
      } else {
        const { error } = await resetPassword(email)
        if (error) setError('לא ניתן לשלוח קישור — בדוק את האימייל')
        else setSuccess('קישור לאיפוס נשלח לאימייל שלך')
      }
    } catch {
      setError('אירעה שגיאה, נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    clearMessages()
    setGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) { setError('כניסה עם Google נכשלה: ' + error.message); setGoogleLoading(false) }
      // on success: browser redirects — no need to reset loading
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה לא ידועה'
      setError('כניסה עם Google נכשלה: ' + msg)
      setGoogleLoading(false)
    }
  }

  const submitLabel = loading
    ? '...'
    : mode === 'login' ? 'כניסה'
    : mode === 'register' ? 'יצירת חשבון'
    : 'שלח קישור'

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoBox}>🏛️</div>
          <div style={s.logoName}>Digitek</div>
          <div style={s.logoSub}>שירותי מחשוב, דאטה ובינה מלאכותית</div>
        </div>

        {/* Tabs — login / register */}
        {mode !== 'forgot' && (
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(mode === 'login' ? s.tabActive : {}) }}
              onClick={() => switchMode('login')} type="button">כניסה</button>
            <button style={{ ...s.tab, ...(mode === 'register' ? s.tabActive : {}) }}
              onClick={() => switchMode('register')} type="button">הרשמה</button>
          </div>
        )}

        {/* Forgot header */}
        {mode === 'forgot' && (
          <div style={{ marginBottom: 24, textAlign: 'right' }}>
            <div style={s.forgotTitle}>שחזור סיסמה</div>
            <div style={s.forgotSub}>הזן את האימייל שלך ונשלח קישור לאיפוס</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          {mode === 'register' && (
            <Field label="שם מלא">
              <input style={s.input} type="text" placeholder="ישראל ישראלי"
                value={fullName} onChange={e => setFullName(e.target.value)} required />
            </Field>
          )}

          <Field label="אימייל">
            <input style={s.input} type="email" placeholder="name@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </Field>

          {mode !== 'forgot' && (
            <Field label="סיסמה">
              <input style={s.input} type="password" placeholder="לפחות 6 תווים"
                value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6} />
            </Field>
          )}

          {mode === 'login' && (
            <button type="button" style={s.link} onClick={() => switchMode('forgot')}>
              שכחתי סיסמה
            </button>
          )}

          {error && <div style={s.errorBox}>{error}</div>}
          {success && <div style={s.successBox}>{success}</div>}

          <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            type="submit" disabled={loading}>
            {submitLabel}
          </button>

          {mode === 'forgot' && (
            <button type="button" style={s.link} onClick={() => switchMode('login')}>
              חזרה לכניסה
            </button>
          )}
        </form>

        {/* Google */}
        {mode !== 'forgot' && (
          <>
            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>או</span>
              <div style={s.dividerLine} />
            </div>
            <button style={{ ...s.googleBtn, ...(googleLoading ? s.btnDisabled : {}) }}
              type="button" onClick={handleGoogle} disabled={googleLoading}>
              {googleLoading ? (
                <span>מתחבר...</span>
              ) : (
                <>
                  <GoogleIcon />
                  <span>כניסה עם Google</span>
                </>
              )}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'right' }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// Inline styles — no dependency on CSS modules or external classes
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: 'Heebo, sans-serif',
    direction: 'rtl',
  },
  card: {
    background: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: 16,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 56,
    height: 56,
    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    margin: '0 auto 12px',
  },
  logoName: {
    fontSize: 20,
    fontWeight: 900,
    color: '#0f172a',
    marginBottom: 4,
  },
  logoSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tabs: {
    display: 'flex',
    background: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    fontFamily: 'Heebo, sans-serif',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'Heebo, sans-serif',
    color: '#0f172a',
    background: '#ffffff',
    direction: 'ltr',
    textAlign: 'right',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#0d9488',
    fontSize: 13,
    fontFamily: 'Heebo, sans-serif',
    cursor: 'pointer',
    textAlign: 'right',
    padding: 0,
    textDecoration: 'underline',
    alignSelf: 'flex-start',
  },
  errorBox: {
    fontSize: 13,
    color: '#dc2626',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 14px',
    textAlign: 'center',
  },
  successBox: {
    fontSize: 13,
    color: '#16a34a',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '10px 14px',
    textAlign: 'center',
  },
  btn: {
    padding: 12,
    background: '#0d9488',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Heebo, sans-serif',
    transition: 'background 0.15s',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  forgotTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  forgotSub: {
    fontSize: 13,
    color: '#94a3b8',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '20px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e2e8f0',
  },
  dividerText: {
    fontSize: 13,
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '11px 0',
    background: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Heebo, sans-serif',
    color: '#0f172a',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
}
