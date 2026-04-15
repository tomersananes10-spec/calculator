import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBriefs } from '../hooks/useBriefs'
import styles from './BriefsList.module.css'

type StatusFilter = 'all' | 'draft' | 'submitted'

const STATUS_LABELS: Record<string, string> = {
  draft:     'טיוטה',
  submitted: 'הוגש',
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'gray',
  submitted: 'blue',
}

export function BriefsList() {
  const { briefs, createBrief, loading } = useBriefs()
  const navigate = useNavigate()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [creating, setCreating]       = useState(false)

  async function handleNewBrief() {
    setCreating(true)
    try {
      const record = await createBrief()
      navigate(`/brief-generator?id=${record.id}`)
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  const filtered = (briefs ?? []).filter(b => {
    const matchSearch = !search || b.title.includes(search) || b.id.includes(search)
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    all:       (briefs ?? []).length,
    draft:     (briefs ?? []).filter(b => b.status === 'draft').length,
    submitted: (briefs ?? []).filter(b => b.status === 'submitted').length,
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>ניהול בריפים</h1>
          <p className={styles.sub}>{counts.all} בריפים בסך הכל</p>
        </div>
        <button className={styles.newBtn} onClick={handleNewBrief} disabled={creating}>
          {creating ? '...' : '+ בריף חדש'}
        </button>
      </div>

      {/* Search + filters */}
      <div className={styles.controls}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="חיפוש לפי מספר, כותרת..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Status chips */}
      <div className={styles.chips}>
        {(['all', 'draft', 'submitted'] as StatusFilter[]).map(s => (
          <button
            key={s}
            className={`${styles.chip} ${statusFilter === s ? styles.chipActive : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? `הכל (${counts.all})` : `${STATUS_LABELS[s]} (${counts[s]})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>טוען בריפים...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>לא נמצאו בריפים</p>
            <button className={styles.newBtn} onClick={handleNewBrief}>+ צור בריף ראשון</button>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>מספר בריף</th>
                <th>כותרת</th>
                <th>אשכול</th>
                <th>סטטוס</th>
                <th>עדכון אחרון</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(brief => (
                <tr key={brief.id} className={styles.tableRow}>
                  <td><code className={styles.briefId}>{brief.id.slice(0, 8)}...</code></td>
                  <td className={styles.briefTitle}>{brief.title || 'טיוטה ללא שם'}</td>
                  <td><span className={styles.clusterBadge}>{brief.state?.identification?.selectedCluster?.name ?? '—'}</span></td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles['badge_' + (STATUS_COLORS[brief.status] ?? 'gray')]}`}>
                      {STATUS_LABELS[brief.status] ?? brief.status}
                    </span>
                  </td>
                  <td className={styles.updatedAt}>{new Date(brief.updated_at).toLocaleDateString('he-IL')}</td>
                  <td>
                    <Link to={`/brief-generator?id=${brief.id}`} className={styles.editLink}>ערוך ←</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
