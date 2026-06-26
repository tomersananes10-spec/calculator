// Build a URL to navigate to when the user clicks "open" on a journey step.
// Each module accepts a subset of params + a journey_step_id so the target
// page can: (1) pre-fill its form/filters; (2) link any entity it creates
// back to the journey step.

import type { ModuleKey, JourneyStep } from '../types'

function appendParams(base: string, step: JourneyStep, allowed: string[]): string {
  const params = new URLSearchParams()
  params.set('journey_step_id', step.id)
  for (const key of allowed) {
    const v = step.prefill_params[key]
    if (v === undefined || v === null || v === '') continue
    params.set(key, String(v))
  }
  return `${base}?${params.toString()}`
}

const MODULE_ROUTES: Record<ModuleKey, { base: string; allowed: string[] }> = {
  brief:     { base: '/briefs',        allowed: ['title', 'cluster_id', 'background', 'ministry'] },
  takam:     { base: '/calculator',    allowed: ['name', 'ministry'] },
  aiml:      { base: '/calculator',    allowed: ['name', 'ministry'] },
  tenders:   { base: '/tenders/new',   allowed: ['name', 'brief_id', 'calculation_id'] },
  roved5:    { base: '/layer5',        allowed: ['category', 'search'] },
  suppliers: { base: '/suppliers',     allowed: ['cluster', 'specialization'] },
}

export function urlForStep(step: JourneyStep): string {
  const cfg = MODULE_ROUTES[step.module_key]
  const url = appendParams(cfg.base, step, cfg.allowed)
  // aiml shares /calculator with takam — force AI mode via the existing mode param
  if (step.module_key === 'aiml') return url + '&mode=ai'
  if (step.module_key === 'takam') return url + '&mode=data'
  return url
}

export const MODULE_HE_LABEL: Record<ModuleKey, string> = {
  brief:     'מחולל בריפים',
  takam:     'מחשבון תכ"ם',
  aiml:      'מחשבון AI/ML',
  tenders:   'מורשי חתימה',
  roved5:    'רובד 5',
  suppliers: 'ספקים זוכים',
}

export const MODULE_ICON: Record<ModuleKey, string> = {
  brief:     '📋',
  takam:     '🧮',
  aiml:      '🤖',
  tenders:   '✅',
  roved5:    '☁️',
  suppliers: '🏢',
}
