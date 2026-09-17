import s from './Roved5.module.css'
import type { Roved5Service } from './types'
import { formatDiscount } from './roved5Export'

interface Props {
  services: Roved5Service[]
  onClose: () => void
  onRemove: (id: string) => void
}

const ROWS: { label: string; get: (s: Roved5Service) => string }[] = [
  { label: 'מק״ט', get: s => s.id },
  { label: 'יצרן', get: s => s.manufacturer || '—' },
  { label: 'ספק', get: s => s.provider || '—' },
  { label: 'ענן', get: s => s.cloud },
  { label: 'סוג', get: s => s.type },
  { label: 'הנחה', get: s => formatDiscount(s.discount) },
  { label: 'מועד אישור', get: s => s.approvalDate || '—' },
  { label: 'הערות', get: s => s.notes || '—' },
]

export function Roved5CompareModal({ services, onClose, onRemove }: Props) {
  if (services.length === 0) return null
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.cmpModal} onClick={e => e.stopPropagation()}>
        <button className={s.modalClose} onClick={onClose} aria-label="סגור">✕</button>
        <h3 className={s.cmpTitle}>השוואת שירותים ({services.length})</h3>
        <div className={s.cmpScroll}>
          <table className={s.cmpTable}>
            <thead>
              <tr>
                <th className={s.cmpRowHead}></th>
                {services.map(sv => (
                  <th key={sv.id} className={s.cmpColHead}>
                    <div className={s.cmpColName}>{sv.name}</div>
                    <button className={s.cmpRemove} onClick={() => onRemove(sv.id)}>הסר ✕</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => (
                <tr key={row.label}>
                  <th className={s.cmpRowHead}>{row.label}</th>
                  {services.map(sv => (
                    <td key={sv.id} className={s.cmpCell}>{row.get(sv)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
