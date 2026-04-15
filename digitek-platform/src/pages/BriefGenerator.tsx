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
  const [creating, setCreating] = useState(false)

  async function handleStartNew(cluster: Cluster, spec: Specialization) {
    setCreating(true)
    const template = getBriefTemplate(cluster, spec)
    const prefilledState = {
      ...INITIAL_STATE,
      ...template,
      identification: { ...INITIAL_STATE.identification, selectedCluster: cluster, selectedSpecialization: spec },
    }
    try {
      let briefId: string
      try {
        const brief = await createBrief()
        briefId = brief.id
        await saveBrief(briefId, prefilledState, 'טיוטה ללא שם')
        setActiveInitialState(undefined)  // Supabase has it — load normally
      } catch {
        briefId = crypto.randomUUID()
        setActiveInitialState(prefilledState)  // Pass directly when Supabase unavailable
      }
      setActiveBriefId(briefId)
      setView('wizard')
    } finally {
      setCreating(false)
    }
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
        <NewBriefSelector onSelect={handleStartNew} loading={creating} onMyBriefs={() => setView("list")} />
      )}
      {view === 'wizard' && activeBriefId && (
        <BriefWizard briefId={activeBriefId} onClose={handleClose} initialState={activeInitialState} />
      )}
    </>
  )
}
