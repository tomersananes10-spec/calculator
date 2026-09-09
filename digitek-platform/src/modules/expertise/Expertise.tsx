import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExpertise } from './useExpertise'
import { expertiseAiSearch } from './expertiseAI'
import type { ExpertiseCluster, ExpertiseSpec, ExpertiseAiResponse } from './types'
import styles from './Expertise.module.css'

const hue = (h: number) => `hsl(${h} 60% 48%)`
const hbg = (h: number) => `hsl(${h} 60% 96%)`

const EXAMPLES = [
  'לשפר את חווית האזרח באתר',
  'להעביר מערכת ליבה ישנה לענן',
  'לבנות מודל AI לחיזוי',
  'להדריך עובדים על מערכת חדשה',
]

export function Expertise() {
  const { clusters, loading, error } = useExpertise()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [view, setView] = useState<'landing' | 'detail'>('landing')
  const [activeCluster, setActiveCluster] = useState<number | null>(null) // cluster_id
  const [activeSpecId, setActiveSpecId] = useState<number | null>(null)
  const [specFilter, setSpecFilter] = useState('')

  // AI state
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiRes, setAiRes] = useState<ExpertiseAiResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Deep-link from knowledge hub: ?cluster_id=5
  useEffect(() => {
    if (loading || clusters.length === 0) return
    const cid = Number(searchParams.get('cluster_id'))
    if (cid && clusters.some(c => c.cluster_id === cid)) {
      openCluster(cid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, clusters])

  const activeClusterObj = useMemo(
    () => clusters.find(c => c.cluster_id === activeCluster) ?? null,
    [clusters, activeCluster],
  )

  const filteredSpecs = useMemo(() => {
    if (!activeClusterObj) return []
    const q = specFilter.trim()
    if (!q) return activeClusterObj.specs
    return activeClusterObj.specs.filter(
      s => s.name.includes(q) || s.description.includes(q),
    )
  }, [activeClusterObj, specFilter])

  const activeSpec = useMemo(
    () => activeClusterObj?.specs.find(s => s.id === activeSpecId) ?? null,
    [activeClusterObj, activeSpecId],
  )

  function openCluster(clusterId: number, specId?: number) {
    setActiveCluster(clusterId)
    setActiveSpecId(specId ?? null)
    setSpecFilter('')
    setView('detail')
    window.scrollTo(0, 0)
  }

  function goHome() {
    setView('landing')
    window.scrollTo(0, 0)
  }

  async function runAi(text?: string) {
    const problem = (text ?? aiInput).trim()
    if (!problem || clusters.length === 0) return
    setAiInput(problem)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setAiLoading(true)
    setAiError(null)
    setAiRes(null)
    try {
      const res = await expertiseAiSearch(problem, clusters, ctrl.signal)
      if (!ctrl.signal.aborted) setAiRes(res)
    } catch (e) {
      if (!ctrl.signal.aborted) setAiError('החיפוש החכם לא זמין כרגע — נסה שוב או עיין באשכולות למטה.')
    } finally {
      if (!ctrl.signal.aborted) setAiLoading(false)
    }
  }

  function openHit(clusterId: number, specName: string) {
    const cluster = clusters.find(c => c.cluster_id === clusterId)
    const spec = cluster?.specs.find(s => s.name === specName)
    openCluster(clusterId, spec?.id)
  }

  function buildJourney() {
    const wish = aiInput.trim() || (aiRes?.summary ?? '')
    navigate(`/?wish=${encodeURIComponent(wish)}`)
  }

  function viewSuppliers(spec: ExpertiseSpec) {
    navigate(`/suppliers?search=${encodeURIComponent(spec.name)}`)
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.stateMsg}>טוען אשכולות והתמחויות…</div></div>
  }
  if (error) {
    return <div className={styles.page}><div className={styles.stateMsg}>שגיאה בטעינה: {error}</div></div>
  }

  const totalSpecs = clusters.reduce((a, c) => a + c.specs.length, 0)

  return (
    <div className={styles.page}>
      {view === 'landing' ? (
        <div className={styles.landing}>
          <h1 className={styles.pageTitle}>אשכולות והתמחויות</h1>
          <p className={styles.pageSub}>
            לא בטוח לאיזה אשכול אתה שייך? תאר את הצורך שלך וה-AI ימצא את ההתמחות המדויקת
            מתוך {totalSpecs} ההתמחויות של מכרז דיגיטק — או עיין בכל {clusters.length} האשכולות למטה.
          </p>

          <form className={styles.bigSearch} onSubmit={e => { e.preventDefault(); runAi() }}>
            <input
              className={styles.bigInput}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              placeholder="תאר את הצורך שלך במילים שלך…"
              disabled={aiLoading}
            />
            <button className={styles.bigBtn} type="submit" disabled={aiLoading}>
              {aiLoading ? 'מחפש…' : 'מצא לי ✨'}
            </button>
          </form>

          <div className={styles.examples}>
            {EXAMPLES.map(ex => (
              <button key={ex} className={styles.exChip} onClick={() => runAi(ex)} disabled={aiLoading}>
                {ex}
              </button>
            ))}
          </div>

          {aiError && <div className={styles.aiError}>{aiError}</div>}

          {aiRes && (
            <div className={styles.aiRes}>
              <h4 className={styles.aiResTitle}>✨ ה-AI מצא עבורך:</h4>
              {aiRes.summary && <p className={styles.aiSummary}>{aiRes.summary}</p>}
              {aiRes.hits.length === 0 && (
                <p className={styles.aiSummary}>לא נמצאה התמחות מובהקת — נסה לנסח את הצורך אחרת, או עיין באשכולות למטה.</p>
              )}
              {aiRes.hits.map((h, i) => (
                <button key={i} className={styles.hit} onClick={() => openHit(h.cluster_id, h.spec_name)}>
                  <span className={styles.hitCl}>{h.cluster_name}</span>
                  <span className={styles.hitT}>{h.spec_name}</span>
                  <span className={styles.hitR}>{h.reason}</span>
                </button>
              ))}
              {aiRes.hits.length > 0 && (
                <button className={styles.journeyBtn} onClick={buildJourney}>
                  🚀 בנה לי מסע מלא במרכז הידע →
                </button>
              )}
            </div>
          )}

          <div className={styles.divider}><span>או עיין בכל האשכולות</span></div>

          <div className={styles.heat}>
            {clusters.map(c => (
              <button
                key={c.cluster_id}
                className={styles.hcard}
                style={{ ['--accent' as string]: hue(c.hue), ['--accentBg' as string]: hbg(c.hue) }}
                onClick={() => openCluster(c.cluster_id)}
              >
                <span className={styles.hcardIcon}>{c.icon}</span>
                <span className={styles.hcardTitle}>{c.name.replace('אשכול ', '')}</span>
                <span className={styles.hcardCnt}>{c.specs.length} התמחויות</span>
                <span className={styles.hcardArrow}>←</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.detailView}>
          <div className={styles.backBar}>
            <button className={styles.backBtn} onClick={goHome}>← כל האשכולות</button>
            <div className={styles.miniSearch}>
              <span>🔍</span>
              <input
                value={specFilter}
                onChange={e => setSpecFilter(e.target.value)}
                placeholder="חיפוש בהתמחויות…"
              />
            </div>
          </div>

          {activeClusterObj && (
            <>
              <div className={styles.dvHead}>
                <div
                  className={styles.dvIcon}
                  style={{ background: hbg(activeClusterObj.hue), color: hue(activeClusterObj.hue) }}
                >
                  {activeClusterObj.icon}
                </div>
                <div>
                  <h2 className={styles.dvTitle}>{activeClusterObj.name}</h2>
                  <span className={styles.dvMeta}>{activeClusterObj.specs.length} התמחויות</span>
                  {activeClusterObj.note && <span className={styles.note}>⚠ {activeClusterObj.note}</span>}
                </div>
              </div>

              <div className={styles.layout}>
                <div className={styles.col}>
                  <div className={styles.colHead}>התמחויות · {filteredSpecs.length}</div>
                  <div className={styles.slist}>
                    {filteredSpecs.map(s => (
                      <button
                        key={s.id}
                        className={`${styles.sitem} ${s.id === activeSpecId ? styles.sitemActive : ''}`}
                        onClick={() => setActiveSpecId(s.id)}
                      >
                        <h4>{s.name}</h4>
                        <p>{s.description}</p>
                      </button>
                    ))}
                    {filteredSpecs.length === 0 && <div className={styles.slistEmpty}>אין התמחויות תואמות</div>}
                  </div>
                </div>

                <div className={`${styles.col} ${styles.detail}`}>
                  {activeSpec ? (
                    <>
                      <div className={styles.dHero}>
                        <div className={styles.crumb}>{activeClusterObj.icon} {activeClusterObj.name}</div>
                        <h2 className={styles.dHeroTitle}>{activeSpec.name}</h2>
                      </div>
                      <div className={styles.dBody}>
                        <p className={styles.desc}>{activeSpec.description}</p>

                        <button className={styles.supLink} onClick={() => viewSuppliers(activeSpec)}>
                          <span className={styles.supIcon}>🏆</span>
                          <span className={styles.supTx}>
                            <b>ספקים זוכים בהתמחות זו</b>
                            <span>צפה ברשימת הספקים שזכו בהתמחות במודול "ספקים זוכים"</span>
                          </span>
                          <span className={styles.supGo}>צפה בספקים ←</span>
                        </button>

                        <div className={styles.twoCol}>
                          {activeSpec.activities.length > 0 && (
                            <div className={`${styles.block} ${styles.blockActs}`}>
                              <h3>⚙️ פעילויות עיקריות</h3>
                              <ul>{activeSpec.activities.map((a, i) => <li key={i}>{a}</li>)}</ul>
                            </div>
                          )}
                          {activeSpec.outputs.length > 0 && (
                            <div className={`${styles.block} ${styles.blockOuts}`}>
                              <h3>📦 תוצרים</h3>
                              <ul>{activeSpec.outputs.map((o, i) => <li key={i}>{o}</li>)}</ul>
                            </div>
                          )}
                        </div>

                        {activeSpec.start_date && (
                          <div className={styles.metaRow}>מועד תחילת ההתמחות: {activeSpec.start_date}</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className={styles.detailEmpty}>בחר התמחות מהרשימה →</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
