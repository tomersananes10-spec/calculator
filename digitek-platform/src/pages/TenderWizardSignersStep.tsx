import {
  SIGNER_ROLES,
  SIGNER_ROLE_LABELS,
  SIGNER_ROLE_DESCRIPTIONS,
} from '../modules/tenders/lib/signers'
import { EmailAutocompleteInput } from '../modules/tenders/components/EmailAutocompleteInput'
import type { SignerRole } from '../modules/tenders/types'
import styles from './TenderWizardSignersStep.module.css'

export interface SignerDraft {
  name: string
  email: string
}

export type SignerDrafts = Record<SignerRole, SignerDraft>

export function emptySignerDrafts(): SignerDrafts {
  const out = {} as SignerDrafts
  for (const role of SIGNER_ROLES) out[role] = { name: '', email: '' }
  return out
}

interface Props {
  drafts: SignerDrafts
  onChange: (drafts: SignerDrafts) => void
}

export function TenderWizardSignersStep({ drafts, onChange }: Props) {
  function setDraft(role: SignerRole, partial: Partial<SignerDraft>) {
    onChange({ ...drafts, [role]: { ...drafts[role], ...partial } })
  }

  // הערה: אנו לא מסננים את ה-autocomplete לפי מיילים שכבר נבחרו בתפקידים
  // אחרים — אדם אחד יכול לתפוס מספר תפקידים, ולפעמים אותו אדם משמש
  // כתקציבן וגם משפטן (במיוחד בהליכים קטנים).

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>צוות חתימות</h2>
      <p className={styles.panelSub}>
        מי החותמים בהליך זה? <strong>אופציונלי</strong> — אפשר להמשיך בלי למלא כלום ולהוסיף בתיק ההליך מאוחר יותר.
      </p>

      {SIGNER_ROLES.map(role => {
        const draft = drafts[role]
        return (
          <div key={role} className={styles.roleCard}>
            <div className={styles.roleInfo}>
              <div className={styles.roleName}>{SIGNER_ROLE_LABELS[role]}</div>
              <div className={styles.roleDesc}>{SIGNER_ROLE_DESCRIPTIONS[role]}</div>
            </div>
            <div className={styles.roleInputs}>
              <input
                className={styles.input}
                placeholder="שם מלא"
                value={draft.name}
                onChange={e => setDraft(role, { name: e.target.value })}
              />
              <EmailAutocompleteInput
                className={styles.input}
                value={draft.email}
                onChange={(email) => setDraft(role, { email })}
              />
            </div>
          </div>
        )
      })}

      <div className={styles.hint}>
        💡 ניתן להוסיף, להחליף ולערוך את הצוות בכל שלב מתוך תיק ההליך.
      </div>
    </div>
  )
}
