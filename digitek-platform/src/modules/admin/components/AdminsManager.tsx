import { useMemo } from 'react'
import type { AdminProfile } from '../types'
import s from '../AdminPanel.module.css'

interface Props {
  profiles: AdminProfile[]
  currentUserId: string | undefined
  onToggleAdmin: (id: string, current: boolean) => Promise<void>
}

export default function AdminsManager({ profiles, currentUserId, onToggleAdmin }: Props) {
  const admins = useMemo(() => profiles.filter(p => p.is_admin), [profiles])

  const getInitials = (name: string | null, email: string | null) => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/)
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase()
    }
    return email?.[0]?.toUpperCase() || '?'
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  return (
    <div className={s.card}>
      <div className={s.cardHeader}>
        <div className={s.cardTitleRow}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2 className={s.cardTitle}>מנהלי מערכת ({admins.length})</h2>
        </div>
      </div>

      {admins.length === 0 ? (
        <div className={s.empty}>
          <span>אין מנהלים רשומים</span>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>מנהל</th>
                <th>חברה</th>
                <th>הצטרף</th>
                <th>כניסה אחרונה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(p => (
                <tr key={p.id} className={p.id === currentUserId ? s.currentRow : ''}>
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
                          <span>{p.full_name || '—'}</span>
                          {p.id === currentUserId && (
                            <span className={s.youBadge}>אתה</span>
                          )}
                        </div>
                        <div className={s.userEmail}>{p.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className={s.dimCell}>{p.company || '—'}</td>
                  <td className={s.dateCell}>{formatDate(p.created_at)}</td>
                  <td className={s.dateCell}>
                    {p.last_sign_in_at
                      ? formatDate(p.last_sign_in_at)
                      : '—'}
                  </td>
                  <td>
                    {p.id !== currentUserId && (
                      <button
                        className={`${s.actionBtn} ${s.deleteBtn}`}
                        onClick={() => onToggleAdmin(p.id, true)}
                        title="הסר הרשאת אדמין"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
