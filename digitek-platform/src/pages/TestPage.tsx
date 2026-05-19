import { useRef, useState, useCallback } from 'react'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { renderAsync } from 'docx-preview'
import styles from './TestPage.module.css'

const TEMPLATE_PATH = '/brief-template.docx'

const STEPS = [
  { n: 1, label: 'זיהוי' },
  { n: 2, label: 'תוכן' },
  { n: 3, label: 'תצוגה מקדימה' },
]

interface FormData {
  specName: string
  projectName: string
  section11Content: string
  section12Content: string
  section13Content: string
}

const INITIAL: FormData = {
  specName: '',
  projectName: '',
  section11Content: '',
  section12Content: '',
  section13Content: '',
}

async function generateDocBlob(form: FormData): Promise<Blob> {
  const res = await fetch(TEMPLATE_PATH)
  if (!res.ok) throw new Error(`Failed to load template: ${res.status}`)
  const buf = await res.arrayBuffer()

  const doc = new Docxtemplater(new PizZip(buf), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() { return '' },
  })

  doc.render({
    specName: form.specName || 'AI/ML',
    projectName: form.projectName || 'XXX',
    section11Content: form.section11Content,
    section12Content: form.section12Content,
    section13Content: form.section13Content,
  })

  return doc.getZip().generate({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export function TestPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const set = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value })),
    [],
  )

  const goToPreview = useCallback(async () => {
    setStep(3)
    setLoading(true)
    try {
      const blob = await generateDocBlob(form)
      setGeneratedBlob(blob)
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
        await renderAsync(blob, containerRef.current, undefined, {
          className: styles.docxWrapper,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [form])

  const handleDownload = useCallback(() => {
    if (!generatedBlob) return
    const url = URL.createObjectURL(generatedBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = (form.projectName || 'בריף') + '.docx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [generatedBlob, form.projectName])

  return (
    <div className={styles.page}>
      {/* Progress bar */}
      <div className={styles.progress}>
        {STEPS.map(s => (
          <div
            key={s.n}
            className={`${styles.stepDot} ${step >= s.n ? styles.stepActive : ''}`}
          >
            <span className={styles.stepNum}>{s.n}</span>
            <span className={styles.stepLabel}>{s.label}</span>
          </div>
        ))}
        <div className={styles.progressLine}>
          <div
            className={styles.progressFill}
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className={styles.card}>
          <h2 className={styles.title}>שלב 1 — זיהוי</h2>

          <label className={styles.label}>שם ההתמחות</label>
          <input
            className={styles.input}
            placeholder='לדוגמה: AI/ML'
            value={form.specName}
            onChange={set('specName')}
          />

          <label className={styles.label}>שם הפרויקט</label>
          <input
            className={styles.input}
            placeholder='לדוגמה: מערכת ניהול ידע ארגוני'
            value={form.projectName}
            onChange={set('projectName')}
          />

          <div className={styles.nav}>
            <button className={styles.btnPrimary} onClick={() => setStep(2)}>
              הבא ←
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className={styles.card}>
          <h2 className={styles.title}>שלב 2 — תוכן</h2>

          <label className={styles.label}>1.1 תיאור כללי של הפרויקט</label>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder='תיאור כללי של הפרויקט...'
            value={form.section11Content}
            onChange={set('section11Content')}
          />

          <label className={styles.label}>1.2 תיאור המצב הקיים / הבעיה</label>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder='הסבר על המצב הקיים, הבעיה, הצורך...'
            value={form.section12Content}
            onChange={set('section12Content')}
          />

          <label className={styles.label}>1.3 תיאור התוצרים והשירותים המבוקשים</label>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder='פירוט התוצרים והשירותים הנדרשים...'
            value={form.section13Content}
            onChange={set('section13Content')}
          />

          <div className={styles.nav}>
            <button className={styles.btnOutline} onClick={() => setStep(1)}>
              → חזרה
            </button>
            <button className={styles.btnPrimary} onClick={goToPreview}>
              תצוגה מקדימה ←
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className={styles.card}>
          <h2 className={styles.title}>שלב 3 — תצוגה מקדימה</h2>

          <div className={styles.nav}>
            <button className={styles.btnOutline} onClick={() => setStep(2)}>
              → חזרה לעריכה
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleDownload}
              disabled={!generatedBlob}
            >
              📥 הורד Word
            </button>
          </div>

          <div className={styles.viewerWrapper}>
            {loading && <div className={styles.loading}>טוען תצוגה מקדימה...</div>}
            <div ref={containerRef} className={styles.viewer} />
          </div>
        </div>
      )}
    </div>
  )
}
