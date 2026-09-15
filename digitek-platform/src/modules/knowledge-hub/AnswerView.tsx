import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { downloadPriceTable } from '../../lib/priceTableExport'
import type { PriceTableKind } from '../../lib/priceTableExport'
import { urlForModule, MODULE_HE_LABEL, MODULE_ICON } from './lib/stepActions'
import type { AdvisorResponse, AdvisorResource, PriceTableResourceKey } from './types'
import styles from './AnswerView.module.css'

const RESOURCE_KIND: Record<PriceTableResourceKey, PriceTableKind> = {
  takam_price_table: 'takam',
  aiml_price_table: 'aiml',
}

interface Props {
  wish: string
  response: AdvisorResponse
  onNewSearch: () => void
}

export function AnswerView({ wish, response, onNewSearch }: Props) {
  const navigate = useNavigate()
  const resources = response.resources ?? []

  return (
    <div className={styles.wrap}>
      <div className={styles.questionCard}>
        <div className={styles.questionLabel}>השאלה שלך</div>
        <div className={styles.questionText}>{wish}</div>
      </div>

      <div className={styles.answerCard}>
        <div className={styles.answerText}>{response.answer}</div>

        {response.tags.length > 0 && (
          <div className={styles.tags}>
            {response.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}

        {resources.length > 0 && (
          <div className={styles.resources}>
            {resources.map((r, i) => (
              <ResourceRow key={i} resource={r} onNavigate={url => navigate(url)} />
            ))}
          </div>
        )}
      </div>

      <button type="button" className={styles.newBtn} onClick={onNewSearch}>
        + שאלה חדשה
      </button>
    </div>
  )
}

function ResourceRow({ resource, onNavigate }: { resource: AdvisorResource; onNavigate: (url: string) => void }) {
  const [busy, setBusy] = useState<null | 'pdf' | 'png'>(null)

  if (resource.type === 'download' && resource.resource_key && RESOURCE_KIND[resource.resource_key]) {
    const kind = RESOURCE_KIND[resource.resource_key]
    async function run(format: 'pdf' | 'png') {
      setBusy(format)
      try {
        await downloadPriceTable(kind, format)
      } finally {
        setBusy(null)
      }
    }
    return (
      <div className={styles.resourceCard}>
        <span className={styles.resourceLabel}>📄 {resource.label}</span>
        <div className={styles.resourceBtns}>
          <button type="button" className={styles.dlBtn} onClick={() => run('pdf')} disabled={busy !== null}>
            {busy === 'pdf' ? '⏳ מייצא…' : '📄 PDF'}
          </button>
          <button type="button" className={styles.dlBtn} onClick={() => run('png')} disabled={busy !== null}>
            {busy === 'png' ? '⏳ מייצא…' : '🖼️ תמונה'}
          </button>
        </div>
      </div>
    )
  }

  if (resource.type === 'link' && resource.module_key) {
    const url = urlForModule(resource.module_key, resource.prefill_params ?? {})
    return (
      <div className={styles.resourceCard}>
        <span className={styles.resourceLabel}>
          {MODULE_ICON[resource.module_key]} {resource.label || MODULE_HE_LABEL[resource.module_key]}
        </span>
        <div className={styles.resourceBtns}>
          <button type="button" className={styles.linkBtn} onClick={() => onNavigate(url)}>
            פתח ←
          </button>
        </div>
      </div>
    )
  }

  return null
}
