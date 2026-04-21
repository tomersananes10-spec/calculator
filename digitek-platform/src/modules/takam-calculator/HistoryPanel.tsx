import { useState } from 'react'
import type { SavedCalculation } from './useCalculationHistory'
import { fmtCurrency } from './calc'
import s from './TakamCalculator.module.css'

interface Props {
  open: boolean
  onClose: () => void
  calculations: SavedCalculation[]
  loading: boolean
  onLoad: (calc: SavedCalculation) => void
  onDelete: (id: string) => void
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }
const STEP_LABELS: Record<number, string> = { 1: 'הגדרת פרויקט', 2: 'בחירת תפקידים', 3: 'רמות ומשרות', 4: 'תוצאות' }

export function HistoryPanel({ open, onClose, calculations, loading, onLoad, onDelete }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (!open) return null

  const drafts = calculations.filter(c => c.is_draft)
  const saved = calculations.filter(c => !c.is_draft)

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  function renderCard(calc: SavedCalculation) {
    const isDraft = calc.is_draft
    return (
      <div key={calc.id} className={`${s.historyCard} ${isDraft ? s.historyCardDraft : ''}`}>
        <div className={s.historyCardTop}>
          <div className={s.historyCardInfo}>
            <span className={s.historyCardName}>
              {isDraft && <span className={s.draftBadge}>טיוטה</span>}
              {calc.name || 'ללא שם'}
            </span>
            <span className={s.historyCardMinistry}>{calc.ministry}</span>
          </div>
          {calc.grand_total > 0 && (
            <span className={s.historyCardTotal}>{fmtCurrency(calc.grand_total, true)}</span>
          )}
        </div>
        <div className={s.historyCardMeta}>
          <span>{PERIOD_LABELS[calc.period] ?? calc.period + ' חודשים'}</span>
          {calc.mix.length > 0 && <span>{calc.mix.length} תפקידים</span>}
          {isDraft && <span>שלב: {STEP_LABELS[calc.current_step] ?? calc.current_step}</span>}
          <span>{formatDate(calc.updated_at)}</span>
        </div>
        <div className={s.historyCardActions}>
          <button className={s.historyLoadBtn} onClick={() => onLoad(calc)}>
            {isDraft ? 'המשך' : 'טען'}
          </button>
          <button
            className={s.historyDeleteBtn}
            onClick={() => handleDelete(calc.id)}
          >
            {confirmDeleteId === calc.id ? 'בטוח?' : 'מחק'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={s.historyOverlay} onClick={onClose} />
      <div className={s.historyPanel}>
        <div className={s.historyHeader}>
          <h3 className={s.historyTitle}>החישובים שלי</h3>
          <button className={s.historyClose} onClick={onClose}>✕</button>
        </div>

        {loading && <p className={s.historyEmpty}>טוען...</p>}

        {!loading && calculations.length === 0 && (
          <p className={s.historyEmpty}>אין חישובים שמורים עדיין</p>
        )}

        <div className={s.historyList}>
          {drafts.length > 0 && (
            <>
              <div className={s.historySectionTitle}>טיוטות</div>
              {drafts.map(renderCard)}
            </>
          )}
          {saved.length > 0 && (
            <>
              {drafts.length > 0 && <div className={s.historySectionTitle}>חישובים שמורים</div>}
              {saved.map(renderCard)}
            </>
          )}
        </div>
      </div>
    </>
  )
}
