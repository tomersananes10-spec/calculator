import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError('אימייל או סיסמה שגויים')
      } else {
        navigate('/')
      }
    } else if (mode === 'register') {
      if (!fullName.trim()) {
        setError('נא להזין שם מלא')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, fullName)
      if (error) {
        setError(error.message)
      } else {
        setMode('login')
        setSuccess('חשבון נוצר בהצלחה — אנא אמת את האימייל שלך')
      }
    } else if (mode === 'forgot') {
      const { error } = await resetPassword(email)
      if (error) {
        setError('לא ניתן לשלוח קישור — בדוק את האימייל')
      } else {
        setSuccess('קישור לאיפוס סיסמה נשלח לאימייל שלך')
      }
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError('כניסה עם Google נכשלה')
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🏛️</div>
        <h1 className={styles.title}>[שם המערכת]</h1>
        <p className={styles.sub}>שירותי מחשוב, דאטה ובינה מלאכותית</p>

        {mode !== 'forgot' && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => switchMode('login')}
              type="button"
            >
              כניסה
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => switchMode('register')}
              type="button"
            >
              הרשמה
            </button>
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

          {mode !== 'forgot' && (
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
          )}

          {mode === 'login' && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => switchMode('forgot')}
            >
              שכחתי סיסמה
            </button>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.successMsg}>{success}</div>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'כניסה' : mode === 'register' ? 'יצירת חשבון' : 'שלח קישור'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={() => switchMode('login')}
            >
              חזרה לכניסה
            </button>
          )}
        </form>

        {mode !== 'forgot' && (
          <>
            <div className={styles.divider}>
              <span>או</span>
            </div>
            <button className={styles.googleBtn} type="button" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              כניסה עם Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}
