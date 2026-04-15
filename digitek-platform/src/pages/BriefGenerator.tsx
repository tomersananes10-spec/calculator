import { useState } from 'react'
import { useBriefs } from '../hooks/useBriefs'
import { BriefWizard } from '../modules/brief-generator/BriefWizard'
import { NewBriefSelector } from '../modules/brief-generator/NewBriefSelector'
import { BriefsList } from '../modules/brief-generator/BriefsList'
import type { Cluster, Specialization } from '../data/clusters'
import { INITIAL_STATE } from '../modules/brief-generator/types'
import { getBriefTemplate } from '../data/briefTemplates'

type View = 'list' | 'new' | 'wizard'

export function BriefGenerator() {
  const { createBrief, saveBrief } = useBriefs()
  const [view, setView] = useState<View>('new')
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null)
  const [activeInitialState, setActiveInitialState] = useState<typeof INITIAL_STATE | undefined>(undefined)

  function handleStartNew(cluster: Cluster, spec: Specialization) {
    // Open the wizard immediately — no Supabase round-trip needed to start
    const template = getBriefTemplate(cluster, spec)
    const prefilledState = {
      ...INITIAL_STATE,
      ...template,
      identification: { ...INITIAL_STATE.identification, selectedCluster: cluster, selectedSpecialization: spec },
    }
    setActiveInitialState(prefilledState)
    setActiveBriefId(crypto.randomUUID())
    setView('wizard')

    // Fire-and-forget: persist in background (non-blocking)
    createBrief()
      .then(brief => saveBrief(brief.id, prefilledState, 'טיוטה ללא שם'))
      .catch(() => { /* Supabase unavailable — wizard still works locally */ })
  }

  function handleOpen(briefId: string) {
    setActiveBriefId(briefId)
    setView('wizard')
  }

  function handleClose() {
    setActiveBriefId(null)
    setView('list')
  }

  return (
    <>
      {view === 'list' && (
        <BriefsList onOpen={handleOpen} onNew={() => setView('new')} onBack={() => setView('new')} />
      )}
      {view === 'new' && (
        <NewBriefSelector onSelect={handleStartNew} onMyBriefs={() => setView("list")} />
      )}
      {view === 'wizard' && activeBriefId && (
        <BriefWizard briefId={activeBriefId} onClose={handleClose} initialState={activeInitialState} />
      )}
    </>
  )
}
