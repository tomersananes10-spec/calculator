import { useRef, useState, useCallback } from 'react'
import { renderAsync } from 'docx-preview'
import styles from './TestPage.module.css'

const FILE_PATH = '/brief-template.docx'

export function TestPage() {
  const [showViewer, setShowViewer] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadPreview = useCallback(async () => {
    if (!containerRef.current) return
    setLoading(true)
    try {
      const resp = await fetch(FILE_PATH)
      const blob = await resp.blob()
      containerRef.current.innerHTML = ''
      await renderAsync(blob, containerRef.current, undefined, {
        className: styles.docxWrapper,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggle = async () => {
    const next = !showViewer
    setShowViewer(next)
    if (next) {
      setTimeout(loadPreview, 0)
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = FILE_PATH
    a.download = 'brief-template.docx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>מודול בדיקה — תבנית בריף</h1>
        <p className={styles.subtitle}>
          קובץ Word של תבנית הבריף הממשלתית הרשמית
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={handleDownload}>
            📥 הורדה
          </button>
          <button className={styles.btnSecondary} onClick={handleToggle}>
            {showViewer ? '🔽 הסתר צפייה' : '👁️ צפייה'}
          </button>
        </div>
      </div>

      {showViewer && (
        <div className={styles.viewerWrapper}>
          {loading && <div className={styles.loading}>טוען תצוגה מקדימה...</div>}
          <div ref={containerRef} className={styles.viewer} />
        </div>
      )}
    </div>
  )
}
