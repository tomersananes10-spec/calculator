import type { SavedAimlCalculation } from './types'
import { fmtCurrency } from './calc'
import s from '../takam-calculator/TakamCalculator.module.css'

interface Props {
  open: boolean
  onClose: () => void
  calculations: SavedAimlCalculation[]
  onLoad: (calc: SavedAimlCalculation) => void
  onDelete: (id: string) => void
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'הרגע'
  const min = Math.floor(sec / 60)
  if (min < 60) return `לפני ${min} דק׳`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `לפני ${hr} שעות`
  const days = Math.floor(hr / 24)
  if (days < 30) return `לפני ${days} ימים`
  return new Date(ts).toLocaleDateString('he-IL')
}

export function AimlHistoryPanel({ open, onClose, calculations, onLoad, onDelete }: Props) {
  if (!open) return null

  return (
    <>
      <div className={s.historyOverlay} onClick={onClose} />
      <aside className={s.historyPanel}>
        <header className={s.historyHeader}>
          <h2 className={s.historyTitle}>החישובים שלי — AI/ML</h2>
          <button className={s.historyClose} onClick={onClose} aria-label="סגור">✕</button>
        </header>
        <div className={s.historyList}>
          {calculations.length === 0 ? (
            <div className={s.historyEmpty}>
              <p>אין עדיין חישובים שמורים.</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>לחץ "💾 שמור" בראש הויזרד כדי לשמור חישוב.</p>
            </div>
          ) : (
            calculations.map(calc => (
              <div key={calc.id} className={s.historyCard}>
                <div className={s.historyCardTop}>
                  <div className={s.historyCardInfo}>
                    <span className={s.historyCardName}>{calc.name || 'ללא שם'}</span>
                    <span className={s.historyCardMinistry}>{calc.ministry || '—'}</span>
                  </div>
                  <span className={s.historyCardTotal}>{fmtCurrency(calc.grandTotal)}</span>
                </div>
                <div className={s.historyCardMeta}>
                  <span>תקופה: {calc.period} ח׳</span>
                  <span>{timeAgo(calc.updatedAt)}</span>
                </div>
                <div className={s.historyCardActions}>
                  <button className={s.historyLoadBtn} onClick={() => onLoad(calc)}>טען</button>
                  <button
                    className={s.historyDeleteBtn}
                    onClick={() => {
                      if (confirm('למחוק את החישוב?')) onDelete(calc.id)
                    }}
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
