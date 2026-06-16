import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calculator, FileText, CheckCircle2, Scale, Plus, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useCalculationHistory } from '../modules/takam-calculator/useCalculationHistory'
import { useBriefs } from '../hooks/useBriefs'
import { supabase } from '../lib/supabase'
import type { Tender } from '../modules/tenders/types'
import roved5Services from '../data/roved5Services.json'
import styles from './Dashboard.module.css'

const STAGE_LABELS: Record<string, string> = {
  preconditions: 'S0 — תנאים מקדימים',
  initiation_budget: 'S1 — ייזום ותקציב',
  olma_approval: 'S2 — אישור מינהל הרכש',
  committee_outbound: 'S3 — ועדת יציאה',
  professional_review: 'S4 — סקירה מקצועית',
  vendor_outreach: 'S5 — פניה לספקים',
  proposals: 'S6 — קליטת הצעות',
  committee_winner: 'S7 — ועדת זכייה',
  contract: 'S8 — חוזה',
  purchase_order: 'S9 — הזמנת רכש',
  milestones: 'S10 — אבני דרך',
  invoices: 'S11 — חשבוניות',
  vendor_evaluation: 'S12 — הערכת ספק',
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} ד׳`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'לפני שעה' : `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? 'לפני שבוע' : `לפני ${weeks} שבועות`
}

function hebrewDate(d: Date): string {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
  return `יום ${days[d.getDay()]}, ${d.getDate()} ב${months[d.getMonth()]} ${d.getFullYear()}`
}

