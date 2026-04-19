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

export function HistoryPanel({ open, onClose, calculations, loading, onLoad, onDelete }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (!open) return null

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
          {calculations.map(calc => (
            <div key={calc.id} className={s.historyCard}>
              <div className={s.historyCardTop}>
                <div className={s.historyCardInfo}>
                  <span className={s.historyCardName}>{calc.name || 'ללא שם'}</span>
                  <span className={s.historyCardMinistry}>{calc.ministry}</span>
                </div>
                <span className={s.historyCardTotal}>{fmtCurrency(calc.grand_total, true)}</span>
              </div>
              <div className={s.historyCardMeta}>
                <span>{PERIOD_LABELS[calc.period] ?? calc.period + ' חודשים'}</span>
                <span>{calc.mix.length} תפקידים</span>
                <span>{formatDate(calc.updated_at)}</span>
              </div>
              <div className={s.historyCardActions}>
                <button className={s.historyLoadBtn} onClick={() => onLoad(calc)}>טען</button>
                <button
                  className={s.historyDeleteBtn}
                  onClick={() => handleDelete(calc.id)}
                >
                  {confirmDeleteId === calc.id ? 'בטוח?' : 'מחק'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
