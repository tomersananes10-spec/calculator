import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TakamCalculator } from '../modules/takam-calculator/TakamCalculator'
import { AimlCalculator } from '../modules/aiml-calculator/AimlCalculator'
import aiml from '../modules/aiml-calculator/AimlCalculator.module.css'

type Mode = 'data' | 'ai'

const STORAGE_KEY = 'calcMode:v1'

function readInitialMode(searchParams: URLSearchParams): Mode {
  const fromUrl = searchParams.get('mode')
  if (fromUrl === 'ai' || fromUrl === 'data') return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ai' || saved === 'data') return saved
  } catch { /* ignore */ }
  return 'data'
}

export function Calculator() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => readInitialMode(searchParams))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch { /* ignore */ }
  }, [mode])

  function switchMode(next: Mode) {
    setMode(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'ai') params.set('mode', 'ai')
    else params.delete('mode')
    setSearchParams(params, { replace: true })
  }

  return (
    <div className={aiml.calcWrap}>
      <div className={aiml.modeToggle} role="tablist" aria-label="בחירת סוג מחשבון">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'data'}
          title="לפי שעות מומחה — תכ&quot;ם"
          className={`${aiml.modeBtn} ${mode === 'data' ? aiml.modeBtnOn : ''}`}
          onClick={() => switchMode('data')}
        >
          ⏱️ שעות
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'ai'}
          title="לפי תוצרי AI/ML — סעיף 3.16"
          className={`${aiml.modeBtn} ${mode === 'ai' ? aiml.modeBtnOn : ''}`}
          onClick={() => switchMode('ai')}
        >
          🤖 תוצרים
        </button>
      </div>

      {mode === 'data' ? <TakamCalculator /> : <AimlCalculator />}
    </div>
  )
}
