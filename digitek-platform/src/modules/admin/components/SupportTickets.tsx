import { useState } from 'react'
import { useSupportTickets } from '../hooks/useSupportTickets'
import type { SupportTicket } from '../types'
import s from '../AdminPanel.module.css'

const SEVERITY_MAP = {
  low: { label: 'נמוכה', cls: s.badgeGray },
  medium: { label: 'בינונית', cls: s.badgeAmber },
  high: { label: 'גבוהה', cls: s.badgeRed },
  critical: { label: 'קריטי', cls: s.badgeRed },
}

const STATUS_MAP = {
  open: { label: 'פתוח', cls: s.badgeAmber },
  in_progress: { label: 'בטיפול', cls: s.badgeBlue },
  resolved: { label: 'טופל', cls: s.badgeGreen },
  closed: { label: 'סגור', cls: s.badgeGray },
}

export default function SupportTickets() {
  const { tickets, loading, refresh, updateTicket } = useSupportTickets()
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<SupportTicket | null>(null)

  const filtered =
    filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    critical: tickets.filter(t => t.severity === 'critical').length,
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className={s.empty}>
        <div className={s.spinner} />
        <span>טוען טיקטים...</span>
      </div>
    )
  }

  return (
    <div>
      <div className={s.toolbar}>
        <div>
          <h2 className={s.toolbarTitle}>🛟 תמיכה טכנית</h2>
          <p className={s.toolbarSub}>{tickets.length} טיקטים</p>
        </div>
        <button className={s.btnGhost} onClick={refresh}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          רענן
        </button>
      </div>

      {/* Summary cards */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--amber-bg)' }}>
            <span style={{ fontSize: 22 }}>📬</span>
          </div>
          <div>
            <div className={s.kpiLabel}>פתוחים</div>
            <div className={s.kpiValue} style={{ color: 'var(--amber)' }}>{counts.open}</div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--primary-bg)' }}>
            <span style={{ fontSize: 22 }}>🔄</span>
          </div>
          <div>
            <div className={s.kpiLabel}>בטיפול</div>
            <div className={s.kpiValue} style={{ color: 'var(--primary)' }}>{counts.in_progress}</div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--green-bg)' }}>
            <span style={{ fontSize: 22 }}>✅</span>
          </div>
          <div>
            <div className={s.kpiLabel}>טופלו</div>
            <div className={s.kpiValue} style={{ color: 'var(--green)' }}>{counts.resolved}</div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--red-bg)' }}>
            <span style={{ fontSize: 22 }}>🚨</span>
          </div>
          <div>
            <div className={s.kpiLabel}>קריטיים</div>
            <div className={s.kpiValue} style={{ color: 'var(--red)' }}>{counts.critical}</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className={s.filterBar}>
        <span className={s.filterLabel}>סטטוס:</span>
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
          <button
            key={f}
            className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all'
              ? 'הכל'
              : STATUS_MAP[f as keyof typeof STATUS_MAP]?.label || f}
          </button>
        ))}
      </div>

      {/* Tickets list */}
      {filtered.length === 0 ? (
        <div className={s.empty}>
          <span>אין טיקטים {filter !== 'all' ? 'בסטטוס זה' : ''}</span>
        </div>
      ) : (
        filtered.map(ticket => (
          <div
            key={ticket.id}
            className={s.itemCard}
            onClick={() => setSelected(ticket)}
            style={{ cursor: 'pointer' }}
          >
            <div className={s.itemCardHeader}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={s.itemTitle}>{ticket.subject}</span>
                <span className={`${s.badge} ${SEVERITY_MAP[ticket.severity].cls}`}>
                  {SEVERITY_MAP[ticket.severity].label}
                </span>
              </div>
              <span className={`${s.badge} ${STATUS_MAP[ticket.status].cls}`}>
                {STATUS_MAP[ticket.status].label}
              </span>
            </div>
            <div className={s.itemMeta}>
              {ticket.user_name || ticket.user_email || 'אנונימי'} •{' '}
              {formatDate(ticket.created_at)}
            </div>
            {ticket.description && (
              <p className={s.itemDesc}>
                {ticket.description.length > 120
                  ? ticket.description.slice(0, 120) + '...'
                  : ticket.description}
              </p>
            )}
          </div>
        ))
      )}

      {/* Ticket detail modal */}
      {selected && (
        <div className={s.modalOverlay} onClick={() => setSelected(null)}>
          <div
            className={`${s.modal} ${s.modalWide}`}
            onClick={e => e.stopPropagation()}
          >
            <button className={s.modalClose} onClick={() => setSelected(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </button>

            <h3 className={s.modalTitle}>{selected.subject}</h3>

            <div className={s.modalSection}>
              <div className={s.sectionTitle}>פרטי פנייה</div>
              <div className={s.detailGrid}>
                <div className={s.detailRow}>
                  <span>{selected.user_name || '—'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div className={s.detailRow}>
                  <span>{selected.user_email || '—'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                </div>
                <div className={s.detailRow}>
                  <span>{selected.user_phone || '—'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </div>
                <div className={s.detailRow}>
                  <span>{formatDate(selected.created_at)}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
              </div>
            </div>

            {selected.description && (
              <div className={s.modalSection}>
                <div className={s.sectionTitle}>תיאור</div>
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
                  {selected.description}
                </p>
              </div>
            )}

            <div className={s.modalSection}>
              <div className={s.sectionTitle}>עדכון סטטוס</div>
              <div className={s.formRow}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>סטטוס</label>
                  <select
                    className={s.formSelect}
                    value={selected.status}
                    onChange={e => {
                      const newStatus = e.target.value as SupportTicket['status']
                      updateTicket(selected.id, { status: newStatus })
                      setSelected({ ...selected, status: newStatus })
                    }}
                  >
                    <option value="open">פתוח</option>
                    <option value="in_progress">בטיפול</option>
                    <option value="resolved">טופל</option>
                    <option value="closed">סגור</option>
                  </select>
                </div>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>חומרה</label>
                  <select
                    className={s.formSelect}
                    value={selected.severity}
                    onChange={e => {
                      const newSeverity = e.target.value as SupportTicket['severity']
                      updateTicket(selected.id, { severity: newSeverity })
                      setSelected({ ...selected, severity: newSeverity })
                    }}
                  >
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                    <option value="critical">קריטי</option>
                  </select>
                </div>
              </div>
            </div>

            {selected.admin_notes && (
              <div className={s.modalSection}>
                <div className={s.sectionTitle}>הערות אדמין</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
                  {selected.admin_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
