import { useState, useMemo, lazy, Suspense } from 'react'
import type { AdminProfile, FilterType } from '../types'
import s from '../AdminPanel.module.css'

const UserProfileDialog = lazy(() => import('./UserProfileDialog'))

interface Props {
  profiles: AdminProfile[]
  loading: boolean
  currentUserId: string | undefined
  onToggleAdmin: (id: string, current: boolean) => Promise<void>
  onUpdateName: (id: string, name: string) => Promise<void>
  onDeleteUser: (id: string) => Promise<void>
  onRefresh: () => void
}

export default function UsersTable({
  profiles,
  loading,
  currentUserId,
  onToggleAdmin,
  onUpdateName,
  onDeleteUser,
  onRefresh: _onRefresh,
}: Props) {
  void _onRefresh
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null)

  const adminCount = useMemo(
    () => profiles.filter(p => p.is_admin).length,
    [profiles],
  )

  const filtered = useMemo(() => {
    let list = profiles
    if (filter === 'admin') list = list.filter(p => p.is_admin)
    if (filter === 'active') {
      list = list.filter(p => {
        if (!p.last_sign_in_at) return false
        const days = Math.floor(
          (Date.now() - new Date(p.last_sign_in_at).getTime()) / 86400000,
        )
        return days <= 30
      })
    }
    if (filter === 'inactive') {
      list = list.filter(p => {
        if (!p.last_sign_in_at) return true
        const days = Math.floor(
          (Date.now() - new Date(p.last_sign_in_at).getTime()) / 86400000,
        )
        return days > 30
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        p =>
          p.full_name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q) ||
          p.phone?.includes(q),
      )
    }
    return list
  }, [profiles, search, filter])

  const getInitials = (name: string | null, email: string | null) => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/)
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase()
    }
    return email?.[0]?.toUpperCase() || '?'
  }

  const getStatus = (p: AdminProfile) => {
    if (!p.last_sign_in_at) return 'never'
    const days = Math.floor(
      (Date.now() - new Date(p.last_sign_in_at).getTime()) / 86400000,
    )
    if (days <= 7) return 'active'
    if (days > 30) return 'inactive'
    return 'idle'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const startEdit = (p: AdminProfile) => {
    setEditingId(p.id)
    setEditName(p.full_name || '')
  }

  const saveEdit = async (id: string) => {
    await onUpdateName(id, editName)
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    await onDeleteUser(id)
    setDeleteConfirm(null)
  }

  return (
    <>
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div className={s.cardTitleRow}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <h2 className={s.cardTitle}>כל המשתמשים</h2>
          </div>
          <div className={s.cardControls}>
            <div className={s.searchBox}>
              <svg className={s.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className={s.searchInput}
                type="text"
                placeholder="חיפוש לפי שם, מייל, חברה או טלפון..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className={s.filterSelect}
              value={filter}
              onChange={e => setFilter(e.target.value as FilterType)}
            >
              <option value="all">הכל ({profiles.length})</option>
              <option value="active">פעילים</option>
              <option value="inactive">לא פעילים</option>
              <option value="admin">אדמינים ({adminCount})</option>
            </select>
          </div>
        </div>

        <div className={s.resultCount}>{filtered.length} תוצאות</div>

        {loading ? (
          <div className={s.empty}>
            <div className={s.spinner} />
            <span>טוען משתמשים...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={s.empty}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
            </svg>
            <span>{search ? 'לא נמצאו תוצאות' : 'אין משתמשים'}</span>
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>משתמש</th>
                  <th>חברה</th>
                  <th>חישובים</th>
                  <th>בריפים</th>
                  <th>סטטוס</th>
                  <th>כניסה אחרונה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStatus(p)
                  return (
                    <tr
                      key={p.id}
                      className={p.id === currentUserId ? s.currentRow : ''}
                    >
                      {/* User */}
                      <td>
                        <div className={s.userCell}>
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className={s.avatar} />
                          ) : (
                            <div className={s.avatarPlaceholder}>
                              {getInitials(p.full_name, p.email)}
                            </div>
                          )}
                          <div className={s.userInfo}>
                            <div className={s.userName}>
                              {editingId === p.id ? (
                                <input
                                  className={s.editInput}
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
                              {p.id === currentUserId && (
                                <span className={s.youBadge}>אתה</span>
                              )}
                              {p.is_admin && (
                                <span className={s.badge + ' ' + s.badgeBlue}>
                                  מנהל
                                </span>
                              )}
                            </div>
                            <div className={s.userEmail}>{p.email || '—'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className={s.dimCell}>{p.company || '—'}</td>

                      {/* Calculations */}
                      <td className={s.dimCell}>{p.calculation_count}</td>

                      {/* Briefs */}
                      <td className={s.dimCell}>{p.brief_count}</td>

                      {/* Status */}
                      <td>
                        {status === 'active' && (
                          <span className={s.statusActive}>פעיל</span>
                        )}
                        {status === 'idle' && (
                          <span className={s.statusWarn}>לא כ"כ פעיל</span>
                        )}
                        {status === 'inactive' && (
                          <span className={s.statusInactive}>לא פעיל</span>
                        )}
                        {status === 'never' && (
                          <span className={s.statusInactive}>לא התחבר</span>
                        )}
                      </td>

                      {/* Last login */}
                      <td className={s.dateCell}>
                        {formatDate(p.last_sign_in_at || p.created_at)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={s.actions}>
                          {editingId === p.id ? (
                            <>
                              <button className={s.actionBtn} onClick={() => saveEdit(p.id)} title="שמור">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                              </button>
                              <button className={s.actionBtn} onClick={() => setEditingId(null)} title="ביטול">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </>
                          ) : deleteConfirm === p.id ? (
                            <div className={s.confirmDelete}>
                              <span>בטוח?</span>
                              <button className={s.confirmYes} onClick={() => handleDelete(p.id)}>מחק</button>
                              <button className={s.actionBtn} onClick={() => setDeleteConfirm(null)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className={s.actionBtn}
                                onClick={() => onToggleAdmin(p.id, p.is_admin)}
                                disabled={p.id === currentUserId}
                                title={p.is_admin ? 'הסר הרשאת אדמין' : 'הפוך לאדמין'}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.is_admin ? 'var(--primary)' : 'var(--text3)'} strokeWidth="2">
                                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                              </button>
                              <button
                                className={s.actionBtn}
                                onClick={() => setSelectedUser(p)}
                                title="צפייה בפרטים"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                className={s.actionBtn}
                                onClick={() => startEdit(p)}
                                title="עריכת שם"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5">
                                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              {p.id !== currentUserId && (
                                <button
                                  className={`${s.actionBtn} ${s.deleteBtn}`}
                                  onClick={() => setDeleteConfirm(p.id)}
                                  title="מחיקת משתמש"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <Suspense fallback={null}>
          <UserProfileDialog
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        </Suspense>
      )}
    </>
  )
}
