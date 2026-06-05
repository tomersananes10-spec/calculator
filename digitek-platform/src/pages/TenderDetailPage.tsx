import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTender } from '../modules/tenders/hooks/useTender'
import { getStage } from '../modules/tenders/data/stagesBaseline'
import { evaluateStageRequirements, type ActionId } from '../modules/tenders/data/stageRequirements'
import { WorkflowBar } from '../modules/tenders/components/WorkflowBar'
import { StageMap } from '../modules/tenders/components/StageMap'
import { StageRequirementsTab } from '../modules/tenders/components/StageRequirementsTab'
import { GateValidationModal } from '../modules/tenders/components/GateValidationModal'
import { ApprovalRequestModal } from '../modules/tenders/components/modals/ApprovalRequestModal'
import { TenderNumberModal } from '../modules/tenders/components/modals/TenderNumberModal'
import { CommitteeProtocolModal } from '../modules/tenders/components/modals/CommitteeProtocolModal'
import type { AmountBand } from '../modules/tenders/types'
import styles from './TenderDetailPage.module.css'

const BAND_LABELS: Record<AmountBand, string> = {
  lt_200k: 'עד 200K',
  '200k_1m': '200K-1M',
  '1m_5m': '1M-5M',
  gt_5m: 'מעל 5M',
}

type Tab = 'requirements' | 'overview' | 'documents' | 'committees' | 'vendors' | 'milestones' | 'audit'

