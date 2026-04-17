import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
        </form>
      </div>
    </div>
  )
}
