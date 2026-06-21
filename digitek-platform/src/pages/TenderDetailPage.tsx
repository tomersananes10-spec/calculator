import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTender } from '../modules/tenders/hooks/useTender'
import { getStage } from '../modules/tenders/data/stagesBaseline'
import { evaluateStageRequirements, type ActionId } from '../modules/tenders/data/stageRequirements'
import type { TenderApprovalRequest, ApprovalRequestType } from '../modules/tenders/types'
import { StageMap } from '../modules/tenders/components/StageMap'
import { StageRequirementsTab } from '../modules/tenders/components/StageRequirementsTab'
import { GateValidationModal } from '../modules/tenders/components/GateValidationModal'
import { ApprovalRequestModal } from '../modules/tenders/components/modals/ApprovalRequestModal'
import { ApprovalDecisionModal } from '../modules/tenders/components/modals/ApprovalDecisionModal'
import { CommitteeProtocolModal } from '../modules/tenders/components/modals/CommitteeProtocolModal'
import { ContractDraftModal, GuaranteeModal, InsuranceModal, SignatoryModal } from '../modules/tenders/components/modals/StageActionsS8'
import { PurchaseOrderModal, MilestoneModal } from '../modules/tenders/components/modals/StageActionsS9_S12'
import { CommitteeScheduleModal } from '../modules/tenders/components/modals/CommitteeScheduleModal'
import { MinhalRechesAdvanceModal } from '../modules/tenders/components/modals/MinhalRechesAdvanceModal'
import { UploadDocumentModal } from '../modules/tenders/components/modals/UploadDocumentModal'
import { SignatureRequestModal } from '../modules/tenders/components/modals/SignatureRequestModal'
import { SignersEditModal } from '../modules/tenders/components/modals/SignersEditModal'
import { DocumentArchive } from '../modules/tenders/components/DocumentArchive'
import { SignersSidebar } from '../modules/tenders/components/SignersSidebar'
import archiveStyles from '../modules/tenders/components/DocumentArchive.module.css'
import styles from './TenderDetailPage.module.css'

interface CommitteeMeetingRow {
  id: string
  committee_id: string
  scheduled_at: string
  duration_minutes: number
  agenda: unknown
  status: string
  attendees: unknown
}

