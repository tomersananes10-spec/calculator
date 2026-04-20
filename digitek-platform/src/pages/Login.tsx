import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './Login.module.css'

type Mode = 'login' | 'register' | 'forgot'

export function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()

  const reset = () => { setError(null); setSuccess(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    reset()
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('אימייל או סיסמה שגויים')
      else navigate('/')

    } else if (mode === 'register') {
      if (!fullName.trim()) { setError('נא להזין שם מלא'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      })
      if (error) setError(error.message)
      else { setMode('login'); setSuccess('חשבון נוצר — אנא אמת את האימייל שלך') }

    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) setError('לא ניתן לשלוח קישור — בדוק את האימייל')
      else setSuccess('קישור לאיפוס סיסמה נשלח לאימייל שלך')
    }

    setLoading(false)
  }

  const switchMode = (m: Mode) => { setMode(m); reset() }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🏛️</div>
        <h1 className={styles.title}>LIBA</h1>
        <p className={styles.sub}>שירותי מחשוב, דאטה ובינה מלאכותית</p>

        {mode !== 'forgot' && (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => switchMode('login')} type="button">כניסה</button>
            <button className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => switchMode('register')} type="button">הרשמה</button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className={styles.forgotHeader}>
            <h2 className={styles.forgotTitle}>שחזור סיסמה</h2>
            <p className={styles.forgotSub}>הזן את האימייל שלך ונשלח לך קישור</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label}>שם מלא</label>
              <input className={styles.input} type="text" placeholder="ישראל ישראלי"
                value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>אימייל</label>
            <input className={styles.input} type="email" placeholder="name@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          {mode !== 'forgot' && (
            <div className={styles.field}>
              <label className={styles.label}>סיסמה</label>
              <input className={styles.input} type="password" placeholder="לפחות 6 תווים"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}

          {mode === 'login' && (
            <button type="button" className={styles.forgotLink} onClick={() => switchMode('forgot')}>
              שכחתי סיסמה
            </button>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'כניסה' : mode === 'register' ? 'יצירת חשבון' : 'שלח קישור'}
          </button>

          {mode === 'forgot' && (
            <button type="button" className={styles.forgotLink} onClick={() => switchMode('login')}>
              חזרה לכניסה
            </button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className={styles.divider}>או</div>
              <button type="button" className={styles.googleBtn} onClick={() => signInWithGoogle()}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                כניסה עם Google
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
