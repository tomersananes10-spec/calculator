// פורטל ספקים — ספק רואה את ההצעות שלו, הסכמים, הזמנות, חשבוניות.
// כרגע: כל משתמש מאומת שיש לו tender_personas.persona_role='vendor' פעיל יכול לגשת.
// בעתיד: auth נפרד (Magic Link) דרך פורטל ייעודי.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type {
  Tender, TenderContract, TenderInvoice, TenderProposal, TenderPurchaseOrder,
} from '../modules/tenders/types'
import styles from './VendorPortalPage.module.css'

interface VendorViewData {
  tenders: Tender[]
  proposals: TenderProposal[]
  contracts: TenderContract[]
  pos: TenderPurchaseOrder[]
  invoices: TenderInvoice[]
}

const EMPTY: VendorViewData = { tenders: [], proposals: [], contracts: [], pos: [], invoices: [] }

function formatAmount(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}

function formatDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('he-IL')
}

export function VendorPortalPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<VendorViewData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('יש להתחבר כדי לגשת לפורטל')
        setLoading(false)
        return
      }

      // 1. שלוף proposals של המשתמש (לפי vendor_id דרך tender_personas)
      const { data: personas } = await supabase
        .from('tender_personas')
        .select('tender_id')
        .eq('user_id', user.id)
        .eq('persona_role', 'vendor')
        .eq('active', true)

      const tenderIds = (personas ?? []).map(p => p.tender_id as string)
      if (tenderIds.length === 0) {
        setLoading(false)
        return  // ספק ללא הליכים — empty state
      }

      const [tendersRes, proposalsRes, contractsRes, posRes] = await Promise.all([
        supabase.from('tenders').select('*').in('id', tenderIds),
        supabase.from('tender_proposals').select('*').in('tender_id', tenderIds),
        supabase.from('tender_contracts').select('*').in('tender_id', tenderIds),
        supabase.from('tender_purchase_orders').select('*').in('tender_id', tenderIds),
      ])

      // invoices לפי milestones
      const { data: milestonesRes } = await supabase
        .from('tender_milestones')
        .select('id')
        .in('tender_id', tenderIds)
      const milestoneIds = (milestonesRes ?? []).map(m => m.id as string)

      const invoicesRes = milestoneIds.length === 0
        ? { data: [], error: null }
        : await supabase.from('tender_invoices').select('*').in('milestone_id', milestoneIds)

      const firstErr = [tendersRes, proposalsRes, contractsRes, posRes, invoicesRes].find(r => r.error)?.error
      if (firstErr) {
        setError(firstErr.message)
        setLoading(false)
        return
      }

      setData({
        tenders: (tendersRes.data ?? []) as Tender[],
        proposals: (proposalsRes.data ?? []) as TenderProposal[],
        contracts: (contractsRes.data ?? []) as TenderContract[],
        pos: (posRes.data ?? []) as TenderPurchaseOrder[],
        invoices: (invoicesRes.data ?? []) as TenderInvoice[],
      })
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <div className={styles.page}><div className={styles.loading}>טוען פורטל ספקים…</div></div>

  if (error) return (
    <div className={styles.page}>
      <div className={styles.warning}>{error}</div>
    </div>
  )

  const tenderMap = new Map(data.tenders.map(t => [t.id, t.title]))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🏢 פורטל ספקים</h1>
        <p className={styles.sub}>הצעות, הסכמים, הזמנות וחשבוניות שלך</p>
      </div>

      <div className={styles.warning}>
        🚧 פורטל ספקים בגרסת בטא. בעתיד יהיה auth נפרד דרך מספר תאגיד.
        כרגע — נדרשת הוספה ידנית של ה-user_id שלך כ-tender_personas.persona_role='vendor' בהליך הרלוונטי.
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.tenders.length}</div>
          <div className={styles.statLabel}>הליכים פעילים</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.proposals.length}</div>
          <div className={styles.statLabel}>הצעות שהוגשו</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.invoices.length}</div>
          <div className={styles.statLabel}>חשבוניות</div>
        </div>
      </div>

      {data.tenders.length === 0 ? (
        <div className={styles.empty}>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}>אין הליכים פעילים</p>
          <p>כשתשובץ להליך כספק, הוא יופיע כאן</p>
          <button
            onClick={() => navigate('/')}
            style={{ marginTop: 16, padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            חזרה לבית
          </button>
        </div>
      ) : (
        <>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>הצעות ({data.proposals.length})</div>
            {data.proposals.length === 0 ? (
              <div className={styles.empty}>אין הצעות עדיין</div>
            ) : (
              <div className={styles.list}>
                {data.proposals.map(p => (
                  <div key={p.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{tenderMap.get(p.tender_id) ?? p.tender_id.slice(0, 8)}</div>
                      <div className={styles.itemMeta}>
                        <span>{formatAmount(p.price)}</span>
                        {p.quality_score != null && <span>איכות: {p.quality_score}</span>}
                        <span>הוגש: {formatDate(p.submitted_at)}</span>
                      </div>
                    </div>
                    <span className={`${styles.pill} ${p.status === 'winner' ? styles.p_green : p.status === 'submitted' ? styles.p_blue : styles.p_gray}`}>
                      {p.status === 'winner' ? '🏆 זוכה' : p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.contracts.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>הסכמים ({data.contracts.length})</div>
              <div className={styles.list}>
                {data.contracts.map(c => (
                  <div key={c.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{c.contract_number ?? tenderMap.get(c.tender_id) ?? c.id.slice(0, 8)}</div>
                      <div className={styles.itemMeta}>
                        <span>{formatAmount(c.total_amount)}</span>
                        <span>בתוקף: {formatDate(c.effective_date)} – {formatDate(c.expiry_date)}</span>
                      </div>
                    </div>
                    <span className={`${styles.pill} ${c.signature_status === 'fully_signed' ? styles.p_green : styles.p_amber}`}>
                      {c.signature_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.pos.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>הזמנות רכש ({data.pos.length})</div>
              <div className={styles.list}>
                {data.pos.map(po => (
                  <div key={po.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>PO {po.po_number ?? po.id.slice(0, 8)}</div>
                      <div className={styles.itemMeta}>
                        <span>{formatAmount(po.total_amount)}</span>
                        <span>נשלח: {formatDate(po.sent_to_vendor_at)}</span>
                      </div>
                    </div>
                    <span className={`${styles.pill} ${po.status === 'sent_to_vendor' ? styles.p_blue : po.status === 'acknowledged' ? styles.p_green : styles.p_gray}`}>
                      {po.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.invoices.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>חשבוניות ({data.invoices.length})</div>
              <div className={styles.list}>
                {data.invoices.map(inv => (
                  <div key={inv.id} className={styles.item}>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{inv.invoice_number ?? inv.id.slice(0, 8)}</div>
                      <div className={styles.itemMeta}>
                        <span>{formatAmount(inv.amount)}</span>
                        {inv.paid_at && <span>שולמה: {formatDate(inv.paid_at)}</span>}
                      </div>
                    </div>
                    <span className={`${styles.pill} ${inv.status === 'paid' ? styles.p_green : inv.status === 'approved' ? styles.p_blue : inv.status === 'rejected' ? styles.p_red : styles.p_amber}`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
