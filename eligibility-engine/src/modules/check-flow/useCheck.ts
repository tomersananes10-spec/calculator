import { useReducer, useState } from 'react'
import type { CheckWizardState, CheckResult, HumanDecision, CvSource } from '../engine/types'
import { runEligibilityCheck, runEligibilityCheckWithAI } from '../engine/engine'
import { ROLE_TEMPLATES } from '../../data/roleTemplates'
import { useCheckHistory } from '../../hooks/useCheckHistory'
import { parseFile, isFileSupported, MAX_FILE_SIZE_MB } from '../engine/fileParser'

type Action =
  | { type: 'SET_CANDIDATE_NAME'; payload: string }
  | { type: 'SET_CANDIDATE_COMPANY'; payload: string }
  | { type: 'SET_ROLE'; payload: string }
  | { type: 'SET_CV_TEXT'; payload: string }
  | { type: 'FILE_PARSE_START'; payload: string }
  | { type: 'FILE_PARSE_COMPLETE'; payload: { text: string; source: CvSource; fileName: string; pageCount?: number } }
  | { type: 'FILE_PARSE_ERROR'; payload: string }
  | { type: 'CLEAR_FILE' }
  | { type: 'TOGGLE_AI' }
  | { type: 'RUN_CHECK' }
  | { type: 'CHECK_COMPLETE'; payload: CheckResult }
  | { type: 'CHECK_ERROR'; payload: string }
  | { type: 'SET_DECISION'; payload: { requirementId: string; decision: HumanDecision } }
  | { type: 'SET_DECISION_NOTES'; payload: string }
  | { type: 'GO_TO_STEP'; payload: 1 | 2 | 3 }
  | { type: 'RESET' }

const initialState: CheckWizardState = {
  currentStep: 1,
  candidateName: '',
  candidateCompany: '',
  roleTemplateId: 'cio',
  cvText: '',
  cvSource: 'text',
  cvFileName: null,
  cvPageCount: null,
  isParsing: false,
  useAI: false,
  checkResult: null,
  decisions: {},
  decisionNotes: '',
  isRunning: false,
  error: null,
}

function reducer(state: CheckWizardState, action: Action): CheckWizardState {
  switch (action.type) {
    case 'SET_CANDIDATE_NAME':
      return { ...state, candidateName: action.payload }
    case 'SET_CANDIDATE_COMPANY':
      return { ...state, candidateCompany: action.payload }
    case 'SET_ROLE':
      return { ...state, roleTemplateId: action.payload }
    case 'SET_CV_TEXT':
      return { ...state, cvText: action.payload, cvSource: 'text', cvFileName: null, cvPageCount: null }
    case 'FILE_PARSE_START':
      return { ...state, isParsing: true, error: null, cvFileName: action.payload }
    case 'FILE_PARSE_COMPLETE':
      return {
        ...state,
        isParsing: false,
        cvText: action.payload.text,
        cvSource: action.payload.source,
        cvFileName: action.payload.fileName,
        cvPageCount: action.payload.pageCount ?? null,
      }
    case 'FILE_PARSE_ERROR':
      return { ...state, isParsing: false, error: action.payload, cvFileName: null }
    case 'CLEAR_FILE':
      return { ...state, cvText: '', cvSource: 'text', cvFileName: null, cvPageCount: null }
    case 'TOGGLE_AI':
      return { ...state, useAI: !state.useAI }
    case 'RUN_CHECK':
      return { ...state, isRunning: true, error: null }
    case 'CHECK_COMPLETE':
      return { ...state, isRunning: false, checkResult: action.payload, currentStep: 2 }
    case 'CHECK_ERROR':
      return { ...state, isRunning: false, error: action.payload }
    case 'SET_DECISION':
      return {
        ...state,
        decisions: { ...state.decisions, [action.payload.requirementId]: action.payload.decision },
      }
    case 'SET_DECISION_NOTES':
      return { ...state, decisionNotes: action.payload }
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export function useCheck() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [savedCheckId, setSavedCheckId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { saveCheck, saveDecision } = useCheckHistory()

  async function runCheck() {
    const template = ROLE_TEMPLATES[state.roleTemplateId]
    if (!template) {
      dispatch({ type: 'CHECK_ERROR', payload: 'לא נבחר תפקיד' })
      return
    }
    if (!state.cvText.trim()) {
      dispatch({ type: 'CHECK_ERROR', payload: 'יש להזין טקסט קורות חיים' })
      return
    }
    dispatch({ type: 'RUN_CHECK' })
    try {
      const result = state.useAI
        ? await runEligibilityCheckWithAI(state.cvText, template)
        : runEligibilityCheck(state.cvText, template)
      dispatch({ type: 'CHECK_COMPLETE', payload: result })

      const checkId = await saveCheck({
        candidateName: state.candidateName,
        candidateCompany: state.candidateCompany,
        roleTemplateId: state.roleTemplateId,
        roleTemplateName: template.name,
        cvText: state.cvText,
        checkResult: result,
      })
      if (checkId) setSavedCheckId(checkId)
    } catch {
      dispatch({ type: 'CHECK_ERROR', payload: 'שגיאה בהרצת הבדיקה' })
    }
  }

  async function submitDecision() {
    if (!savedCheckId) return
    setSaving(true)
    try {
      await saveDecision({
        checkId: savedCheckId,
        decisions: state.decisions,
        notes: state.decisionNotes,
      })
    } catch {
      // silent for now
    }
    setSaving(false)
  }

  function exportJson() {
    const template = ROLE_TEMPLATES[state.roleTemplateId]
    const payload = {
      candidateName: state.candidateName,
      candidateCompany: state.candidateCompany,
      role: template?.name ?? '',
      checkResult: state.checkResult,
      humanDecisions: state.decisions,
      decisionNotes: state.decisionNotes,
      generatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eligibility_${state.candidateName || 'report'}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(file: File) {
    if (!isFileSupported(file)) {
      dispatch({ type: 'FILE_PARSE_ERROR', payload: 'סוג קובץ לא נתמך. יש להעלות PDF או DOCX.' })
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      dispatch({ type: 'FILE_PARSE_ERROR', payload: `הקובץ גדול מדי. מקסימום ${MAX_FILE_SIZE_MB}MB.` })
      return
    }
    dispatch({ type: 'FILE_PARSE_START', payload: file.name })
    try {
      const result = await parseFile(file)
      if (!result.text.trim()) {
        dispatch({ type: 'FILE_PARSE_ERROR', payload: 'לא הצלחנו לחלץ טקסט מהקובץ. ייתכן שהקובץ מוגן או שהטקסט סרוק כתמונה.' })
        return
      }
      const source = result.fileType === 'pdf' ? 'pdf' as const : 'docx' as const
      dispatch({
        type: 'FILE_PARSE_COMPLETE',
        payload: { text: result.text, source, fileName: result.fileName, pageCount: result.pageCount },
      })
    } catch (err: any) {
      dispatch({ type: 'FILE_PARSE_ERROR', payload: err?.message ?? 'שגיאה בפענוח הקובץ' })
    }
  }

  return { state, dispatch, runCheck, exportJson, submitDecision, saving, savedCheckId, handleFile }
}
