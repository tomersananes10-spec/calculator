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
