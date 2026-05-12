import { useState } from 'react'
import { useDevTasks } from '../hooks/useDevTasks'
import type { DevTask } from '../types'
import s from '../AdminPanel.module.css'

const PRIORITY_MAP = {
  urgent: { label: 'דחוף', cls: s.badgeRed },
  normal: { label: 'רגיל', cls: s.badgeBlue },
  low: { label: 'נמוך', cls: s.badgeGray },
}

const STATUS_MAP = {
  todo: { label: 'לביצוע', cls: s.badgeAmber },
  in_progress: { label: 'בתהליך', cls: s.badgeBlue },
  done: { label: 'הושלם', cls: s.badgeGreen },
}

const PAGES = [
  'דשבורד',
  'מחשבון תכ"ם',
  'מחולל בריפים',
  'רובד 5',
  'פרופיל',
  'אדמין',
  'כניסה',
  'אישורים',
  'ספקים',
  'פרויקטים',
  'כללי',
]

export default function DevTasks() {
  const { tasks, loading, refresh, addTask, updateTask, deleteTask } =
    useDevTasks()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPage, setNewPage] = useState('')
  const [newPriority, setNewPriority] = useState<DevTask['priority']>('normal')

  const filtered =
    filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  const counts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    await addTask({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      page: newPage || null,
      priority: newPriority,
      status: 'todo',
    })
    setNewTitle('')
    setNewDesc('')
    setNewPage('')
    setNewPriority('normal')
    setShowAdd(false)
  }

  const handleDelete = async (id: string) => {
    await deleteTask(id)
    setDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className={s.empty}>
        <div className={s.spinner} />
        <span>טוען משימות...</span>
      </div>
    )
  }

  return (
    <div>
      <div className={s.toolbar}>
        <div>
          <h2 className={s.toolbarTitle}>🔧 משימות פיתוח</h2>
          <p className={s.toolbarSub}>
            {counts.todo} לביצוע • {counts.in_progress} בתהליך •{' '}
            {counts.done} הושלמו
          </p>
        </div>
        <div className={s.toolbarActions}>
          <button className={s.btnGhost} onClick={refresh}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            רענן
          </button>
          <button className={s.btnPrimary} onClick={() => setShowAdd(true)}>
            + משימה חדשה
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--amber-bg)' }}>
            <span style={{ fontSize: 22 }}>📋</span>
          </div>
          <div>
            <div className={s.kpiLabel}>לביצוע</div>
            <div className={s.kpiValue} style={{ color: 'var(--amber)' }}>{counts.todo}</div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--primary-bg)' }}>
            <span style={{ fontSize: 22 }}>🔄</span>
          </div>
          <div>
            <div className={s.kpiLabel}>בתהליך</div>
            <div className={s.kpiValue} style={{ color: 'var(--primary)' }}>{counts.in_progress}</div>
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'var(--green-bg)' }}>
            <span style={{ fontSize: 22 }}>✅</span>
          </div>
          <div>
            <div className={s.kpiLabel}>הושלמו</div>
            <div className={s.kpiValue} style={{ color: 'var(--green)' }}>{counts.done}</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className={s.filterBar}>
        <span className={s.filterLabel}>סטטוס:</span>
        {['all', 'todo', 'in_progress', 'done'].map(f => (
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

      {/* Tasks */}
      {filtered.length === 0 ? (
        <div className={s.empty}>
          <span>אין משימות {filter !== 'all' ? 'בסטטוס זה' : ''}</span>
        </div>
      ) : (
        filtered.map(task => (
          <div key={task.id} className={s.itemCard}>
            <div className={s.itemCardHeader}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={s.itemTitle}>{task.title}</span>
                <span className={`${s.badge} ${PRIORITY_MAP[task.priority].cls}`}>
                  {PRIORITY_MAP[task.priority].label}
                </span>
                {task.page && (
                  <span className={`${s.badge} ${s.badgeGray}`}>
                    {task.page}
                  </span>
                )}
              </div>
              <div className={s.inlineActions}>
                <select
                  className={s.formSelect}
                  style={{ width: 'auto', minWidth: 100, padding: '4px 10px', fontSize: 12 }}
                  value={task.status}
                  onChange={e =>
                    updateTask(task.id, {
                      status: e.target.value as DevTask['status'],
                    })
                  }
                >
                  <option value="todo">לביצוע</option>
                  <option value="in_progress">בתהליך</option>
                  <option value="done">הושלם</option>
                </select>
                {deleteConfirm === task.id ? (
                  <div className={s.confirmDelete}>
                    <span>בטוח?</span>
                    <button className={s.confirmYes} onClick={() => handleDelete(task.id)}>
                      מחק
                    </button>
                    <button className={s.actionBtn} onClick={() => setDeleteConfirm(null)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    className={`${s.actionBtn} ${s.deleteBtn}`}
                    onClick={() => setDeleteConfirm(task.id)}
                    title="מחיקה"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {task.description && <p className={s.itemDesc}>{task.description}</p>}
          </div>
        ))
      )}

      {/* Add task modal */}
      {showAdd && (
        <div className={s.modalOverlay} onClick={() => setShowAdd(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <button className={s.modalClose} onClick={() => setShowAdd(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </button>
            <h3 className={s.modalTitle}>משימה חדשה</h3>

            <div className={s.formGroup}>
              <label className={s.formLabel}>כותרת *</label>
              <input
                className={s.formInput}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="תיאור קצר של המשימה"
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>תיאור</label>
              <textarea
                className={s.formTextarea}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="פרטים נוספים (אופציונלי)"
              />
            </div>
            <div className={s.formRow}>
              <div className={s.formGroup}>
                <label className={s.formLabel}>עמוד</label>
                <select
                  className={s.formSelect}
                  value={newPage}
                  onChange={e => setNewPage(e.target.value)}
                >
                  <option value="">— ללא —</option>
                  {PAGES.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.formGroup}>
                <label className={s.formLabel}>עדיפות</label>
                <select
                  className={s.formSelect}
                  value={newPriority}
                  onChange={e =>
                    setNewPriority(e.target.value as DevTask['priority'])
                  }
                >
                  <option value="low">נמוך</option>
                  <option value="normal">רגיל</option>
                  <option value="urgent">דחוף</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className={s.btnGhost} onClick={() => setShowAdd(false)}>
                ביטול
              </button>
              <button className={s.btnPrimary} onClick={handleAdd} disabled={!newTitle.trim()}>
                הוסף משימה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