type FeedTag = 'BRIEF' | 'CALC' | 'TENDER'
interface FeedItem {
  when: string
  tag: FeedTag
  title: string
  meta: string
  link: string
}

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fullName = user?.user_metadata?.full_name ?? ''
  const firstName = fullName.split(' ')[0] || (user?.email?.split('@')[0]) || 'משתמש'
  const calcHistory = useCalculationHistory(user?.id)
  const { briefs } = useBriefs()

  const [tenders, setTenders] = useState<Tender[]>([])

  useEffect(() => {
    void supabase.from('tenders').select('*').then(({ data }) => {
      setTenders((data ?? []) as Tender[])
    })
  }, [])

  const activeTenders = useMemo(
    () => tenders.filter(t => t.current_stage !== 'closed' && t.current_stage !== 'cancelled'),
    [tenders],
  )

  const draftBriefs = briefs.filter(b => b.status === 'draft').length
  const submittedBriefs = briefs.filter(b => b.status === 'submitted').length

  // Stream — merge by updated_at, take 7 latest
  const stream = useMemo(() => {
    const items: FeedItem[] = []
    tenders.forEach(t => items.push({
      when: t.updated_at ?? t.created_at,
      tag: 'TENDER',
      title: t.name,
      meta: STAGE_LABELS[t.current_stage] ?? t.current_stage,
      link: `/tenders/${t.id}`,
    }))
    briefs.forEach(b => items.push({
      when: b.updated_at,
      tag: 'BRIEF',
      title: b.title || 'טיוטה ללא שם',
      meta: b.status === 'submitted' ? 'הוגש לאישור' : 'טיוטה',
      link: `/brief-generator?id=${b.id}`,
    }))
    calcHistory.calculations.forEach(c => items.push({
      when: c.updated_at,
      tag: 'CALC',
      title: c.name || 'חישוב ללא שם',
      meta: c.ministry || 'תכ"ם',
      link: `/calculator?load=${c.id}`,
    }))
    return items
      .filter(i => i.when)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 7)
  }, [tenders, briefs, calcHistory.calculations])

  const activeTenderStage = activeTenders[0]
    ? (STAGE_LABELS[activeTenders[0].current_stage] ?? activeTenders[0].current_stage)
    : 'אין הליך פעיל'

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.greeting}>בוקר טוב, {firstName}<span className={styles.dot}>.</span></h1>
          <p className={styles.sub}>{hebrewDate(new Date())}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn}><Search size={14} /> חיפוש</button>
          <Link to="/brief-generator" className={styles.btn}><FileText size={14} /> בריף חדש</Link>
          <Link to="/calculator" className={styles.btn}><Calculator size={14} /> חישוב חדש</Link>
          <Link to="/tenders/new" className={`${styles.btn} ${styles.btnPrimary}`}><Plus size={14} /> הליך חדש</Link>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className={styles.grid}>

        {/* LEFT — work cards */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>העבודה הפעילה שלי</h3>
          <p className={styles.sectionSub}>מה פתוח אצלך כרגע — לפי מודול</p>

          <div className={styles.cards}>

            <button className={styles.card} onClick={() => navigate('/calculator')}>
              <div className={styles.cardHead}>
                <div className={`${styles.cardIcon} ${styles.iconCalc}`}><Calculator size={17} /></div>
                <div className={styles.cardNums}>
                  <div className={styles.num}>{calcHistory.calculations.length}</div>
                  <div className={styles.lbl}>חישובים שמורים</div>
                </div>
              </div>
              <div className={styles.cardMeta}>
                {calcHistory.calculations.length > 0
                  ? 'מחשבון תכ"ם ו-AI/ML'
                  : 'עדיין לא ביצעת חישוב'}
              </div>
            </button>

            <button className={styles.card} onClick={() => navigate('/briefs')}>
              <div className={styles.cardHead}>
                <div className={`${styles.cardIcon} ${styles.iconBrief}`}><FileText size={17} /></div>
                <div className={styles.cardNums}>
                  <div className={styles.num}>{briefs.length}</div>
                  <div className={styles.lbl}>בריפים פעילים</div>
                </div>
              </div>
              <div className={styles.cardMeta}>
                {briefs.length > 0
                  ? `${draftBriefs} בטיוטה · ${submittedBriefs} הוגשו`
                  : 'עדיין לא יצרת בריף'}
              </div>
            </button>

            <button className={styles.card} onClick={() => navigate('/tenders')}>
              <div className={styles.cardHead}>
                <div className={`${styles.cardIcon} ${styles.iconTender}`}><CheckCircle2 size={17} /></div>
                <div className={styles.cardNums}>
                  <div className={styles.num}>{activeTenders.length}</div>
                  <div className={styles.lbl}>הליכים פעילים</div>
                </div>
              </div>
              <div className={styles.cardMeta}>{activeTenderStage}</div>
            </button>

            <button className={styles.card} onClick={() => navigate('/layer5')}>
              <div className={styles.cardHead}>
                <div className={`${styles.cardIcon} ${styles.iconLayer5}`}><Scale size={17} /></div>
                <div className={styles.cardNums}>
                  <div className={styles.num}>{(roved5Services as unknown[]).length}</div>
                  <div className={styles.lbl}>שירותים ברובד 5</div>
                </div>
              </div>
              <div className={styles.cardMeta}>AWS · GCP · קטלוג ממשלתי</div>
            </button>

          </div>
        </section>

        {/* RIGHT — activity feed */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>פעילות אחרונה</h3>
          <p className={styles.sectionSub}>העדכונים האחרונים שלך</p>

          <div className={styles.feed}>
            {stream.length === 0 ? (
              <div className={styles.emptyFeed}>
                אין פעילות אחרונה — התחל בבריף חדש או חישוב
              </div>
            ) : stream.map((s, i) => (
              <Link key={i} to={s.link} className={styles.feedItem}>
                <span className={`${styles.feedDot} ${styles[`dot${s.tag}`]}`} />
                <div className={styles.feedContent}>
                  <div className={styles.feedTitle}>{s.title}</div>
                  <div className={styles.feedMeta}>{s.meta}</div>
                </div>
                <div className={styles.feedTime}>{timeAgo(s.when)}</div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
