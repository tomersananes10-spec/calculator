import { useState } from 'react'
import s from './Roved5.module.css'

type ShareMode = 'full' | 'view'

function copyToClipboard(text: string, onDone: () => void) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(() => fallbackCopy(text, onDone))
  } else {
    fallbackCopy(text, onDone)
  }
}

function fallbackCopy(text: string, onDone: () => void) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  onDone()
}

export function Roved5ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<ShareMode>('view')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const link = mode === 'full'
    ? `${location.origin}/`
    : `${location.origin}/share/layer5`

  function pick(next: ShareMode) {
    setMode(next)
    setCopied(false)
  }

  function copyLink() {
    copyToClipboard(link, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function shareWhatsApp() {
    const text = `רובד 5 — קטלוג שירותי ענן מאושרים\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function shareEmail() {
    const subject = 'רובד 5 — קטלוג שירותי ענן מאושרים'
    const body = `צפה בקטלוג:\n${link}`
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  function handleClose() {
    setCopied(false)
    onClose()
  }

  return (
    <div className={s.modalOverlay} onClick={handleClose}>
      <div className={s.shareBox} onClick={e => e.stopPropagation()}>
        <button className={s.modalClose} onClick={handleClose} aria-label="סגור">✕</button>
        <h3 className={s.shareTitle}>שיתוף רובד 5</h3>
        <p className={s.shareSub}>איך לשתף את המודול?</p>

        <div className={s.shareOptions}>
          <button
            className={`${s.shareOpt} ${mode === 'view' ? s.shareOptActive : ''}`}
            onClick={() => pick('view')}
          >
            <span className={s.shareOptTitle}>👁 צפייה בלבד (ללא התחברות)</span>
            <span className={s.shareOptDesc}>
              הנמען יראה את קטלוג רובד 5 בלבד — בלי התחברות ובלי כלי ניהול
            </span>
          </button>
          <button
            className={`${s.shareOpt} ${mode === 'full' ? s.shareOptActive : ''}`}
            onClick={() => pick('full')}
          >
            <span className={s.shareOptTitle}>🔓 שיתוף המערכת המלאה</span>
            <span className={s.shareOptDesc}>
              הנמען יתחבר למערכת ויראה אותה לפי ההרשאות שלו
            </span>
          </button>
        </div>

        <div className={s.shareLinkRow}>
          <input
            className={s.shareLinkInput}
            readOnly
            value={link}
            onFocus={e => e.currentTarget.select()}
          />
        </div>

        <div className={s.shareActions}>
          <button className={s.shareActionPrimary} onClick={copyLink}>
            {copied ? '✓ הועתק!' : '📋 העתק קישור'}
          </button>
          <button className={s.shareAction} onClick={shareWhatsApp}>💬 וואטסאפ</button>
          <button className={s.shareAction} onClick={shareEmail}>📧 מייל</button>
        </div>
      </div>
    </div>
  )
}
