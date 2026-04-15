import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import styles from './Admin.module.css'

interface Profile {
  id: string
  full_name: string | null
  created_at: string
  is_admin: boolean
}

export function Admin() {
  const { isAdmin } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, created_at, is_admin')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [])

  const toggleAdmin = async (profileId: string, currentValue: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_admin: !currentValue })
      .eq('id', profileId)
    setProfiles(prev =>
      prev.map(p => p.id === profileId ? { ...p, is_admin: !currentValue } : p)
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
        אין לך הרשאת גישה לדף זה
      </div>
    )
  }

  return (
    <div className={styles.main}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>ניהול משתמשים</h1>
          <p className={styles.sub}>{profiles.length} משתמשים רשומים</p>
        </div>
        <Link to="/" className={styles.backBtn}>חזרה לדשבורד</Link>
      </div>

      {loading ? (
        <div className={styles.empty}>טוען...</div>
      ) : profiles.length === 0 ? (
        <div className={styles.empty}>אין משתמשים</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>שם</span>
            <span>מזהה</span>
            <span>תאריך הצטרפות</span>
            <span>אדמין</span>
          </div>
          {profiles.map(p => (
            <div key={p.id} className={styles.tableRow}>
              <span className={styles.name}>{p.full_name || '—'}</span>
              <span className={styles.id}>{p.id.slice(0, 8)}...</span>
              <span className={styles.date}>
                {new Date(p.created_at).toLocaleDateString('he-IL')}
              </span>
              <span>
                <button
                  className={`${styles.badge} ${p.is_admin ? styles.badgeAdmin : styles.badgeUser}`}
                  onClick={() => toggleAdmin(p.id, p.is_admin)}
                  title="לחץ לשינוי הרשאה"
                >
                  {p.is_admin ? 'אדמין' : 'משתמש'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
