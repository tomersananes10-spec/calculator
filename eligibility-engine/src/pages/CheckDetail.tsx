import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Badge } from '../components/ui/Badge'
import { StatusIcon, statusLabel, reqStatusLabel } from '../components/ui/StatusIcon'
import { ProgressBar } from '../components/ui/ProgressBar'
import s from './CheckDetail.module.css'

function statusVariant(status: string) {
  if (status === 'pass') return 'pass' as const
  if (status === 'requires_review') return 'review' as const
  return 'fail' as const
}

function bannerClass(status: string) {
  if (status === 'pass') return s.bannerPass
  if (status === 'requires_review') return s.bannerReview
  return s.bannerFail
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_LABELS: Record<string, string> = {
  check_created: 'בדיקה נוצרה',
  decision_made: 'החלטה נשמרה',
  decision_changed: 'החלטה עודכנה',
}

export function CheckDetail() {
  const { id } = useParams<{ id: string }>()
  const [check, setCheck] = useState<any>(null)
  const [audit, setAudit] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: checkData } = await supabase
        .from('eligibility_checks')
        .select('*, decisions(*)')
        .eq('id', id)
        .single()

      const { data: auditData } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })

      setCheck(checkData)
      setAudit(auditData ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className={s.loading}>טוען...</div>
  if (!check) return <div className={s.loading}>בדיקה לא נמצאה</div>

  const results = check.results ?? []
  const decision = check.decisions?.[0]

  return (
    <div className={s.page}>
      <Link to="/history" className={s.backLink}>→ חזרה להיסטוריה</Link>

      <div className={s.headerLabel}>תיק בדיקה</div>
      <h1 className={s.title}>{check.candidate_name}</h1>
      <div className={s.meta}>
        {check.role_template_name}
        {check.candidate_company && ` · ${check.candidate_company}`}
        {' · '}
        {formatDate(check.created_at)}
      </div>

      <div className={bannerClass(check.overall_status)}>
        <StatusIcon status={check.overall_status} size={20} />
        {statusLabel(check.overall_status)} · ציון {check.overall_score}%
      </div>

      <div className={s.statsRow}>
        <div className={s.statBox}>
          <div className={s.statBoxValue}>{check.estimated_years}</div>
          <div className={s.statBoxLabel}>שנות ניסיון</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statBoxValue} style={{ color: 'var(--green)' }}>
            {results.filter((r: any) => r.status === 'pass').length}
          </div>
          <div className={s.statBoxLabel}>עומד</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statBoxValue} style={{ color: 'var(--amber)' }}>
            {results.filter((r: any) => r.status === 'requires_review').length}
          </div>
          <div className={s.statBoxLabel}>לבדיקה</div>
        </div>
      </div>

      <div className={s.sectionTitle}>תנאי סף</div>
      {results.map((req: any) => (
        <div key={req.requirementId} className={s.reqCard}>
          <div>
            <div className={s.reqName}>{req.requirement.label}</div>
            <div className={s.reqEvidence}>{req.summary}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProgressBar value={req.score} variant={statusVariant(req.status)} />
            <Badge variant={statusVariant(req.status)}>{reqStatusLabel(req.status)}</Badge>
          </div>
        </div>
      ))}

      {decision && (
        <>
          <div className={s.sectionTitle}>החלטת רכזת</div>
          <div className={s.decisionCard}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <Badge variant={decision.overall_decision === 'approved' ? 'pass' : decision.overall_decision === 'rejected' ? 'fail' : 'review'}>
                {decision.overall_decision === 'approved' ? 'אושר' : decision.overall_decision === 'rejected' ? 'נדחה' : 'דרוש השלמה'}
              </Badge>
            </div>
            {decision.decision_notes && (
              <>
                <div className={s.decisionLabel}>נימוק</div>
                <div className={s.decisionNotes}>{decision.decision_notes}</div>
              </>
            )}
          </div>
        </>
      )}

      {audit.length > 0 && (
        <>
          <div className={s.sectionTitle}>מעקב פעולות (Audit Trail)</div>
          <div className={s.auditList}>
            {audit.map(entry => (
              <div key={entry.id} className={s.auditItem}>
                <span className={s.auditAction}>{ACTION_LABELS[entry.action] ?? entry.action}</span>
                <span className={s.auditTime}>{formatDate(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
