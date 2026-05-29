import { Link } from 'react-router-dom'
import { useCheckHistory } from '../hooks/useCheckHistory'
import { Badge } from '../components/ui/Badge'
import s from './CheckHistory.module.css'

function statusVariant(status: string) {
  if (status === 'pass') return 'pass' as const
  if (status === 'requires_review') return 'review' as const
  return 'fail' as const
}

function statusLabel(status: string) {
  if (status === 'pass') return 'עומד'
  if (status === 'requires_review') return 'לבדיקה'
  return 'לא עומד'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  return `לפני ${days} ימים`
}

export function CheckHistory() {
  const { checks, loading } = useCheckHistory()

  return (
    <div className={s.page}>
      <div className={s.headerLabel}>היסטוריה</div>
      <h1 className={s.title}>בדיקות שבוצעו</h1>
      <p className={s.subtitle}>רשימת כל בדיקות תנאי הסף שבוצעו</p>

      {loading && <div className={s.loading}>טוען...</div>}

      {!loading && checks.length === 0 && (
        <div className={s.emptyCard}>
          <div className={s.emptyText}>עדיין לא בוצעו בדיקות</div>
          <Link to="/check/new" className={s.btnPrimary}>
            בדיקה חדשה
          </Link>
        </div>
      )}

      {!loading && checks.length > 0 && (
        <div className={s.list}>
          {checks.map(check => (
            <Link key={check.id} to={`/check/${check.id}`} className={s.checkRow}>
              <div className={s.checkInfo}>
                <span className={s.checkName}>{check.candidate_name}</span>
                <span className={s.checkMeta}>
                  {check.role_template_name}
                  {check.candidate_company && ` · ${check.candidate_company}`}
                  {' · '}
                  {timeAgo(check.created_at)}
                </span>
              </div>
              <div className={s.checkRight}>
                <span className={s.scorePill}>{check.overall_score}%</span>
                <Badge variant={statusVariant(check.overall_status)}>
                  {statusLabel(check.overall_status)}
                </Badge>
                {check.status === 'decided' && (
                  <Badge variant="pass">הוחלט</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
