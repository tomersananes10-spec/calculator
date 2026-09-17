import { Link } from 'react-router-dom'
import { Roved5 } from '../modules/roved5/Roved5'
import styles from './PublicRoved5Page.module.css'

export function PublicRoved5Page() {
  return (
    <div className={styles.wrap}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo}>LIBA</span>
          <span className={styles.tagline}>רובד 5 — קטלוג שירותי ענן מאושרים לרכישה</span>
        </div>
        <Link to="/login" className={styles.loginLink}>כניסה למערכת</Link>
      </header>

      <main className={styles.main}>
        <Roved5 publicMode />
      </main>
    </div>
  )
}
