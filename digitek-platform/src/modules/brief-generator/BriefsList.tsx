import { useState } from 'react'
import { useBriefs } from '../../hooks/useBriefs'
import type { BriefRecord } from './types'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: BriefRecord['status'] }) {
  const submitted = status === 'submitted'
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 700,
      background: submitted ? 'var(--green)' : '#e0f2fe',
      color: submitted ? '#fff' : '#0369a1',
    }}>
      {submitted ? 'הוגש' : 'טיוטה'}
    </span>
  )
}

interface Props {
  onOpen: (briefId: string) => void
  onNew: () => void
}

export function BriefsList({ onOpen, onNew }: Props) {
  const { briefs, loading, deleteBrief } = useBriefs()
  const [deletingId, setDeletingId] = useState<string | null>(null)



  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('למחוק את הבריף? פעולה זו לא ניתנת לביטול.')) return
    setDeletingId(id)
    try { await deleteBrief(id) }
    finally { setDeletingId(null) }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>הבריפים שלי</h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>
            {loading ? '' : briefs.length === 0 ? 'עדיין אין בריפים' : briefs.length + ' בריפים'}
          </p>
        </div>
        <button
          onClick={onNew}
          style={{
            background: 'var(--teal)', color: '#fff', border: 'none',
            borderRadius: 12, padding: '12px 24px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: 1, fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
          '+ בריף חדש'
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>טוען...</div>
      )}

      {/* Empty state */}
      {!loading && briefs.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 40px',
          border: '2px dashed var(--border2)', borderRadius: 16,
          color: 'var(--text3)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>אין בריפים עדיין</p>
          <p style={{ fontSize: 14, margin: '0 0 20px' }}>לחץ על "בריף חדש" כדי להתחיל</p>
          <button
            onClick={onNew}
            style={{
              background: 'var(--teal)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            '+ בריף חדש'
          </button>
        </div>
      )}

      {/* Brief cards */}
      {!loading && briefs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {briefs.map(brief => (
            <div
              key={brief.id}
              onClick={() => onOpen(brief.id)}
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 14,
                padding: '16px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,164,153,0.12)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: 'var(--teal-pale)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>
                📄
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                  {brief.title || 'טיוטה ללא שם'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {brief.cluster_id ? 'אשכול ' + brief.cluster_id : 'אשכול טרם נבחר'}
                  {' · '}
                  עודכן {fmtDate(brief.updated_at)}
                </div>
              </div>

              {/* Status */}
              <StatusBadge status={brief.status} />

              {/* Delete */}
              <button
                onClick={e => handleDelete(brief.id, e)}
                disabled={deletingId === brief.id}
                style={{
                  background: 'none', border: '1px solid var(--border2)',
                  borderRadius: 8, cursor: 'pointer',
                  color: 'var(--text3)', fontSize: 14,
                  padding: '6px 10px', transition: 'all 0.15s',
                  opacity: deletingId === brief.id ? 0.4 : 1,
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text3)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
                }}
                title="מחק בריף"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
