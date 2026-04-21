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

type Tab = 'analytics' | 'users' | 'admins' | 'dev'
type FilterType = 'all' | 'active' | 'inactive' | 'admin'

const MODULES = [
  { key: 'quotes', label: 'הצעות מחיר', icon: '📋' },
  { key: 'designer', label: 'מעצב', icon: '🎨' },
  { key: 'architect', label: 'אדריכל', icon: '🏗️' },
  { key: 'attendance', label: 'נוכחות', icon: '⏱️' },
  { key: 'requests', label: 'בקשות', icon: '📑' },
  { key: 'clients', label: 'לקוחות', icon: '👥' },
]

export function Admin() {
  const { user, isAdmin } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [modulePopover, setModulePopover] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .rpc('admin_get_all_profiles')
      .then(({ data }) => {
        setProfiles(data ?? [])
        setLoading(false)
      })
  }, [isAdmin])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (modulePopover && !target.closest(`.${styles.modulePopover}`) && !target.closest(`.${styles.modulesCell}`)) {
        setModulePopover(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [modulePopover])

  const filtered = useMemo(() => {
    let list = profiles
    if (filter === 'admin') list = list.filter(p => p.is_admin)
    if (activeTab === 'admins') list = list.filter(p => p.is_admin)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.full_name?.toLowerCase().includes(q)) ||
        (p.email?.toLowerCase().includes(q))
      )
    }
    return list
  }, [profiles, search, filter, activeTab])

  const adminCount = useMemo(() => profiles.filter(p => p.is_admin).length, [profiles])

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

  const getDaysSince = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
        אין לך הרשאת גישה לדף זה
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          חזרה
        </Link>
      </div>

      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <h1 className={styles.title}>ניהול מערכת</h1>
          <p className={styles.subtitle}>סטטיסטיקות, משתמשים ומנהלים</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'analytics' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >אנליטיקות</button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('users')}
        >משתמשים ({profiles.length})</button>
        <button
          className={`${styles.tab} ${activeTab === 'admins' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('admins')}
        >מנהלי מערכת ({adminCount})</button>
        <button
          className={`${styles.tab} ${activeTab === 'dev' ? styles.tabActive : ''}`}
        >🔧 פיתוח</button>
      </div>

      {/* Analytics placeholder */}
      {activeTab === 'analytics' && (
        <div className={styles.analyticsPlaceholder}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <p>אנליטיקות יהיו זמינות בקרוב</p>
        </div>
      )}

      {/* Dev placeholder */}
      {activeTab === 'dev' && (
        <div className={styles.analyticsPlaceholder}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
          <p>כלי פיתוח יהיו זמינים בקרוב</p>
        </div>
      )}

      {/* Users / Admins Table */}
      {(activeTab === 'users' || activeTab === 'admins') && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleRow}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <h2 className={styles.cardTitle}>
                {activeTab === 'admins' ? 'מנהלי מערכת' : 'כל המשתמשים'}
              </h2>
            </div>
            <div className={styles.cardControls}>
              <div className={styles.searchBox}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="חיפוש לפי שם, מייל, חברה או טלפון..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {activeTab === 'users' && (
                <select
                  className={styles.filterSelect}
                  value={filter}
                  onChange={e => setFilter(e.target.value as FilterType)}
                >
                  <option value="all">הכל ({profiles.length})</option>
                  <option value="admin">אדמינים ({adminCount})</option>
                </select>
              )}
            </div>
          </div>

          <div className={styles.resultCount}>{filtered.length} תוצאות</div>

          {loading ? (
            <div className={styles.empty}>
              <div className={styles.spinner} />
              <span>טוען משתמשים...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
              <span>{search ? 'לא נמצאו תוצאות' : 'אין משתמשים'}</span>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>משתמש</th>
                    <th>חברה</th>
                    <th>מודולים</th>
                    <th>הצעות</th>
                    <th>הכנסה</th>
                    <th>המרה</th>
                    <th>מנוי</th>
                    <th>סטטוס</th>
                    <th>כניסה אחרונה</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className={p.id === user?.id ? styles.currentRow : ''}>
                      {/* User */}
                      <td>
                        <div className={styles.userCell}>
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className={styles.avatar} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {getInitials(p.full_name, p.email)}
                            </div>
                          )}
                          <div className={styles.userInfo}>
                            <div className={styles.userName}>
                              {editingId === p.id ? (
                                <input
                                  className={styles.editInput}
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEdit(p.id)
                                    if (e.key === 'Escape') setEditingId(null)
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span>{p.full_name || '—'}</span>
                              )}
                              {p.id === user?.id && <span className={styles.youBadge}>אתה</span>}
                            </div>
                            <div className={styles.userEmail}>{p.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className={styles.dimCell}>—</td>

                      {/* Modules */}
                      <td className={styles.modulesCell} style={{ position: 'relative' }}>
                        <button
                          className={styles.modulesBtn}
                          onClick={() => setModulePopover(modulePopover === p.id ? null : p.id)}
                          title="הרשאות מודולים"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                        </button>
                        {p.is_admin && <span className={styles.moduleIcon} title="בקשות">📑</span>}

                        {/* Module permissions popover */}
                        {modulePopover === p.id && (
                          <div className={styles.modulePopover}>
                            <div className={styles.popoverTitle}>הרשאות מודולים</div>
                            {MODULES.map(m => (
                              <label key={m.key} className={styles.moduleRow}>
                                <span className={styles.moduleLabel}>
                                  {m.label} <span>{m.icon}</span>
                                </span>
                                <input type="checkbox" className={styles.moduleCheck} defaultChecked={m.key === 'requests' && p.is_admin} />
                              </label>
                            ))}
                            <div className={styles.popoverNote}>
                              ⚠️ מזוהה אוטומטית. סמן/בטל כדי לנהל ידנית.
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Quotes */}
                      <td className={styles.dimCell}>—</td>

                      {/* Revenue */}
                      <td className={styles.dimCell}>—</td>

                      {/* Conversion */}
                      <td className={styles.dimCell}>—</td>

                      {/* Subscription */}
                      <td>
                        <div className={styles.subCell}>
                          <span className={styles.subFree}>חינם</span>
                          <button className={styles.subEdit} title="עריכת מנוי">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {getDaysSince(p.created_at) < 30 ? (
                          <span className={styles.statusActive}>פעיל</span>
                        ) : (
                          <span className={styles.statusInactive}>לא התחבר</span>
                        )}
                      </td>

                      {/* Last login */}
                      <td className={styles.dateCell}>{formatDate(p.created_at)}</td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actions}>
                          {editingId === p.id ? (
                            <>
                              <button className={styles.actionBtn} onClick={() => saveEdit(p.id)} title="שמור">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                              </button>
                              <button className={styles.actionBtn} onClick={() => setEditingId(null)} title="ביטול">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </>
                          ) : deleteConfirm === p.id ? (
                            <div className={styles.confirmDelete}>
                              <span>בטוח?</span>
                              <button className={styles.confirmYes} onClick={() => deleteUser(p.id)}>מחק</button>
                              <button className={styles.actionBtn} onClick={() => setDeleteConfirm(null)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className={styles.actionBtn}
                                onClick={() => toggleAdmin(p.id, p.is_admin)}
                                disabled={p.id === user?.id}
                                title={p.is_admin ? 'הסר הרשאת אדמין' : 'הפוך לאדמין'}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.is_admin ? 'var(--primary)' : 'var(--text3)'} strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                              </button>
                              <button
                                className={styles.actionBtn}
                                onClick={() => setSelectedUser(p)}
                                title="צפייה בפרטים"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                              <button
                                className={styles.actionBtn}
                                onClick={() => startEdit(p)}
                                title="עריכת שם"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              {p.id !== user?.id && (
                                <button
                                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                  onClick={() => setDeleteConfirm(p.id)}
                                  title="מחיקת משתמש"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedUser(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
            </button>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              {selectedUser.avatar_url ? (
                <img src={selectedUser.avatar_url} alt="" className={styles.modalAvatar} />
              ) : (
                <div className={styles.modalAvatarPlaceholder}>
                  {getInitials(selectedUser.full_name, selectedUser.email)}
                </div>
              )}
              <div>
                <h3 className={styles.modalName}>{selectedUser.full_name || '—'}</h3>
                <span className={styles.modalRole}>{selectedUser.is_admin ? 'מנהל' : 'לקוח'}</span>
              </div>
            </div>

            {/* Status Banner */}
            <div className={getDaysSince(selectedUser.created_at) < 30 ? styles.bannerActive : styles.bannerInactive}>
              {getDaysSince(selectedUser.created_at) < 30
                ? `✅ פעיל — נכנס לפני ${getDaysSince(selectedUser.created_at)} ימים`
                : `⚠️ לא התחבר — הצטרף לפני ${getDaysSince(selectedUser.created_at)} ימים`}
            </div>

            {/* Sections */}
            <div className={styles.modalSection}>
              <div className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                פרטים אישיים
              </div>
              <div className={styles.detailRow}>
                <span>{selectedUser.email || '—'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
              </div>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                ציר זמן
              </div>
              <div className={styles.timelineGrid}>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>הצטרף:</span>
                  <span className={styles.timelineValue}>{formatDate(selectedUser.created_at)}</span>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>במערכת:</span>
                  <span className={styles.timelineValue}>{getDaysSince(selectedUser.created_at)} ימים</span>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>כניסה אחרונה:</span>
                  <span className={styles.timelineValue}>{formatDate(selectedUser.created_at)}</span>
                </div>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>שיטה:</span>
                  <span className={styles.timelineValue}>אימייל</span>
                </div>
              </div>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                מודולים פעילים
              </div>
              <div className={styles.moduleTags}>
                {selectedUser.is_admin ? (
                  <span className={styles.moduleTag}>בקשות</span>
                ) : (
                  <span className={styles.dimText}>ללא מודולים</span>
                )}
              </div>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                הצעות מחיר
              </div>
              <span className={styles.dimText}>טרם יצר הצעות מחיר</span>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                מנוי
              </div>
              <span className={styles.dimText}>ללא מנוי — חינם</span>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                תובנות
              </div>
              <div className={styles.insightItem}>
                <span className={styles.insightNew}>NEW</span>
                משתמש חדש — הצטרף לאחרונה
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
