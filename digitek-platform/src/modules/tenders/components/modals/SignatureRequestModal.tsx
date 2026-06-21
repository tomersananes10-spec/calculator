import { ApprovalRequestModal } from './ApprovalRequestModal'
import type { PersonaRole, TenderSigner } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  tenderId: string
  tenderTitle?: string
  /** התפקיד המבוקש לחתימה */
  signerRole: PersonaRole
  signers?: TenderSigner[]
  onSubmitted: () => void
}

const ROLE_LABELS: Partial<Record<PersonaRole, string>> = {
  legal_professional: 'משפטן',
  treasurer: 'חשב',
  signatory: 'סמנכ"ל',
}

/**
 * מודאל בקשת חתימה — wrapper דק מעל ApprovalRequestModal עם:
 * - requestType='contract_signature' קבוע
 * - requestedRole = התפקיד שמועבר ב-prop (כדי שמערכת הדרישות תזהה מי חתם)
 * - customTitle מותאם לתפקיד (חתימת משפטן/חשב/סמנכ"ל)
 *
 * משתמש בכל מנגנון הפינגפונג הקיים: גרסאות, החזרה לתיקונים, החלטה inline.
 */
export function SignatureRequestModal({ open, onClose, tenderId, tenderTitle, signerRole, signers, onSubmitted }: Props) {
  const roleLabel = ROLE_LABELS[signerRole] ?? signerRole

  return (
    <ApprovalRequestModal
      open={open}
      onClose={onClose}
      tenderId={tenderId}
      tenderTitle={tenderTitle}
      requestType="contract_signature"
      requestedRole={signerRole}
      customTitle={`בקשת חתימה — ${roleLabel}`}
      signers={signers}
      onSubmitted={onSubmitted}
    />
  )
}
