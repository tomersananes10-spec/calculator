import { useRef, useState, useEffect, useCallback } from 'react'
import { renderAsync } from 'docx-preview'
import type { WizardState } from './types'
import { generateBriefBlob, exportBriefToWord } from './wordExport'
import styles from './BriefWizard.module.css'

interface Props {
  state: WizardState
  onBack: () => void
  onSubmit: () => void
  saving?: boolean
}

export default function Step10Preview({ state, onBack, onSubmit, saving }: Props) {
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadPreview = useCallback(async () => {
    if (!containerRef.current) return
    setLoading(true)
    try {
      const blob = await generateBriefBlob(state)
      containerRef.current.innerHTML = ''
      await renderAsync(blob, containerRef.current, undefined, {
        className: styles.docxWrapper,
      })
    } finally {
      setLoading(false)
    }
  }, [state])

  useEffect(() => { loadPreview() }, [loadPreview])

  async function handleExport() {
    setExporting(true)
    try { await exportBriefToWord(state) }
    finally { setExporting(false) }
  }

  return (
    <div>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>תצוגה מקדימה — הבריף המלא</h2>
        <p className={styles.stepSubtitle}>תצוגה של קובץ ה-Word כפי שיורד</p>
      </div>

      <div className={styles.navBtns}>
        <button className={styles.btnSecondary} onClick={onBack}>הקודם</button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={styles.btnSecondary} onClick={loadPreview} disabled={loading}>
            🔄 רענן תצוגה
          </button>
          <button className={styles.btnSecondary} onClick={handleExport} disabled={exporting}>
            {exporting ? 'מייצא...' : '📥 הורד Word'}
          </button>
          <button className={styles.btnPrimary} onClick={onSubmit} disabled={saving}>
            {saving ? 'שומר...' : 'שמור בריף'}
          </button>
        </div>
      </div>

      <div className={styles.previewViewer}>
        {loading && <div className={styles.previewLoading}>טוען תצוגה מקדימה...</div>}
        <div ref={containerRef} />
      </div>
    </div>
  )
}
