import { useState } from 'react'
import { useBriefs } from '../../hooks/useBriefs'
import s from './BriefWizard.module.css'

interface Props {
  onOpen: (briefId: string) => void
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}

export function BriefsList({ onOpen }: Props) {
  const { briefs, loading, createBrief, deleteBrief } = useBriefs()
  const [creating, setCreating] = useState(false)

  async function handleNew() {
    setCreating(true)
    try {
      const brief = await createBrief()
      onOpen(brief.id)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('למחוק את הבריף?')) return
    await deleteBrief(id)
  }

  return (
    <div className={s.main}>
      <div className={s.stepHeader}>
        <h2>הבריפים שלי</h2>
        <p>צור בריף חדש או המשך עריכה של בריף קיים</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button className={s.btnPrimary} onClick={handleNew} disabled={creating}>
          {creating ? 'יוצר...' : '+ בריף חדש'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', padding: 16 }}>טוען...</div>
      ) : briefs.length === 0 ? (
        <div style={{ color: 'var(--text3)', padding: 16 }}>אין בריפים עדיין. צור בריף חדש!</div>
      ) : (
        <table className={s.milestonesTable} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>כותרת</th>
              <th>אשכול</th>
              <th>סטטוס</th>
              <th>עודכן</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {briefs.map(brief => (
              <tr
                key={brief.id}
                onClick={() => onOpen(brief.id)}
                style={{ cursor: 'pointer' }}
              >
                <td>{brief.title}</td>
                <td style={{ color: 'var(--text3)' }}>{brief.cluster_id ?? '—'}</td>
                <td>
                  <span style={{
                    background: brief.status === 'submitted' ? 'var(--green)' : 'var(--teal-pale)',
                    color: brief.status === 'submitted' ? '#fff' : 'var(--teal)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 12,
                  }}>
                    {brief.status === 'submitted' ? 'הוגש' : 'טיוטה'}
                  </span>
                </td>
                <td style={{ color: 'var(--text3)', fontSize: 13 }}>{fmtDate(brief.updated_at)}</td>
                <td>
                  <button
                    onClick={e => handleDelete(brief.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }}
                    title="מחק"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
