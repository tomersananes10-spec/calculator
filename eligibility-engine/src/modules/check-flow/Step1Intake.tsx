import { useRef, useState, useCallback } from 'react'
import { getRoleTemplateList, SAMPLE_CV } from '../../data/roleTemplates'
import { SUPPORTED_TYPES } from '../engine/fileParser'
import { Upload, FileText, X, FileCheck } from 'lucide-react'
import type { CheckWizardState } from '../engine/types'
import s from './Step1Intake.module.css'

interface Step1Props {
  state: CheckWizardState
  dispatch: React.Dispatch<any>
  onRun: () => void
  onFile: (file: File) => void
}

export function Step1Intake({ state, dispatch, onRun, onFile }: Step1Props) {
  const templates = getRoleTemplateList()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }, [onFile])

  const hasFile = state.cvSource !== 'text' && state.cvFileName

  return (
    <div className={s.section}>
      <div className={s.fieldRow}>
        <div className={s.field}>
          <label className={s.label}>שם מועמד/ת</label>
          <input
            className={s.input}
            value={state.candidateName}
            onChange={e => dispatch({ type: 'SET_CANDIDATE_NAME', payload: e.target.value })}
            placeholder="שם מלא"
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>חברה מציעה</label>
          <input
            className={s.input}
            value={state.candidateCompany}
            onChange={e => dispatch({ type: 'SET_CANDIDATE_COMPANY', payload: e.target.value })}
            placeholder="שם החברה"
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>סוג תפקיד</label>
        <select
          className={s.select}
          value={state.roleTemplateId}
          onChange={e => dispatch({ type: 'SET_ROLE', payload: e.target.value })}
        >
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} {t.takamCode ? `· ${t.takamCode}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className={s.field}>
        <label className={s.label}>קורות חיים / שאלון התאמה / אסמכתאות</label>

        <div
          className={`${s.dropZone} ${dragOver ? s.dropZoneActive : ''} ${hasFile ? s.dropZoneHasFile : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !hasFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_TYPES}
            onChange={handleFileInput}
            className={s.fileInput}
          />

          {state.isParsing ? (
            <div className={s.dropContent}>
              <div className={s.spinner} />
              <div className={s.dropTitle}>מפענח את הקובץ...</div>
              <div className={s.dropSubtitle}>{state.cvFileName}</div>
            </div>
          ) : hasFile ? (
            <div className={s.dropContent}>
              <FileCheck size={28} className={s.dropIconSuccess} />
              <div className={s.dropTitle}>{state.cvFileName}</div>
              <div className={s.dropSubtitle}>
                {state.cvSource === 'pdf' ? 'PDF' : 'Word'}
                {state.cvPageCount ? ` · ${state.cvPageCount} עמודים` : ''}
                {' · '}
                {state.cvText.length.toLocaleString()} תווים חולצו
              </div>
              <button
                className={s.clearFileBtn}
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'CLEAR_FILE' }) }}
              >
                <X size={14} /> הסר קובץ
              </button>
            </div>
          ) : (
            <div className={s.dropContent}>
              <Upload size={28} className={s.dropIcon} />
              <div className={s.dropTitle}>גררו קובץ לכאן או לחצו לבחירה</div>
              <div className={s.dropSubtitle}>PDF, DOCX · עד 10MB</div>
            </div>
          )}
        </div>

        {!hasFile && (
          <div className={s.divider}>
            <span className={s.dividerText}>או הקלידו/הדביקו טקסט</span>
          </div>
        )}

        {!hasFile && (
          <textarea
            className={s.textarea}
            value={state.cvSource === 'text' ? state.cvText : ''}
            onChange={e => dispatch({ type: 'SET_CV_TEXT', payload: e.target.value })}
            placeholder="הדביקו כאן את טקסט קורות החיים של המועמד/ת..."
          />
        )}

        {hasFile && state.cvText && (
          <details className={s.extractedDetails}>
            <summary className={s.extractedSummary}>
              <FileText size={14} />
              הצג טקסט שחולץ ({state.cvText.length.toLocaleString()} תווים)
            </summary>
            <pre className={s.extractedText}>{state.cvText}</pre>
          </details>
        )}
      </div>

      {state.error && <div className={s.error}>{state.error}</div>}

      <div className={s.actions}>
        <button
          className={s.btnPrimary}
          onClick={onRun}
          disabled={state.isRunning || state.isParsing || !state.cvText.trim()}
        >
          {state.isRunning ? 'מנתח...' : '🔍 הרץ בדיקת תנאי סף'}
        </button>
        {!state.cvText.trim() && !hasFile && (
          <button
            className={s.btnPrimary}
            style={{ background: 'var(--text3)' }}
            onClick={() => {
              dispatch({ type: 'SET_CV_TEXT', payload: SAMPLE_CV })
              dispatch({ type: 'SET_CANDIDATE_NAME', payload: 'דנה כהן' })
            }}
          >
            טען דוגמה
          </button>
        )}
      </div>

      <div className={s.note}>
        <strong>הערה:</strong> גרסת MVP זו מדמה מנוע AI באמצעות התאמת מונחים, זיהוי שנות ניסיון ולוגיקת תנאי סף.
        בגרסת ייצור יש לחבר OCR, LLM מאובטח, Rules Engine, מאגר מונחים ממשלתי ותיעוד החלטות מלא.
      </div>
    </div>
  )
}
