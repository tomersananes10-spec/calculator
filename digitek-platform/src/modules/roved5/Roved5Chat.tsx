import { useState, useRef, useEffect } from 'react'
import s from './Roved5.module.css'
import type { Roved5Service } from './types'
import { roved5Chat, type ChatMessage } from './roved5AI'

interface Props {
  services: Roved5Service[]
  onOpenService: (service: Roved5Service) => void
  onSearchInCatalog: (query: string) => void
}

const GREETING: ChatMessage = {
  role: 'bot',
  text: 'שלום! ספרו לי מה אתם צריכים ואאתר עבורכם שירותי ענן מתאימים מרובד 5. למשל: "אבטחה לדאטה רגיש", "כלי ETL", או "גיבוי ושחזור".',
}

export function Roved5Chat({ services, onOpenService, onSearchInCatalog }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [recos, setRecos] = useState<Record<number, Roved5Service[]>>({})
  const [queries, setQueries] = useState<Record<number, string>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user' as const, text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    const reply = await roved5Chat(next, services)
    const botIndex = next.length
    setMessages(m => [...m, { role: 'bot', text: reply.answer || 'לא הצלחתי למצוא תשובה — נסו לנסח אחרת.' }])
    const found = reply.serviceIds
      .map(id => services.find(sv => sv.id === id))
      .filter((sv): sv is Roved5Service => !!sv)
    if (found.length) setRecos(r => ({ ...r, [botIndex]: found }))
    setQueries(q => ({ ...q, [botIndex]: text }))
    setLoading(false)
  }

  function openInCatalog(q: string) {
    onSearchInCatalog(q)
    setOpen(false)
  }

  return (
    <>
      {!open && (
        <button className={s.chatFab} onClick={() => setOpen(true)}>
          ✨ שיחה עם סייען AI
        </button>
      )}
      <div className={`${s.chatDrawer} ${open ? s.chatDrawerOpen : ''}`}>
        <div className={s.chatHead}>
          <span>✨ סייען רובד 5</span>
          <button className={s.chatHeadClose} onClick={() => setOpen(false)} aria-label="סגור">✕</button>
        </div>
        <div className={s.chatBody} ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`${s.chatMsg} ${m.role === 'bot' ? s.chatBot : s.chatUser}`}>
              {m.text}
              {recos[i]?.map(sv => (
                <div key={sv.id} className={s.chatMini} onClick={() => onOpenService(sv)}>
                  <b>{sv.name}</b>
                  <span>{sv.manufacturer || ''} · {sv.cloud}</span>
                </div>
              ))}
              {queries[i] && (
                <button className={s.chatOpenCatalog} onClick={() => openInCatalog(queries[i])}>
                  🔍 ראה עוד אפשרויות במסך הרגיל ←
                </button>
              )}
            </div>
          ))}
          {loading && <div className={`${s.chatMsg} ${s.chatBot}`}>✨ מחפש…</div>}
        </div>
        <div className={s.chatInputRow}>
          <input
            className={s.chatInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="כתבו הודעה…"
            disabled={loading}
          />
          <button className={s.chatSend} onClick={send} disabled={loading}>שלח</button>
        </div>
      </div>
    </>
  )
}
