import { useEffect, useRef, useState } from 'react'
import { searchEmailContacts, type EmailContact } from '../lib/emailContacts'
import styles from './EmailAutocompleteInput.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** מיילים שכבר נבחרו במקום אחר ונרצה לסנן מההצעות */
  excludeEmails?: string[]
  className?: string
}

/**
 * שדה מייל עם autocomplete מתוך email_contacts pool.
 * - לוקח עד 8 הצעות (most-used קודם)
 * - keyboard nav: ↑↓ Enter Esc
 * - תוצג ההצעה הפופולרית גם בשדה ריק כשהפוקוס בפנים
 * - LTR direction, text-align right
 */
export function EmailAutocompleteInput({
  value,
  onChange,
  placeholder = 'מייל',
  excludeEmails = [],
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<EmailContact[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  // debounced fetch של הצעות בעת הקלדה / פוקוס
  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      const results = await searchEmailContacts(value, excludeEmails)
      setSuggestions(results)
      setHighlight(results.length > 0 ? 0 : -1)
    }, 180)
    return () => clearTimeout(t)
  }, [value, open, excludeEmails])

  // סגירה בלחיצה מחוץ
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function pick(contact: EmailContact) {
    onChange(contact.email)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault()
      pick(suggestions[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <input
        type="email"
        className={className}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ direction: 'ltr', textAlign: 'right' }}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className={styles.dropdown}>
          {!value.trim() && (
            <div className={styles.header}>נמענים שמשתמשים בהם הכי הרבה</div>
          )}
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={s.id}
              className={`${styles.item} ${i === highlight ? styles.active : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(s) }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className={styles.email}>{s.email}</span>
              <span className={styles.count}>{s.use_count}×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
