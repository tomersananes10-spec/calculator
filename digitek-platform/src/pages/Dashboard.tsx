import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlarmClock, ArrowUpRight, BarChart3, Banknote, Building2, Calculator,
  CheckCircle2, FileText, Hourglass, Layers, Plus, Scale, Search, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCalculationHistory } from '../modules/takam-calculator/useCalculationHistory'
import { useBriefs } from '../hooks/useBriefs'
import { supabase } from '../lib/supabase'
import type { Tender, TenderSlaEvent } from '../modules/tenders/types'
import styles from './Dashboard.module.css'

interface TendersOverview {
  tenders: Tender[]
  slaBreaches30d: number
  recentBreaches: TenderSlaEvent[]
}

const EMPTY: TendersOverview = { tenders: [], slaBreaches30d: 0, recentBreaches: [] }

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return `${Math.round(n)}`
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  if (days < 7) return `-${days}d`
  return `${Math.floor(days / 7)}w`
}

function workingDaysBetween(start: Date, end: Date): number {
  let n = 0
  const cursor = new Date(start)
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    const day = cursor.getDay()
    if (day !== 5 && day !== 6) n++
  }
  return n
}

const STAGE_LABELS: Record<string, string> = {
  preconditions: 'S0',
  initiation_budget: 'S1',
  olma_approval: 'S2',
  committee_outbound: 'S3',
  professional_review: 'S4',
  vendor_outreach: 'S5',
  proposals: 'S6',
  committee_winner: 'S7',
  contract: 'S8',
  purchase_order: 'S9',
  milestones: 'S10',
  invoices: 'S11',
  vendor_evaluation: 'S12',
}
const STAGE_ORDER = Object.keys(STAGE_LABELS)

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fullName = user?.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || (user?.email?.split('@')[0]) || 'משתמש'
  const calcHistory = useCalculationHistory(user?.id)
  const { briefs } = useBriefs()

  const [overview, setOverview] = useState<TendersOverview>(EMPTY)
  const [now] = useState(() => new Date())

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [tRes, sRes] = await Promise.all([
        supabase.from('tenders').select('*'),
        supabase.from('tender_sla_events').select('*').gte('created_at', thirtyDaysAgo).order('breached_at', { ascending: false }),
      ])
      const tenders = (tRes.data ?? []) as Tender[]
      const sla = (sRes.data ?? []) as TenderSlaEvent[]
      setOverview({
        tenders,
        slaBreaches30d: sla.filter(s => s.status === 'breached' || s.status === 'escalated').length,
        recentBreaches: sla.filter(s => s.status === 'breached' || s.status === 'escalated').slice(0, 6),
      })
    }
    void load().catch(() => {})
  }, [])

  // KPIs
  const activeTenders = useMemo(
    () => overview.tenders.filter(t => t.current_stage !== 'closed' && t.current_stage !== 'cancelled'),
    [overview.tenders],
  )
  const portfolioValue = useMemo(
    () => activeTenders.reduce((sum, t) => sum + (t.estimated_amount ?? 0), 0),
    [activeTenders],
  )
  const avgLeadTime = useMemo(() => {
    const closed = overview.tenders.filter(t => t.current_stage === 'closed' && t.baseline_start_date && t.actual_go_live_date)
    if (closed.length === 0) return null
    const total = closed.reduce(
      (sum, t) => sum + workingDaysBetween(new Date(t.baseline_start_date!), new Date(t.actual_go_live_date!)),
      0,
    )
    return Math.round(total / closed.length)
  }, [overview.tenders])

  // Stage distribution (active only)
  const stageCounts = useMemo(() => {
    const m = new Map<string, number>()
    activeTenders.forEach(t => m.set(t.current_stage, (m.get(t.current_stage) ?? 0) + 1))
    const max = Math.max(1, ...Array.from(m.values()))
    return STAGE_ORDER.map(s => ({
      key: s,
      label: STAGE_LABELS[s],
      count: m.get(s) ?? 0,
      pct: ((m.get(s) ?? 0) / max) * 100,
    }))
  }, [activeTenders])

  // Activity stream — merge tenders, briefs, calcs by updated_at
  const stream = useMemo(() => {
    const items: Array<{ when: string; tag: 'TENDER'|'BRIEF'|'CALC'; title: string; meta: string; link: string }> = []
    overview.tenders.slice(0, 8).forEach(t => items.push({
      when: t.updated_at ?? t.created_at,
      tag: 'TENDER', title: t.name, meta: `שלב ${STAGE_LABELS[t.current_stage] ?? t.current_stage}`,
      link: `/tenders/${t.id}`,
    }))
    briefs.slice(0, 8).forEach(b => items.push({
      when: b.updated_at,
      tag: 'BRIEF', title: b.title || 'טיוטה ללא שם',
      meta: b.status === 'submitted' ? 'הוגש' : 'טיוטה',
      link: `/brief-generator?id=${b.id}`,
    }))
    calcHistory.calculations.slice(0, 8).forEach(c => items.push({
      when: c.updated_at,
      tag: 'CALC', title: c.name || 'ללא שם',
      meta: `${c.ministry} · ₪${formatMoney(c.grand_total)}`,
      link: `/calculator?load=${c.id}`,
    }))
    return items
      .filter(i => i.when)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 7)
  }, [overview.tenders, briefs, calcHistory.calculations])

  // Pending count = tenders not at terminal stage + draft briefs
  const draftBriefs = briefs.filter(b => b.status === 'draft').length
  const submittedBriefs = briefs.filter(b => b.status === 'submitted').length

  // Chart: cumulative active tender value snapshots — simple sparkline of tenders created per week
  const chartPath = useMemo(() => {
    if (overview.tenders.length === 0) {
      return { area: 'M0,150 L600,150 L600,180 L0,180 Z', line: 'M0,150 L600,150' }
    }
    const weeks: number[] = new Array(13).fill(0)
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - 13 * weekMs
    overview.tenders.forEach(t => {
      const ts = new Date(t.created_at).getTime()
      if (ts < cutoff) return
      const w = Math.floor((Date.now() - ts) / weekMs)
      if (w >= 0 && w < 13) weeks[12 - w] += t.estimated_amount ?? 0
    })
    // cumulative
    let cum = 0
    const cumWeeks = weeks.map(v => (cum += v))
    const max = Math.max(1, ...cumWeeks)
    const pts = cumWeeks.map((v, i) => {
      const x = (i / 12) * 600
      const y = 160 - (v / max) * 140
      return { x, y }
    })
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const area = `${line} L600,180 L0,180 Z`
    return { area, line }
  }, [overview.tenders])

  return (
    <div className={styles.page}>
      {/* ── Status bar ── */}
      <div className={styles.statusbar}>
        <div className={styles.statusLeft}>
          <span className={styles.pill}><span className={styles.okDot}></span> SYSTEM · OPERATIONAL</span>
          <span className={styles.pill}>DB · digitek-dev</span>
          <span className={styles.pill}>SYNC · {now.toLocaleTimeString('en-GB', { hour12: false })}</span>
        </div>
        <div className={styles.statusRight}>
          <span>{now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
          <span>·</span>
          <span>{fullName || user?.email}</span>
        </div>
      </div>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>בוקר טוב, {firstName}<span className={styles.accent}>.</span></h1>
          <p className={styles.subtitle}>
            {`// ${activeTenders.length} הליכים פעילים · ${draftBriefs} בריפים בטיוטה`}
          </p>
        </div>
        <div className={styles.quickActions}>
          <button className={styles.qa}><Search size={14} /> חיפוש</button>
          <Link to="/brief-generator" className={styles.qa}><FileText size={14} /> בריף חדש</Link>
          <Link to="/tenders/new" className={`${styles.qa} ${styles.qaPrimary}`}><Plus size={14} /> הליך חדש</Link>
        </div>
      </div>

      {/* ── Bento grid ── */}
      <div className={styles.grid}>

        {/* Top row — 4 KPIs */}
        <div className={`${styles.tile} ${styles.t1}`} onClick={() => navigate('/tenders')}>
          <div className={styles.tileLabel}><Layers size={13} /> הליכים פעילים</div>
          <div className={styles.num}>{activeTenders.length}</div>
          <div className={`${styles.delta} ${styles.deltaUp}`}>
            <TrendingUp size={12} /> {overview.tenders.length} סה"כ
          </div>
        </div>

        <div className={`${styles.tile} ${styles.t2}`} onClick={() => navigate('/tenders')}>
          <div className={styles.tileLabel}><Banknote size={13} /> ערך תיק</div>
          <div className={styles.num}>
            {portfolioValue >= 1_000_000 ? (portfolioValue / 1_000_000).toFixed(1) : Math.round(portfolioValue / 1_000)}
            <span className={styles.unit}>{portfolioValue >= 1_000_000 ? 'M ₪' : 'K ₪'}</span>
          </div>
          <div className={`${styles.delta} ${styles.deltaNeutral}`}>
            <ArrowUpRight size={12} /> מצרפי פעיל
          </div>
        </div>

        <div className={`${styles.tile} ${styles.t3}`} onClick={() => navigate('/tenders/dashboard')}>
          <div className={styles.tileLabel}><AlarmClock size={13} /> SLA הפרות · 30d</div>
          <div className={styles.num}>{overview.slaBreaches30d}</div>
          <div className={`${styles.delta} ${overview.slaBreaches30d === 0 ? styles.deltaNeutral : styles.deltaDown}`}>
            {overview.slaBreaches30d === 0 ? 'מינימום אפשרי' : 'דורש טיפול'}
          </div>
        </div>

        <div className={`${styles.tile} ${styles.t4}`} onClick={() => navigate('/tenders/dashboard')}>
          <div className={styles.tileLabel}><Hourglass size={13} /> Lead Time</div>
          <div className={styles.num}>
            {avgLeadTime ?? '—'}{avgLeadTime !== null && <span className={styles.unit}>d</span>}
          </div>
          <div className={`${styles.delta} ${avgLeadTime && avgLeadTime <= 95 ? styles.deltaUp : styles.deltaNeutral}`}>
            {avgLeadTime !== null ? (avgLeadTime <= 95 ? 'תחת היעד (95)' : 'מעל היעד') : 'אין הליכים סגורים'}
          </div>
        </div>

        {/* Chart */}
        <div className={`${styles.tile} ${styles.tChart}`}>
          <div className={styles.chartHead}>
            <div>
              <h3>תזרים תיק הרכש · 13 שבועות</h3>
              <p>cumulative tender value</p>
            </div>
            <div className={styles.chartLegend}>
              <span><span className={styles.swatch} style={{ background: '#3b82f6' }}></span>פעיל</span>
            </div>
          </div>
          <div className={styles.chartArea}>
            <svg viewBox="0 0 600 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dashGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <line x1="0" y1="30" x2="600" y2="30" stroke="#eef4fa"/>
              <line x1="0" y1="75" x2="600" y2="75" stroke="#eef4fa"/>
              <line x1="0" y1="120" x2="600" y2="120" stroke="#eef4fa"/>
              <line x1="0" y1="165" x2="600" y2="165" stroke="#eef4fa"/>
              <path d={chartPath.area} fill="url(#dashGrad)"/>
              <path d={chartPath.line} fill="none" stroke="#3b82f6" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        {/* Activity stream */}
        <div className={`${styles.tile} ${styles.tStream}`}>
          <h3>פעילות אחרונה</h3>
          <p className={styles.headP}>// live feed</p>
          <div className={styles.streamList}>
            {stream.length === 0 ? (
              <div className={styles.emptyStream}>אין פעילות אחרונה</div>
            ) : stream.map((s, i) => (
              <Link key={i} to={s.link} className={styles.streamItem}>
                <div className={styles.streamTime}>{timeAgo(s.when)}</div>
                <div className={styles.streamBody}>
                  <span className={`${styles.streamTag} ${styles[`tag${s.tag}`]}`}>{s.tag}</span>
                  <div>{s.title}</div>
                  <div className={styles.streamMeta}>{s.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stages */}
        <div className={`${styles.tile} ${styles.tStages}`}>
          <h3>עומס לפי שלב</h3>
          <p className={styles.headP}>// active tenders by FSM stage</p>
          <div className={styles.stagesList}>
            {stageCounts.map(s => (
              <div key={s.key} className={styles.stageRow}>
                <span className={styles.stageNum}>{s.label}</span>
                <div className={styles.stageBar}><div style={{ width: `${s.pct}%` }} /></div>
                <span className={`${styles.stageCount} ${s.count === 0 ? styles.stageZero : ''}`}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modules */}
        <div className={`${styles.tile} ${styles.tModules}`}>
          <h3>מודולים</h3>
          <div className={styles.modGrid}>
            <Link to="/tenders" className={styles.modCard}>
              <div className={styles.modIcon}><CheckCircle2 size={17} /></div>
              <div className={styles.modName}>מורשי חתימה</div>
              <div className={styles.modMeta}>{activeTenders.length} פעילים · {overview.slaBreaches30d} הפרות</div>
            </Link>
            <Link to="/brief-generator" className={`${styles.modCard} ${styles.modSky}`}>
              <div className={styles.modIcon}><FileText size={17} /></div>
              <div className={styles.modName}>בריפים</div>
              <div className={styles.modMeta}>{briefs.length} · {draftBriefs} טיוטה · {submittedBriefs} הוגשו</div>
            </Link>
            <Link to="/calculator" className={`${styles.modCard} ${styles.modAmber}`}>
              <div className={styles.modIcon}><Calculator size={17} /></div>
              <div className={styles.modName}>מחשבון תכ"ם</div>
              <div className={styles.modMeta}>{calcHistory.calculations.length} חישובים · ₪{formatMoney(calcHistory.calculations.reduce((s, c) => s + c.grand_total, 0))}</div>
            </Link>
            <Link to="/layer5" className={`${styles.modCard} ${styles.modViolet}`}>
              <div className={styles.modIcon}><Scale size={17} /></div>
              <div className={styles.modName}>רובד 5</div>
              <div className={styles.modMeta}>שירותים מאושרים</div>
            </Link>
            <Link to="/tenders/dashboard" className={`${styles.modCard} ${styles.modTeal}`}>
              <div className={styles.modIcon}><BarChart3 size={17} /></div>
              <div className={styles.modName}>דשבורד מכרזים</div>
              <div className={styles.modMeta}>10 KPIs</div>
            </Link>
            <Link to="/suppliers" className={`${styles.modCard} ${styles.modRose}`}>
              <div className={styles.modIcon}><Building2 size={17} /></div>
              <div className={styles.modName}>ספקים</div>
              <div className={styles.modMeta}>פורטל ספקים פעיל</div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
