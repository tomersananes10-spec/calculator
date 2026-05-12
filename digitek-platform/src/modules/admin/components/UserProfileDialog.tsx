import type { AdminProfile } from '../types'
import s from '../AdminPanel.module.css'

interface Props {
  user: AdminProfile
  onClose: () => void
}

export default function UserProfileDialog({ user, onClose }: Props) {
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / 86400000,
  )
  const daysSinceLastLogin = user.last_sign_in_at
    ? Math.floor(
        (Date.now() - new Date(user.last_sign_in_at).getTime()) / 86400000,
      )
    : null

  const isActive = daysSinceLastLogin !== null && daysSinceLastLogin <= 7
  const isInactive = daysSinceLastLogin !== null && daysSinceLastLogin > 30
  const neverLoggedIn = daysSinceLastLogin === null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
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

  const getUserType = () => {
    if (user.is_admin) return 'מנהל מערכת'
    if (user.calculation_count > 0 || user.brief_count > 0) return 'משתמש פעיל'
    return 'משתמש חדש'
  }

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <button className={s.modalClose} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </button>

        {/* Header */}
        <div className={s.modalHeader}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className={s.modalAvatar} />
          ) : (
            <div className={s.modalAvatarPlaceholder}>
              {getInitials(user.full_name, user.email)}
            </div>
          )}
          <div>
            <h3 className={s.modalName}>{user.full_name || '—'}</h3>
            <span className={s.modalRole}>{getUserType()}</span>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={
            neverLoggedIn
              ? s.bannerNever
              : isActive
                ? s.bannerActive
                : isInactive
                  ? s.bannerInactive
                  : s.bannerInactive
          }
        >
          {neverLoggedIn
            ? '⚠️ לא התחבר אף פעם'
            : isActive
              ? `✅ פעיל — נכנס לפני ${daysSinceLastLogin} ${daysSinceLastLogin === 1 ? 'יום' : 'ימים'}`
              : isInactive
                ? `⏰ לא פעיל — לא נכנס ${daysSinceLastLogin} ימים`
                : `😐 לא כל כך פעיל — נכנס לפני ${daysSinceLastLogin} ימים`}
        </div>

        {/* Personal Details */}
        <div className={s.modalSection}>
          <div className={s.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            פרטים אישיים
          </div>
          <div className={s.detailGrid}>
            <div className={s.detailRow}>
              <span>{user.email || '—'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
            </div>
            <div className={s.detailRow}>
              <span>{user.phone || '—'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </div>
            {user.company && (
              <div className={s.detailRow}>
                <span>{user.company}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/></svg>
              </div>
            )}
            {user.specialization && (
              <div className={s.detailRow}>
                <span>{user.specialization}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className={s.modalSection}>
          <div className={s.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            ציר זמן
          </div>
          <div className={s.timelineGrid}>
            <div className={s.timelineItem}>
              <span className={s.timelineLabel}>הצטרף:</span>
              <span className={s.timelineValue}>{formatDate(user.created_at)}</span>
            </div>
            <div className={s.timelineItem}>
              <span className={s.timelineLabel}>במערכת:</span>
              <span className={s.timelineValue}>{daysSinceCreation} ימים</span>
            </div>
            <div className={s.timelineItem}>
              <span className={s.timelineLabel}>כניסה אחרונה:</span>
              <span className={s.timelineValue}>{formatDate(user.last_sign_in_at)}</span>
            </div>
            <div className={s.timelineItem}>
              <span className={s.timelineLabel}>שיטה:</span>
              <span className={s.timelineValue}>
                {user.auth_provider === 'google' ? 'Google' : 'אימייל'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className={s.modalSection}>
          <div className={s.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            פעילות
          </div>
          <div className={s.statsGrid}>
            <div className={s.statBox}>
              <div className={s.statValue}>{user.calculation_count}</div>
              <div className={s.statLabel}>חישובי תכ"ם</div>
            </div>
            <div className={s.statBox}>
              <div className={s.statValue}>{user.brief_count}</div>
              <div className={s.statLabel}>בריפים</div>
            </div>
            <div className={s.statBox}>
              <div className={s.statValue}>{daysSinceCreation}</div>
              <div className={s.statLabel}>ימים במערכת</div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className={s.modalSection}>
          <div className={s.sectionTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            תובנות
          </div>
          {daysSinceCreation <= 7 && (
            <div className={`${s.insightItem} ${s.insightBlue}`}>
              🆕 משתמש חדש — הצטרף לאחרונה
            </div>
          )}
          {user.calculation_count > 5 && (
            <div className={`${s.insightItem} ${s.insightGreen}`}>
              🌟 משתמש מצטיין — {user.calculation_count} חישובים
            </div>
          )}
          {daysSinceCreation > 30 && user.calculation_count === 0 && user.brief_count === 0 && (
            <div className={`${s.insightItem} ${s.insightRed}`}>
              ❌ משתמש לא פעיל — לא השתמש בכלים מעולם
            </div>
          )}
          {isInactive && (
            <div className={`${s.insightItem} ${s.insightAmber}`}>
              💤 לא נכנס {daysSinceLastLogin} ימים
            </div>
          )}
          {user.calculation_count === 0 &&
            user.brief_count === 0 &&
            daysSinceCreation <= 7 && (
              <div className={`${s.insightItem} ${s.insightBlue}`}>
                🎯 טרם השתמש — שווה ליצור קשר
              </div>
            )}
          {!neverLoggedIn && !isActive && !isInactive && user.calculation_count === 0 && daysSinceCreation <= 30 && (
            <div className={s.insightItem}>
              😐 מחכה לפעולה ראשונה
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
