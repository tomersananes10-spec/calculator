import { useMemo } from 'react'
import {
  SIGNER_ROLES,
  SIGNER_ROLE_LABELS,
  SIGNER_ROLE_USED_IN,
  activeByRole,
  historyByRole,
} from '../lib/signers'
import { getStageIndex, getStage } from '../data/stagesBaseline'
import type { Tender, TenderSigner, TenderStage } from '../types'
import styles from './SignersSidebar.module.css'

interface Props {
  tender: Tender
  signers: TenderSigner[]
  onEdit: () => void
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0] ?? '').join('') || '?'
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days < 1) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** האם תפקיד נדרש לפני השלב הנוכחי? משמש לחישוב אזהרת "חסר". */
function isRoleNeededBefore(
  usedIn: string[],
  currentStage: TenderStage,
): { needed: boolean; nextStageLabel?: string } {
  const currentIdx = getStageIndex(currentStage)
  if (currentIdx < 0) return { needed: false }

  for (const code of usedIn) {
    const stageCode = SIGNER_ROLE_USED_IN_TO_STAGE_PREFIX[code]
    if (!stageCode) continue
    const stageIdx = getStageIndex(stageCode)
    if (stageIdx >= 0 && stageIdx >= currentIdx) {
      const stageDef = getStage(stageCode)
      return { needed: true, nextStageLabel: stageDef?.shortLabel ?? stageCode }
    }
  }
  return { needed: false }
}

// מיפוי 'T1' → 'T1_budget_approval' (קודי שלבים מלאים)
const SIGNER_ROLE_USED_IN_TO_STAGE_PREFIX: Record<string, TenderStage> = {
  T0: 'T0_brief_protocol',
  T1: 'T1_budget_approval',
  T2: 'T2_committee_outbound',
  T3: 'T3_signatures_outbound',
  T4: 'T4_minhal_rechesh',
  T5: 'T5_winner_protocol_upload',
  T6: 'T6_committee_winner',
  T7: 'T7_signatures_winner',
  T8: 'T8_engagement',
}

export function SignersSidebar({ tender, signers, onEdit }: Props) {
  const activeCount = useMemo(
    () => SIGNER_ROLES.filter(role => activeByRole(signers, role)).length,
    [signers],
  )

  const hasAnyHistory = signers.some(s => !s.active)

  return (
    <aside className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>👥 צוות חתימות ({activeCount})</div>
        <button type="button" className={styles.editBtn} onClick={onEdit}>
          ✎ ערוך
        </button>
      </div>

      <div className={styles.rows}>
        {SIGNER_ROLES.map(role => {
          const signer = activeByRole(signers, role)
          if (signer) {
            return (
              <div key={role} className={styles.row}>
                <div className={styles.avatar}>{initials(signer.display_name)}</div>
                <div className={styles.info}>
                  <div className={styles.name}>{signer.display_name}</div>
                  <div className={styles.roleLabel}>{SIGNER_ROLE_LABELS[role]}</div>
                  <div className={styles.email}>{signer.email}</div>
                </div>
              </div>
            )
          }
          // לא מוגדר
          const need = isRoleNeededBefore(SIGNER_ROLE_USED_IN[role], tender.current_stage)
          return (
            <div key={role} className={`${styles.row} ${styles.missing}`}>
              <div className={`${styles.avatar} ${styles.avatarMissing}`}>!</div>
              <div className={styles.info}>
                <div className={styles.nameMissing}>לא הוגדר</div>
                <div className={styles.roleLabel}>{SIGNER_ROLE_LABELS[role]}</div>
                {need.needed && (
                  <div className={styles.warning}>חסר — נדרש לפני שלב {need.nextStageLabel}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasAnyHistory && (
        <div className={styles.history}>
          <div className={styles.historyTitle}>↩ היסטוריה</div>
          {SIGNER_ROLES.flatMap(role => historyByRole(signers, role).map(s => ({ role, s })))
            .sort((a, b) => (b.s.replaced_at ?? '').localeCompare(a.s.replaced_at ?? ''))
            .map(({ role, s }) => (
              <div key={s.id} className={styles.historyRow}>
                <span className={styles.historyName}>{s.display_name}</span>
                <span className={styles.historyMeta}>
                  {SIGNER_ROLE_LABELS[role]} · הוחלפה {relativeDate(s.replaced_at!)}
                </span>
              </div>
            ))}
        </div>
      )}
    </aside>
  )
}
