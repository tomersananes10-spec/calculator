import { useState } from 'react'
import { useAppErrors } from '../hooks/useAppErrors'
import s from '../AdminPanel.module.css'

export default function AppErrors() {
  const { errors, loading, refresh, clearOld } = useAppErrors()
  const [expanded, setExpanded] = useState<string | null>(null)

  const now = Date.now()
  const lastHour = errors.filter(
    e => now - new Date(e.created_at).getTime() < 3600000,
  ).length
  const last24h = errors.filter(
    e => now - new Date(e.created_at).getTime() < 86400000,
  ).length

  const formatTime = (d: string) =>
    new Date(d).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className={s.empty}>
        <div className={s.spinner} />
        <span>טוען שגיאות...</span>
      </div>
    )
  }

  return (
    <div>
      <div className={s.toolbar}>
        <div>
          <h2 className={s.toolbarTitle}>⚠️ שגיאות אפליקציה</h2>
          <p className={s.toolbarSub}>100 השגיאות האחרונות</p>
        </div>
        <div className={s.toolbarActions}>
          <button className={s.btnGhost} onClick={refresh}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            רענן
          </button>
          {errors.length > 0 && (
            <button className={s.btnDanger} onClick={clearOld}>
              🗑️ נקה ישנות (7+ ימים)
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--red-bg)' }}>
            <span style={{ fontSize: 22 }}>⏱️</span>
          </div>
          <div>
            <div className={s.kpiLabel}>שעה אחרונה</div>
            <div className={s.kpiValue} style={{ color: lastHour > 0 ? 'var(--red)' : 'var(--green)' }}>
              {lastHour}
            </div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--amber-bg)' }}>
            <span style={{ fontSize: 22 }}>📅</span>
          </div>
          <div>
            <div className={s.kpiLabel}>24 שעות</div>
            <div className={s.kpiValue} style={{ color: last24h > 0 ? 'var(--amber)' : 'var(--green)' }}>
              {last24h}
            </div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--primary-bg)' }}>
            <span style={{ fontSize: 22 }}>📊</span>
          </div>
          <div>
            <div className={s.kpiLabel}>סה"כ (100 אחרונות)</div>
            <div className={s.kpiValue}>{errors.length}</div>
          </div>
        </div>
      </div>

      {/* Errors list */}
      {errors.length === 0 ? (
        <div className={s.empty} style={{ padding: 80 }}>
          <span style={{ fontSize: 48 }}>🎉</span>
          <span>אין שגיאות מתועדות</span>
        </div>
      ) : (
        errors.map(err => {
          const isOpen = expanded === err.id
          return (
            <div key={err.id} className={s.errorCard}>
              <div className={s.errorHeader}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`${s.badge} ${s.badgeRed}`}>{err.error_type}</span>
                  <span className={s.errorTime}>{formatTime(err.created_at)}</span>
                </div>
                <button
                  className={s.actionBtn}
                  onClick={() => setExpanded(isOpen ? null : err.id)}
                >
                  {isOpen ? 'סגור' : 'פרטים'}
                </button>
              </div>
              <div className={s.errorMessage}>{err.message}</div>
              {isOpen && (
                <>
                  {err.context && (
                    <div className={s.errorDetails}>
                      {JSON.stringify(err.context, null, 2)}
                    </div>
                  )}
                  {err.stack && (
                    <div className={s.errorDetails} style={{ marginTop: 6 }}>
                      {err.stack}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
