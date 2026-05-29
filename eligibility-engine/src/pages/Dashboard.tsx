import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useCheckHistory } from '../hooks/useCheckHistory'
import { Badge } from '../components/ui/Badge'
import s from './Dashboard.module.css'

const STATUS_COLORS = { pass: '#22c55e', requires_review: '#f59e0b', fail: '#ef4444' }

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
  if (minutes < 60) return `לפני ${minutes} דק׳`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שע׳`
  const days = Math.floor(hours / 24)
  return `לפני ${days} ימים`
}

export function Dashboard() {
  const { checks, loading } = useCheckHistory()

  const total = checks.length
  const passCount = checks.filter(c => c.overall_status === 'pass').length
  const reviewCount = checks.filter(c => c.overall_status === 'requires_review').length
  const failCount = checks.filter(c => c.overall_status === 'fail').length

  const pieData = [
    { name: 'עומד', value: passCount, color: STATUS_COLORS.pass },
    { name: 'לבדיקה', value: reviewCount, color: STATUS_COLORS.requires_review },
    { name: 'לא עומד', value: failCount, color: STATUS_COLORS.fail },
  ].filter(d => d.value > 0)

  const roleMap = new Map<string, { pass: number; review: number; fail: number }>()
  for (const c of checks) {
    const name = c.role_template_name.replace(/מנהל\/ת תחום בכיר /, '')
    const entry = roleMap.get(name) ?? { pass: 0, review: 0, fail: 0 }
    if (c.overall_status === 'pass') entry.pass++
    else if (c.overall_status === 'requires_review') entry.review++
    else entry.fail++
    roleMap.set(name, entry)
  }
  const barData = Array.from(roleMap.entries()).map(([name, counts]) => ({ name, ...counts }))

  return (
    <div className={s.page}>
      <div className={s.headerLabel}>סקירה כללית</div>
      <h1 className={s.title}>מנוע בדיקת זכאות</h1>
      <p className={s.subtitle}>בדיקות תנאי סף לתפקידי ליבה טכנולוגיים</p>

      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statValue}>{total}</div>
          <div className={s.statLabel}>סה"כ בדיקות</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue} style={{ color: STATUS_COLORS.pass }}>{passCount}</div>
          <div className={s.statLabel}>עומדים</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue} style={{ color: STATUS_COLORS.requires_review }}>{reviewCount}</div>
          <div className={s.statLabel}>לבדיקה</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue} style={{ color: STATUS_COLORS.fail }}>{failCount}</div>
          <div className={s.statLabel}>נפסלו</div>
        </div>
      </div>

      {!loading && total === 0 && (
        <div className={s.emptyCard}>
          <div className={s.emptyTitle}>אין עדיין בדיקות</div>
          <div className={s.emptyText}>התחילו בבדיקת תנאי סף ראשונה כדי לראות נתונים</div>
          <Link to="/check/new" className={s.btnPrimary}>בדיקה חדשה</Link>
        </div>
      )}

      {total > 0 && (
        <>
          <div className={s.chartsRow}>
            <div className={s.chartCard}>
              <div className={s.chartTitle}>פילוח לפי סטטוס</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} בדיקות`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
                {pieData.map(d => (
                  <span key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>

            <div className={s.chartCard}>
              <div className={s.chartTitle}>פילוח לפי תפקיד</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="pass" stackId="a" fill={STATUS_COLORS.pass} name="עומד" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="review" stackId="a" fill={STATUS_COLORS.requires_review} name="לבדיקה" />
                  <Bar dataKey="fail" stackId="a" fill={STATUS_COLORS.fail} name="לא עומד" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={s.recentTitle}>בדיקות אחרונות</div>
          <div className={s.recentList}>
            {checks.slice(0, 5).map(check => (
              <Link key={check.id} to={`/check/${check.id}`} className={s.recentRow}>
                <div>
                  <div className={s.recentName}>{check.candidate_name}</div>
                  <div className={s.recentMeta}>
                    {check.role_template_name} · {timeAgo(check.created_at)}
                  </div>
                </div>
                <Badge variant={statusVariant(check.overall_status)}>
                  {statusLabel(check.overall_status)} · {check.overall_score}%
                </Badge>
              </Link>
            ))}
          </div>
          {checks.length > 5 && (
            <Link to="/history" className={s.viewAll}>
              הצג את כל {checks.length} הבדיקות →
            </Link>
          )}
        </>
      )}
    </div>
  )
}