function formatAmount(n: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(s: string): string {
  const d = new Date(s)
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function TenderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('requirements')
  const [activeAction, setActiveAction] = useState<ActionId | null>(null)
  const detail = useTender(id)
  const { tender, budget, documents, proposals, contracts, milestones, protocols, personas, auditLog, loading, error, refresh } = detail

  const requirements = useMemo(() => evaluateStageRequirements(detail), [detail])

  function handleAction(action: ActionId) {
    setActiveAction(action)
  }
  function closeAction() { setActiveAction(null) }
  async function onActionDone() {
    closeAction()
    await refresh()
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>טוען תיק הליך…</div></div>
  if (error) return <div className={styles.page}><div className={styles.errorBox}>שגיאה: {error}</div></div>
  if (!tender) return (
    <div className={styles.page}>
      <div className={styles.errorBox}>הליך לא נמצא או שאין לך הרשאה לצפות בו</div>
      <button className={styles.btn} onClick={() => navigate('/tenders')}>← חזרה לרשימה</button>
    </div>
  )

  const currentStageDef = getStage(tender.current_stage)

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{tender.title}</h1>
          <div className={styles.subTitle}>
            <span className={styles.tenderId}>{tender.tender_number ?? tender.id.slice(0, 8)}</span>
            <span>· {tender.ministry}</span>
            <span>· {BAND_LABELS[tender.amount_band]}</span>
            <span>· {tender.selection_type === 'price_only' ? 'מחיר בלבד' : 'איכות + מחיר'}</span>
          </div>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btn} onClick={() => navigate('/tenders')}>← לרשימה</button>
        </div>
      </div>

      <WorkflowBar
        tender={tender}
        requirements={requirements}
        onAdvance={() => handleAction('advance_stage')}
      />

      <div className={styles.layoutGrid}>
        <div className={styles.main}>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>שלב נוכחי</div>
              <div className={styles.kpiValue}>{currentStageDef ? `${currentStageDef.stageNumber}. ${currentStageDef.label.slice(0, 22)}` : tender.current_stage}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>סכום</div>
              <div className={styles.kpiValue}>{formatAmount(tender.estimated_amount)}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Go-Live</div>
              <div className={styles.kpiValue}>{formatDate(tender.planned_go_live_date)}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>נפתח</div>
              <div className={styles.kpiValue}>{formatDate(tender.created_at)}</div>
            </div>
          </div>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'requirements' ? styles.active : ''}`} onClick={() => setTab('requirements')}>
              {requirements.pending.length > 0 && <span className={styles.tabCount}>{requirements.pending.length}</span>}
              דרישות שלב
            </button>
            <button className={`${styles.tab} ${tab === 'overview' ? styles.active : ''}`} onClick={() => setTab('overview')}>סקירה</button>
            <button className={`${styles.tab} ${tab === 'documents' ? styles.active : ''}`} onClick={() => setTab('documents')}>
              <span className={styles.tabCount}>{documents.length}</span> מסמכים
            </button>
            <button className={`${styles.tab} ${tab === 'committees' ? styles.active : ''}`} onClick={() => setTab('committees')}>
              <span className={styles.tabCount}>{protocols.length}</span> ועדות
            </button>
            <button className={`${styles.tab} ${tab === 'vendors' ? styles.active : ''}`} onClick={() => setTab('vendors')}>
              <span className={styles.tabCount}>{proposals.length}</span> ספקים
            </button>
            <button className={`${styles.tab} ${tab === 'milestones' ? styles.active : ''}`} onClick={() => setTab('milestones')}>
              <span className={styles.tabCount}>{milestones.length}</span> אבני דרך
            </button>
            <button className={`${styles.tab} ${tab === 'audit' ? styles.active : ''}`} onClick={() => setTab('audit')}>
              <span className={styles.tabCount}>{auditLog.length}</span> תיעוד
            </button>
          </div>

          <div className={styles.tabPanel}>
            {tab === 'requirements' && (
              <StageRequirementsTab detail={detail} onAction={handleAction} />
            )}

            {tab === 'overview' && (
              <>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>פרטי הליך</div>
                  <div className={styles.fact}><span className={styles.factLabel}>מספר תיחור פנימי</span><span className={styles.factValue}>{tender.tender_number ?? '—'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>מספר תיחור חיצוני</span><span className={styles.factValue}>{tender.tender_number_external ?? '—'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>אשכול שירות</span><span className={styles.factValue}>{tender.service_cluster ?? '—'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>דורש עורך מכרז</span><span className={styles.factValue}>{tender.requires_tender_editor ? 'כן' : 'לא'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>אלמ"ה נדרש</span><span className={styles.factValue}>{tender.requires_olma ? 'כן' : 'לא'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>מסלול פשוט</span><span className={styles.factValue}>{tender.is_simple_path ? 'כן' : 'לא'}</span></div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionTitle}>תקציב</div>
                  {budget ? (
                    <>
                      <div className={styles.fact}><span className={styles.factLabel}>סכום</span><span className={styles.factValue}>{formatAmount(budget.amount)}</span></div>
                      <div className={styles.fact}><span className={styles.factLabel}>סטטוס</span><span className={styles.factValue}>{budget.status}</span></div>
                      <div className={styles.fact}><span className={styles.factLabel}>אושר ב-</span><span className={styles.factValue}>{formatDate(budget.approved_at)}</span></div>
                    </>
                  ) : <div className={styles.emptyTab}>אין רשומת תקציב עדיין</div>}
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionTitle}>צוות ההליך ({personas.length})</div>
                  {personas.length === 0 ? <div className={styles.emptyTab}>אין משתתפים נוספים</div> : (
                    <div className={styles.list}>
                      {personas.map(p => (
                        <div key={p.id} className={styles.listItem}>
                          <div className={styles.listItemBody}>
                            <div className={styles.listItemTitle}>{p.persona_role}</div>
                            <div className={styles.listItemMeta}>שובץ: {formatDate(p.assigned_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'documents' && (
              documents.length === 0 ? <div className={styles.emptyTab}>אין מסמכים בתיק</div> : (
                <div className={styles.list}>
                  {documents.map(d => (
                    <div key={d.id} className={styles.listItem}>
                      <div className={styles.listItemBody}>
                        <div className={styles.listItemTitle}>{d.title}</div>
                        <div className={styles.listItemMeta}>{d.doc_type} · גרסה {d.version} · {formatDate(d.created_at)}</div>
                      </div>
                      <span className={`${styles.statusPill} ${styles.gray}`}>{d.sensitivity}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'committees' && (
              protocols.length === 0 ? <div className={styles.emptyTab}>אין פרוטוקולי ועדות</div> : (
                <div className={styles.list}>
                  {protocols.map(p => (
                    <div key={p.id} className={styles.listItem}>
                      <div className={styles.listItemBody}>
                        <div className={styles.listItemTitle}>{p.protocol_type}</div>
                        <div className={styles.listItemMeta}>{p.signed_at ? `נחתם ${formatDate(p.signed_at)}` : 'לא חתום'} · {p.rationale ?? ''}</div>
                      </div>
                      <span className={`${styles.statusPill} ${p.decision === 'approved' ? styles.green : p.decision === 'rejected' ? styles.red : styles.amber}`}>
                        {p.decision}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'vendors' && (
              proposals.length === 0 ? <div className={styles.emptyTab}>אין הצעות עדיין</div> : (
                <div className={styles.list}>
                  {proposals.map(p => (
                    <div key={p.id} className={styles.listItem}>
                      <div className={styles.listItemBody}>
                        <div className={styles.listItemTitle}>ספק #{p.vendor_id.slice(0, 8)}</div>
                        <div className={styles.listItemMeta}>
                          {p.price ? formatAmount(p.price) : 'ללא מחיר'} · ניקוד {p.quality_score ?? '—'} · דירוג {p.rank ?? '—'}
                        </div>
                      </div>
                      <span className={`${styles.statusPill} ${p.status === 'winner' ? styles.green : styles.gray}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'milestones' && (
              <>
                {contracts.length > 0 && (
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>הסכמים ({contracts.length})</div>
                    <div className={styles.list}>
                      {contracts.map(c => (
                        <div key={c.id} className={styles.listItem}>
                          <div className={styles.listItemBody}>
                            <div className={styles.listItemTitle}>{c.contract_number ?? c.id.slice(0, 8)}</div>
                            <div className={styles.listItemMeta}>{formatAmount(c.total_amount)} · בתוקף עד {formatDate(c.expiry_date)}</div>
                          </div>
                          <span className={`${styles.statusPill} ${c.signature_status === 'fully_signed' ? styles.green : styles.amber}`}>
                            {c.signature_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className={styles.sectionTitle}>אבני דרך ({milestones.length})</div>
                {milestones.length === 0 ? <div className={styles.emptyTab}>טרם הוגדרו אבני דרך</div> : (
                  <div className={styles.list}>
                    {milestones.map(m => (
                      <div key={m.id} className={styles.listItem}>
                        <div className={styles.listItemBody}>
                          <div className={styles.listItemTitle}>{m.sequence_no}. {m.title}</div>
                          <div className={styles.listItemMeta}>
                            {m.planned_amount ? formatAmount(m.planned_amount) : '—'} · יעד {formatDate(m.planned_date)}
                          </div>
                        </div>
                        <span className={`${styles.statusPill} ${m.status === 'accepted' ? styles.green : m.status === 'rejected' ? styles.red : styles.amber}`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'audit' && (
              auditLog.length === 0 ? <div className={styles.emptyTab}>אין רישומי תיעוד</div> : (
                <div className={styles.list}>
                  {auditLog.map(a => (
                    <div key={a.id} className={styles.listItem}>
                      <div className={styles.listItemBody}>
                        <div className={styles.listItemTitle}>{a.action} · {a.entity_type}</div>
                        <div className={styles.listItemMeta}>{formatDateTime(a.occurred_at)} {a.notes ? `· ${a.notes}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        <StageMap tender={tender} />
      </div>

      {/* Action modals */}
      <ApprovalRequestModal
        open={activeAction === 'create_budget_approval'}
        onClose={closeAction}
        tenderId={tender.id}
        requestType="budget_approval"
        estimatedAmount={tender.estimated_amount}
        onSubmitted={onActionDone}
      />
      <ApprovalRequestModal
        open={activeAction === 'create_olma_approval'}
        onClose={closeAction}
        tenderId={tender.id}
        requestType="olma_approval"
        onSubmitted={onActionDone}
      />
      <ApprovalRequestModal
        open={activeAction === 'create_professional_review'}
        onClose={closeAction}
        tenderId={tender.id}
        requestType="professional_review"
        onSubmitted={onActionDone}
      />
      <TenderNumberModal
        open={activeAction === 'set_tender_number'}
        onClose={closeAction}
        tenderId={tender.id}
        variant={tender.current_stage === 'S4_system_input_review' ? 'external' : 'internal'}
        initialValue={tender.current_stage === 'S4_system_input_review' ? tender.tender_number_external : tender.tender_number}
        onSaved={onActionDone}
      />
      <CommitteeProtocolModal
        open={activeAction === 'create_committee_outbound_protocol'}
        onClose={closeAction}
        tenderId={tender.id}
        protocolType="outbound_request"
        onSubmitted={onActionDone}
      />
      <CommitteeProtocolModal
        open={activeAction === 'create_committee_winner_protocol'}
        onClose={closeAction}
        tenderId={tender.id}
        protocolType="winner_approval"
        onSubmitted={onActionDone}
      />
      <GateValidationModal
        open={activeAction === 'advance_stage'}
        onClose={closeAction}
        tender={tender}
        requirements={requirements}
        onAdvanced={onActionDone}
      />
    </div>
  )
}