type Tab = 'requirements' | 'overview' | 'documents' | 'committees' | 'milestones' | 'audit'

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
  const [resubmitRequest, setResubmitRequest] = useState<TenderApprovalRequest | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [signersEditOpen, setSignersEditOpen] = useState(false)
  const detail = useTender(id)
  const { tender, budget, documents, contracts, milestones, protocols, personas, auditLog, approvalRequests, signers, loading, error, refresh } = detail
  const [decisionModalOpen, setDecisionModalOpen] = useState(false)
  const pendingApprovals = approvalRequests.filter(a => a.status === 'pending' || a.status === 'in_review')

  const requirements = useMemo(() => evaluateStageRequirements(detail), [detail])

  // שליפת שם בעל ההליך (כותב הבריף) לתצוגה בכותרת
  const [ownerName, setOwnerName] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    async function loadOwner() {
      if (!tender?.owner_id) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', tender.owner_id)
        .maybeSingle()
      if (!cancelled) setOwnerName(data?.full_name ?? null)
    }
    void loadOwner()
    return () => { cancelled = true }
  }, [tender?.owner_id])

  // Committee meetings — נטענים בנפרד (useTender לא טוען אותם כי הם רב-tender)
  const [committeeMeetings, setCommitteeMeetings] = useState<CommitteeMeetingRow[]>([])
  const [committeeModalOpen, setCommitteeModalOpen] = useState(false)
  const loadMeetings = async () => {
    if (!tender?.id) return
    const { data } = await supabase
      .from('tender_committee_meetings')
      .select('id, committee_id, scheduled_at, duration_minutes, agenda, status, attendees')
      .contains('tender_refs', [tender.id])
      .order('scheduled_at', { ascending: false })
    setCommitteeMeetings((data as CommitteeMeetingRow[] | null) ?? [])
  }
  useEffect(() => { void loadMeetings() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tender?.id])

  function handleAction(action: ActionId) {
    // תזמון ועדה משתמש ב-modal הגנרי הקיים, לא ב-activeAction.
    if (action === 'schedule_committee_outbound' || action === 'schedule_committee_winner') {
      setCommitteeModalOpen(true)
      return
    }
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
            {ownerName && <span><strong>כותב/ת:</strong> {ownerName}</span>}
            <span>נפתח: {formatDate(tender.created_at)}</span>
            <span>{formatAmount(tender.estimated_amount)}</span>
            {tender.tender_number_external && <span><strong>מס׳ במערכת:</strong> {tender.tender_number_external}</span>}
          </div>
          {requirements.metadataBlockers.length > 0 && (
            <div className={styles.metaWarning}>
              <span className={styles.metaWarningIcon}>⚠️</span>
              <span className={styles.metaWarningText}>
                יש להשלים: {requirements.metadataBlockers.map(b => b.label).join(' · ')}
              </span>
              <button
                type="button"
                className={styles.metaWarningBtn}
                onClick={() => handleAction(requirements.metadataBlockers[0].action)}
              >
                השלם
              </button>
            </div>
          )}
        </div>
        <div className={styles.actionRow}>
          <button
            className={archiveStyles.triggerBtn}
            onClick={() => setArchiveOpen(true)}
            title="כל המסמכים של ההליך, מקובצים לפי סוג עם היסטוריית גרסאות"
          >
            📚 תיקיית מסמכים
            <span className={archiveStyles.triggerCount}>{documents.length}</span>
          </button>
          {pendingApprovals.length > 0 && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setDecisionModalOpen(true)}
            >
              📋 {pendingApprovals.length} ממתינות לאישור
            </button>
          )}
          <button className={styles.btn} onClick={() => navigate('/tenders')}>← לרשימה</button>
        </div>
      </div>

      <div className={styles.layoutGrid}>
        <div className={styles.main}>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>שלב נוכחי</div>
              <div className={styles.kpiValue}>
                {currentStageDef ? `${currentStageDef.stageNumber}. ${currentStageDef.shortLabel}` : '—'}
                {currentStageDef?.pingpong && <span className={styles.kpiSub}> · תומך גרסאות</span>}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>נדרש כעת</div>
              <div className={styles.kpiValue}>
                {requirements.pending[0]?.label ?? (requirements.canAdvance ? 'מוכן למעבר לשלב הבא' : '—')}
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>דרישות פתוחות</div>
              <div className={styles.kpiValue}>
                {requirements.pending.length} מתוך {requirements.total}
              </div>
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
            <button className={`${styles.tab} ${tab === 'milestones' ? styles.active : ''}`} onClick={() => setTab('milestones')}>
              <span className={styles.tabCount}>{milestones.length}</span> אבני דרך
            </button>
            <button className={`${styles.tab} ${tab === 'audit' ? styles.active : ''}`} onClick={() => setTab('audit')}>
              <span className={styles.tabCount}>{auditLog.length}</span> תיעוד
            </button>
          </div>

          <div className={styles.tabPanel}>
            {tab === 'requirements' && (
              <StageRequirementsTab detail={detail} onAction={handleAction} onRefresh={refresh} onResubmit={setResubmitRequest} />
            )}

            {tab === 'overview' && (
              <>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>פרטי הליך</div>
                  <div className={styles.fact}><span className={styles.factLabel}>מספר תיחור פנימי</span><span className={styles.factValue}>{tender.tender_number ?? '—'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>מספר תיחור חיצוני</span><span className={styles.factValue}>{tender.tender_number_external ?? '—'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>אשכול שירות</span><span className={styles.factValue}>{tender.service_cluster ?? '—'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>דורש עורך מכרז</span><span className={styles.factValue}>{tender.requires_tender_editor ? 'כן' : 'לא'}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>אישור מינהל הרכש נדרש</span><span className={styles.factValue}>{tender.requires_olma ? 'כן' : 'לא'}</span></div>
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
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className={styles.sectionTitle}>ועדות ופרוטוקולים</div>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => setCommitteeModalOpen(true)}
                  >
                    📅 קבע דיון ועדה
                  </button>
                </div>

                {committeeMeetings.length === 0 && protocols.length === 0 && (
                  <div className={styles.emptyTab}>אין דיונים מתוזמנים או פרוטוקולים. לחץ "קבע דיון ועדה" להתחיל.</div>
                )}

                {committeeMeetings.length > 0 && (
                  <>
                    <div className={styles.sectionTitle} style={{ marginTop: 8, marginBottom: 8 }}>דיונים מתוזמנים</div>
                    <div className={styles.list}>
                      {committeeMeetings.map(m => {
                        const agendaArr = Array.isArray(m.agenda) ? m.agenda : []
                        const agendaText = agendaArr[0] && typeof agendaArr[0] === 'object' && agendaArr[0] !== null
                          ? (agendaArr[0] as { agenda_text?: string }).agenda_text ?? ''
                          : ''
                        return (
                          <div key={m.id} className={styles.listItem}>
                            <div className={styles.listItemBody}>
                              <div className={styles.listItemTitle}>
                                {formatDateTime(m.scheduled_at)} ({m.duration_minutes} דק')
                              </div>
                              <div className={styles.listItemMeta}>{agendaText || 'אין אגנדה'}</div>
                            </div>
                            <span className={`${styles.statusPill} ${m.status === 'scheduled' ? styles.amber : m.status === 'completed' ? styles.green : styles.red}`}>
                              {m.status === 'scheduled' ? 'מתוזמן' : m.status === 'completed' ? 'הסתיים' : m.status}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {protocols.length > 0 && (
                  <>
                    <div className={styles.sectionTitle} style={{ marginTop: 18, marginBottom: 8 }}>פרוטוקולים חתומים</div>
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
                  </>
                )}
              </>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <StageMap tender={tender} />
          <SignersSidebar
            tender={tender}
            signers={signers}
            onEdit={() => setSignersEditOpen(true)}
          />
        </div>
      </div>

      {/* Action modals — 9-stage flow */}

      {/* T0 — uploads */}
      <UploadDocumentModal
        open={activeAction === 'upload_brief'}
        onClose={closeAction}
        tenderId={tender.id}
        docType="brief"
        title="העלאת בריף"
        onSubmitted={onActionDone}
      />
      <UploadDocumentModal
        open={activeAction === 'upload_initial_protocol'}
        onClose={closeAction}
        tenderId={tender.id}
        docType="protocol_initial"
        title="העלאת פרוטוקול ראשוני"
        onSubmitted={onActionDone}
      />

      {/* T1 — אישור תקציבי (פינגפונג) */}
      <ApprovalRequestModal
        open={activeAction === 'create_budget_approval'}
        onClose={closeAction}
        tenderId={tender.id}
        requestType="budget_approval"
        estimatedAmount={tender.estimated_amount}
        signers={signers}
        onSubmitted={onActionDone}
      />

      {/* T2 + T6 — ועדה (תזמון + פרוטוקול) */}
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

      {/* T3 + T7 — חתימות */}
      <SignatureRequestModal
        open={activeAction === 'request_signature_legal'}
        onClose={closeAction}
        tenderId={tender.id}
        signerRole="legal_professional"
        signers={signers}
        onSubmitted={onActionDone}
      />
      <SignatureRequestModal
        open={activeAction === 'request_signature_treasurer'}
        onClose={closeAction}
        tenderId={tender.id}
        signerRole="treasurer"
        signers={signers}
        onSubmitted={onActionDone}
      />
      <SignatureRequestModal
        open={activeAction === 'request_signature_vp'}
        onClose={closeAction}
        tenderId={tender.id}
        signerRole="signatory"
        signers={signers}
        onSubmitted={onActionDone}
      />

      {/* T4 — מעבר ידני אחרי מינהל הרכש */}
      <MinhalRechesAdvanceModal
        open={activeAction === 'minhal_rechesh_winner_received'}
        onClose={closeAction}
        tenderId={tender.id}
        onSubmitted={onActionDone}
      />

      {/* T5 — פרוטוקול זכייה */}
      <UploadDocumentModal
        open={activeAction === 'upload_winner_protocol'}
        onClose={closeAction}
        tenderId={tender.id}
        docType="winner_protocol"
        title="העלאת פרוטוקול זכייה"
        onSubmitted={onActionDone}
      />

      {/* T8 — התקשרות */}
      <ContractDraftModal
        open={activeAction === 'draft_contract'}
        onClose={closeAction}
        tenderId={tender.id}
        estimatedAmount={tender.estimated_amount}
        proposals={[]}
        vendors={[]}
        onSubmitted={onActionDone}
      />
      <GuaranteeModal
        open={activeAction === 'verify_guarantee'}
        onClose={closeAction}
        contracts={contracts}
        onSubmitted={onActionDone}
      />
      <InsuranceModal
        open={activeAction === 'verify_insurance'}
        onClose={closeAction}
        contracts={contracts}
        onSubmitted={onActionDone}
      />
      <SignatoryModal
        open={activeAction === 'sign_contract_internal'}
        onClose={closeAction}
        contracts={contracts}
        onSubmitted={onActionDone}
      />
      <PurchaseOrderModal
        open={activeAction === 'create_purchase_order'}
        onClose={closeAction}
        tenderId={tender.id}
        contracts={contracts}
        onSubmitted={onActionDone}
      />
      <MilestoneModal
        open={activeAction === 'create_milestone'}
        onClose={closeAction}
        tenderId={tender.id}
        milestones={milestones}
        onSubmitted={onActionDone}
      />

      {/* Generic */}
      <GateValidationModal
        open={activeAction === 'advance_stage'}
        onClose={closeAction}
        tender={tender}
        requirements={requirements}
        onAdvanced={onActionDone}
      />
      <ApprovalDecisionModal
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        approvals={approvalRequests}
        onSubmitted={() => { setDecisionModalOpen(false); void refresh() }}
      />

      <CommitteeScheduleModal
        open={committeeModalOpen}
        onClose={() => setCommitteeModalOpen(false)}
        detail={detail}
        onScheduled={async () => { await loadMeetings(); await refresh() }}
      />

      {/* Resubmit modal — נפתח כשבעל ההליך לוחץ "שלח שוב לאחר תיקון" על בקשה שהוחזרה.
          טוען את הנתונים מהבקשה הקודמת ושומר parent_request_id ב-metadata. */}
      <ApprovalRequestModal
        open={!!resubmitRequest}
        onClose={() => setResubmitRequest(null)}
        tenderId={tender.id}
        requestType={(resubmitRequest?.request_type ?? 'budget_approval') as ApprovalRequestType}
        estimatedAmount={tender.estimated_amount}
        resubmitOf={resubmitRequest ?? undefined}
        signers={signers}
        previousDocs={resubmitRequest
          ? (() => {
              // רק הגרסה האחרונה מוצגת — אם המאשר העלה v2, נשלח אותה.
              // היסטוריה מלאה זמינה ב-DocumentArchive.
              const docs = documents
                .filter(d => (d.metadata as Record<string, unknown> | undefined)?.approval_request_id === resubmitRequest.id)
                .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
              const latest = docs[0]
              if (!latest) return undefined
              const meta = (latest.metadata as Record<string, unknown> | undefined) ?? {}
              return [{
                id: latest.id,
                title: latest.title,
                file_ref: latest.file_ref,
                file_size_bytes: latest.file_size_bytes,
                source: typeof meta.source === 'string' ? meta.source : undefined,
                uploaded_by_email: typeof meta.uploaded_by_email === 'string' ? meta.uploaded_by_email : undefined,
              }]
            })()
          : undefined
        }
        onSubmitted={async () => { setResubmitRequest(null); await onActionDone() }}
      />

      {/* Document Archive — כל מסמכי ההליך מקובצים לפי סוג עם היסטוריית גרסאות */}
      <DocumentArchive
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        documents={documents}
        tenderTitle={tender.title}
      />

      <SignersEditModal
        open={signersEditOpen}
        onClose={() => setSignersEditOpen(false)}
        tenderId={tender.id}
        signers={signers}
        onSubmitted={refresh}
      />
    </div>
  )
}
