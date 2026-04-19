import { useState } from 'react'
import s from './TakamCalculator.module.css'

interface Props {
  open: boolean
  onClose: () => void
  calculationId: string | null
  grandTotal: number
  onCreateShare: (permission: 'view' | 'edit') => Promise<string | null>
  formatCurrency: (n: number, compact?: boolean) => string
}

export function ShareDialog({ open, onClose, calculationId, grandTotal, onCreateShare, formatCurrency }: Props) {
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!open) return null

  function getShareURL(tok: string) {
    return `${location.origin}/calculator?share=${tok}`
  }

  async function handleGenerate() {
    setLoading(true)
    const tok = await onCreateShare(permission)
    setToken(tok)
    setLoading(false)
  }

  function copyLink() {
    if (!token) return
    const url = getShareURL(token)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => fallbackCopy(url))
    } else {
      fallbackCopy(url)
    }
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!token) return
    const url = getShareURL(token)
    const text = `הצעת מחיר תכ"ם — ${formatCurrency(grandTotal, true)}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function shareEmail() {
    if (!token) return
    const url = getShareURL(token)
    const subject = `הצעת מחיר תכ"ם — ${formatCurrency(grandTotal, true)}`
    const body = `צפה בהצעת המחיר:\n${url}`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  function handleClose() {
    setToken(null)
    setCopied(false)
    setPermission('view')
    onClose()
  }

  return (
    <>
      <div className={s.historyOverlay} onClick={handleClose} />
      <div className={s.shareDialog}>
        <div className={s.shareDialogHeader}>
          <h3 className={s.shareDialogTitle}>שיתוף חישוב</h3>
          <button className={s.historyClose} onClick={handleClose}>✕</button>
        </div>

        <div className={s.shareDialogBody}>
          {!calculationId && (
            <p className={s.shareDialogNote}>יש לשמור את החישוב לפני שיתוף</p>
          )}

          {calculationId && !token && (
            <>
              <div className={s.sharePermPicker}>
                <label className={s.shareDialogLabel}>הרשאה:</label>
                <div className={s.seg}>
                  <button
                    className={`${s.segBtn} ${permission === 'view' ? s.segBtnActive : ''}`}
                    onClick={() => setPermission('view')}
                  >
                    צפייה בלבד
                  </button>
                  <button
                    className={`${s.segBtn} ${permission === 'edit' ? s.segBtnActive : ''}`}
                    onClick={() => setPermission('edit')}
                  >
                    עריכה
                  </button>
                </div>
                {permission === 'edit' && (
                  <p className={s.shareDialogHint}>הנמען יצטרך להיות מחובר למערכת</p>
                )}
              </div>
              <button
                className={s.btnPrimary}
                onClick={handleGenerate}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'יוצר קישור...' : 'צור קישור שיתוף'}
              </button>
            </>
          )}

          {calculationId && token && (
            <>
              <div className={s.shareLinkBox}>
                <input
                  className={s.input}
                  readOnly
                  value={getShareURL(token)}
                  onFocus={e => e.target.select()}
                />
              </div>
              <div className={s.shareActions}>
                <button className={s.shareActionBtn} onClick={copyLink}>
                  {copied ? '✓ הועתק!' : '📋 העתק קישור'}
                </button>
                <button className={s.shareActionBtn} onClick={shareWhatsApp}>
                  💬 וואטסאפ
                </button>
                <button className={s.shareActionBtn} onClick={shareEmail}>
                  📧 מייל
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
