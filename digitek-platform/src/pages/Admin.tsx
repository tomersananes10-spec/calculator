import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import styles from './Admin.module.css'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  is_admin: boolean
}

export function Admin() {
  const { user, isAdmin } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .rpc('admin_get_all_profiles')
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [isAdmin])

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(p =>
      (p.full_name?.toLowerCase().includes(q)) ||
      (p.email?.toLowerCase().includes(q))
    )
  }, [profiles, search])

  const toggleAdmin = async (profileId: string, currentValue: boolean) => {
    if (profileId === user?.id) return
    const { error } = await supabase.rpc('admin_update_profile', {
      target_user_id: profileId,
      new_is_admin: !currentValue,
    })
    if (!error) {
      setProfiles(prev =>
        prev.map(p => p.id === profileId ? { ...p, is_admin: !currentValue } : p)
      )
    }
  }

  const startEdit = (p: Profile) => {
    setEditingId(p.id)
    setEditName(p.full_name || '')
  }

  const saveEdit = async (profileId: string) => {
    const { error } = await supabase.rpc('admin_update_profile', {
      target_user_id: profileId,
      new_full_name: editName,
    })
    if (!error) {
      setProfiles(prev =>
        prev.map(p => p.id === profileId ? { ...p, full_name: editName } : p)
      )
    }
    setEditingId(null)
  }

  const deleteUser = async (profileId: string) => {
    if (profileId === user?.id) return
    const { error } = await supabase.rpc('delete_user', {
      target_user_id: profileId,
    })
    if (!error) {
      setProfiles(prev => prev.filter(p => p.id !== profileId))
    }
    setDeleteConfirm(null)
  }

  const getInitials = (name: string | null, email: string | null) => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/)
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase()
    }
    return email?.[0]?.toUpperCase() || '?'
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
          <p className={styles.sub}>{profiles.length} משתמשים רשומים במערכת</p>
        </div>
        <Link to="/" className={styles.backBtn}>← חזרה לדשבורד</Link>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="חיפוש לפי שם או אימייל..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statNum}>{profiles.length}</span> סה״כ
          </span>
          <span className={styles.stat}>
            <span className={styles.statNum}>{profiles.filter(p => p.is_admin).length}</span> אדמינים
          </span>
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>טוען...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {search ? 'לא נמצאו תוצאות' : 'אין משתמשים'}
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>משתמש</span>
            <span>אימייל</span>
            <span>תאריך הצטרפות</span>
            <span>הרשאה</span>
            <span>פעולות</span>
          </div>
          {filtered.map(p => (
            <div key={p.id} className={`${styles.tableRow} ${p.id === user?.id ? styles.currentUser : ''}`}>
              <span className={styles.userCell}>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {getInitials(p.full_name, p.email)}
                  </div>
                )}
                <span className={styles.nameCol}>
                  {editingId === p.id ? (
                    <input
                      className={styles.editInput}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                      autoFocus
                    />
                  ) : (
                    <span className={styles.name}>{p.full_name || '—'}</span>
                  )}
                  {p.id === user?.id && <span className={styles.youBadge}>אתה</span>}
                </span>
              </span>
              <span className={styles.email}>{p.email || '—'}</span>
              <span className={styles.date}>
                {new Date(p.created_at).toLocaleDateString('he-IL')}
              </span>
              <span>
                <button
                  className={`${styles.badge} ${p.is_admin ? styles.badgeAdmin : styles.badgeUser}`}
                  onClick={() => toggleAdmin(p.id, p.is_admin)}
                  disabled={p.id === user?.id}
                  title={p.id === user?.id ? 'לא ניתן לשנות את עצמך' : 'לחץ לשינוי הרשאה'}
                >
                  {p.is_admin ? 'אדמין' : 'משתמש'}
                </button>
              </span>
              <span className={styles.actions}>
                {editingId === p.id ? (
                  <>
                    <button className={styles.actionBtn} onClick={() => saveEdit(p.id)} title="שמור">✓</button>
                    <button className={styles.actionBtn} onClick={() => setEditingId(null)} title="ביטול">✕</button>
                  </>
                ) : deleteConfirm === p.id ? (
                  <span className={styles.confirmDelete}>
                    <span>בטוח?</span>
                    <button className={styles.confirmYes} onClick={() => deleteUser(p.id)}>מחק</button>
                    <button className={styles.actionBtn} onClick={() => setDeleteConfirm(null)}>ביטול</button>
                  </span>
                ) : (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => startEdit(p)}
                      title="עריכת שם"
                    >✏️</button>
                    {p.id !== user?.id && (
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => setDeleteConfirm(p.id)}
                        title="מחיקת משתמש"
                      >🗑️</button>
                    )}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
