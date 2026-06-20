// דשבורד מנהל מינהל הרכש — 10 KPIs + הליכים פעילים לפי שלב + SLA breaches
// משתמש ב-aggregations חיים מ-Supabase ולא ב-mock.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { STAGES } from '../modules/tenders/data/stagesBaseline'
import { KPIS } from '../modules/tenders/data/kpis'
import type { Tender, TenderApprovalRequest, TenderMilestone, TenderProtocol, TenderSlaEvent, TenderVendorEvaluation } from '../modules/tenders/types'
import styles from './TendersDashboardPage.module.css'

interface DashData {
  tenders: Tender[]
  approvals: TenderApprovalRequest[]
  protocols: TenderProtocol[]
  milestones: TenderMilestone[]
  evaluations: TenderVendorEvaluation[]
  slaEvents: TenderSlaEvent[]
}

const EMPTY: DashData = { tenders: [], approvals: [], protocols: [], milestones: [], evaluations: [], slaEvents: [] }

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function workingDaysBetween(start: Date, end: Date): number {
  let n = 0
  const cursor = new Date(start)
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    const day = cursor.getDay()
    if (day !== 5 && day !== 6) n++  // ראשון–חמישי
  }
  return n
}

export function TendersDashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [tendersRes, approvalsRes, protocolsRes, milestonesRes, evalsRes, slaRes] = await Promise.all([
        supabase.from('tenders').select('*'),
        supabase.from('tender_approval_requests').select('*'),
        supabase.from('tender_protocols').select('*'),
        supabase.from('tender_milestones').select('*'),
        supabase.from('tender_vendor_evaluations').select('*'),
        supabase.from('tender_sla_events').select('*'),
      ])
      const firstErr = [tendersRes, approvalsRes, protocolsRes, milestonesRes, evalsRes, slaRes].find(r => r.error)?.error
      if (firstErr) { setError(firstErr.message); setLoading(false); return }
      setData({
        tenders: (tendersRes.data ?? []) as Tender[],
        approvals: (approvalsRes.data ?? []) as TenderApprovalRequest[],
        protocols: (protocolsRes.data ?? []) as TenderProtocol[],
        milestones: (milestonesRes.data ?? []) as TenderMilestone[],
        evaluations: (evalsRes.data ?? []) as TenderVendorEvaluation[],
        slaEvents: (slaRes.data ?? []) as TenderSlaEvent[],
      })
      setLoading(false)
    }
    void load()
  }, [])

  const kpis = useMemo(() => {
    const closed = data.tenders.filter(t => t.current_stage === 'closed')
    const closedOnTime = closed.filter(t => {
      if (!t.actual_closure_date || !t.baseline_start_date) return false
      const wd = workingDaysBetween(new Date(t.baseline_start_date), new Date(t.actual_closure_date))
      return wd <= 209  // עפ"י סיכום שלבים — 209 ימי עבודה
    })

    // Lead time ממוצע
    const leadTimes = closed
      .filter(t => t.actual_go_live_date && t.baseline_start_date)
      .map(t => workingDaysBetween(new Date(t.baseline_start_date!), new Date(t.actual_go_live_date!)))
    const avgLeadTime = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
      : 0

    // % החזרות מועדה
    const totalCommitteeProtocols = data.protocols.length
    const returned = data.protocols.filter(p =>
      p.decision === 'returned_for_correction' || p.decision === 'completion_required'
    ).length

    // SLA compliance של גורם מקצועי
    const profReviews = data.approvals.filter(a => a.request_type === 'professional_review' && a.decided_at)
    const profOnTime = profReviews.filter(a => {
      if (!a.sla_due_at || !a.decided_at) return false
      return new Date(a.decided_at) <= new Date(a.sla_due_at)
    })

    // זמן חתימת ספק ממוצע
    // (פוטנציאל — דורש contracts table. נשתמש ב-approximation מ-approvals)

    // % אבני דרך ללא הערות (accepted vs partially_accepted/rejected)
    const finishedMilestones = data.milestones.filter(m => m.status === 'accepted' || m.status === 'partially_accepted' || m.status === 'rejected')
    const clean = data.milestones.filter(m => m.status === 'accepted').length

    // % הליכים סגורים עם הערכת ספק
    const tendersWithEval = new Set(data.evaluations.map(e => e.tender_id))
    const closedWithEval = closed.filter(t => tendersWithEval.has(t.id)).length

    // הפרות SLA חודש אחרון
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1)
    const recentBreaches = data.slaEvents.filter(s =>
      s.status === 'breached' && s.breached_at && new Date(s.breached_at) > monthAgo
    ).length

    return {
      leadTime: { value: avgLeadTime || '—', good: avgLeadTime > 0 && avgLeadTime <= 95, warn: avgLeadTime > 95 && avgLeadTime <= 130, bad: avgLeadTime > 130, target: '≤ 95 ימי עבודה' },
      onTime: { value: pct(closedOnTime.length, closed.length), good: pct(closedOnTime.length, closed.length) >= 80, warn: false, bad: closed.length > 0 && pct(closedOnTime.length, closed.length) < 80, target: '≥ 80%' },
      committeeReturns: { value: pct(returned, totalCommitteeProtocols), good: pct(returned, totalCommitteeProtocols) <= 10 && totalCommitteeProtocols > 0, warn: false, bad: pct(returned, totalCommitteeProtocols) > 10, target: '≤ 10%' },
      profSla: { value: pct(profOnTime.length, profReviews.length), good: pct(profOnTime.length, profReviews.length) >= 90 && profReviews.length > 0, warn: false, bad: profReviews.length > 0 && pct(profOnTime.length, profReviews.length) < 90, target: '≥ 90%' },
      milestonesClean: { value: pct(clean, finishedMilestones.length), good: pct(clean, finishedMilestones.length) >= 70 && finishedMilestones.length > 0, warn: false, bad: finishedMilestones.length > 0 && pct(clean, finishedMilestones.length) < 70, target: '≥ 70%' },
      evalCoverage: { value: pct(closedWithEval, closed.length), good: closed.length > 0 && pct(closedWithEval, closed.length) === 100, warn: false, bad: closed.length > 0 && pct(closedWithEval, closed.length) < 100, target: '100% (בלוקר)' },
      slaBreaches30d: { value: recentBreaches, good: recentBreaches === 0, warn: recentBreaches > 0 && recentBreaches <= 5, bad: recentBreaches > 5, target: 'מינימום אפשרי' },
    }
  }, [data])

  const stageDistribution = useMemo(() => {
    return STAGES.map(s => ({
      stage: s,
      count: data.tenders.filter(t => t.current_stage === s.code).length,
    })).filter(x => x.count > 0)
  }, [data.tenders])

  const maxStageCount = Math.max(1, ...stageDistribution.map(x => x.count))

  const slaBreaches = useMemo(() => {
    return data.slaEvents
      .filter(s => s.status === 'breached' || s.status === 'escalated')
      .sort((a, b) => (b.breached_at ?? '').localeCompare(a.breached_at ?? ''))
      .slice(0, 10)
  }, [data.slaEvents])

  const tenderMap = useMemo(() => new Map(data.tenders.map(t => [t.id, t])), [data.tenders])

  if (loading) return <div className={styles.page}><div className={styles.loading}>טוען נתוני מנהל…</div></div>
  if (error) return <div className={styles.page}><div className={styles.errorBox}>{error}</div></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>📊 דשבורד מנהל מינהל הרכש</h1>
        <p className={styles.sub}>10 KPIs · עומס פעיל · SLA breaches</p>
      </div>

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <Kpi label="Lead Time ממוצע (מעל 5M)" value={kpis.leadTime.value} sub={kpis.leadTime.target} state={kpis.leadTime.good ? 'good' : kpis.leadTime.bad ? 'bad' : 'warn'} />
        <Kpi label="% הליכים בזמן יעד" value={`${kpis.onTime.value}%`} sub={kpis.onTime.target} state={kpis.onTime.good ? 'good' : kpis.onTime.bad ? 'bad' : 'warn'} />
        <Kpi label="% החזרות מועדה" value={`${kpis.committeeReturns.value}%`} sub={kpis.committeeReturns.target} state={kpis.committeeReturns.good ? 'good' : kpis.committeeReturns.bad ? 'bad' : 'warn'} />
        <Kpi label="עמידה ב-SLA גורם מקצועי" value={`${kpis.profSla.value}%`} sub={kpis.profSla.target} state={kpis.profSla.good ? 'good' : kpis.profSla.bad ? 'bad' : 'warn'} />
        <Kpi label="אבני דרך ללא הערות" value={`${kpis.milestonesClean.value}%`} sub={kpis.milestonesClean.target} state={kpis.milestonesClean.good ? 'good' : kpis.milestonesClean.bad ? 'bad' : 'warn'} />
        <Kpi label="הערכות ספק (סגירה)" value={`${kpis.evalCoverage.value}%`} sub={kpis.evalCoverage.target} state={kpis.evalCoverage.good ? 'good' : kpis.evalCoverage.bad ? 'bad' : 'warn'} />
        <Kpi label="הפרות SLA (30 ימים)" value={kpis.slaBreaches30d.value} sub={kpis.slaBreaches30d.target} state={kpis.slaBreaches30d.good ? 'good' : kpis.slaBreaches30d.bad ? 'bad' : 'warn'} />
        <Kpi label="הליכים פעילים" value={data.tenders.filter(t => t.current_stage !== 'closed' && t.current_stage !== 'cancelled').length} sub="מסך כלל" state="good" />
        <Kpi label="הליכים סגורים" value={data.tenders.filter(t => t.current_stage === 'closed').length} sub="היסטוריה" state="good" />
        <Kpi label="הליכים מבוטלים" value={data.tenders.filter(t => t.current_stage === 'cancelled').length} sub="היסטוריה" state="good" />
      </div>

      {/* Stage distribution */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          עומס פעיל לפי שלב
          <span className={styles.sub}>{stageDistribution.reduce((a, b) => a + b.count, 0)} הליכים</span>
        </div>
        {stageDistribution.length === 0 ? (
          <div className={styles.empty}>אין הליכים פעילים</div>
        ) : (
          <div className={styles.stageList}>
            {stageDistribution.map(({ stage, count }) => {
              const widthPct = (count / maxStageCount) * 100
              const barClass = stage.pingpong ? styles.amber : ''
              return (
                <div key={stage.code} className={styles.stageRow}>
                  <div className={styles.stageNum}>{stage.stageNumber}</div>
                  <div>
                    <div className={styles.stageName}>{stage.label}</div>
                    <div className={styles.stageBar}>
                      <div className={`${styles.stageBarFill} ${barClass}`} style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                  <div></div>
                  <div className={styles.stageCount}>{count}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SLA breaches */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          הפרות SLA עדכניות
          <span className={styles.sub}>10 הפרות אחרונות</span>
        </div>
        {slaBreaches.length === 0 ? (
          <div className={styles.empty}>אין הפרות SLA פעילות 🎉</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr>
                <th>הליך</th>
                <th>סוג SLA</th>
                <th>תאריך הפרה</th>
                <th>סטטוס</th>
              </tr></thead>
              <tbody>
                {slaBreaches.map(s => {
                  const t = s.tender_id ? tenderMap.get(s.tender_id) : null
                  return (
                    <tr key={s.id} onClick={() => t && navigate(`/tenders/${t.id}`)}>
                      <td>{t ? t.title : '—'}</td>
                      <td>{s.sla_type}</td>
                      <td>{s.breached_at ? new Date(s.breached_at).toLocaleDateString('he-IL') : '—'}</td>
                      <td>
                        <span className={`${styles.pill} ${s.status === 'escalated' ? styles.p_red : styles.p_amber}`}>
                          {s.status === 'escalated' ? 'הוסלם' : 'הופר'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KPI definitions */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          מילון KPIs
          <span className={styles.sub}>הגדרות לפי האפיון</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>KPI</th>
              <th>יעד</th>
              <th>מקור</th>
              <th>מודול</th>
            </tr></thead>
            <tbody>
              {KPIS.map(k => (
                <tr key={k.id}>
                  <td>{k.label}</td>
                  <td>{k.target}</td>
                  <td>{k.measurementSource}</td>
                  <td><code style={{ fontSize: 11 }}>{k.module}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, state }: { label: string; value: string | number; sub: string; state: 'good' | 'warn' | 'bad' }) {
  const icon = state === 'good' ? '✓' : state === 'bad' ? '⚠' : '○'
  return (
    <div className={`${styles.kpiCard} ${styles[state]}`}>
      <div className={styles.kpiStatus}>{icon}</div>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiTarget}>{sub}</div>
    </div>
  )
}
