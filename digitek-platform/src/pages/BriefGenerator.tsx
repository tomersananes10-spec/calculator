import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBriefs } from '../hooks/useBriefs'
import { BriefWizard } from '../modules/brief-generator/BriefWizard'
import { NewBriefSelector } from '../modules/brief-generator/NewBriefSelector'
import { BriefsList } from '../modules/brief-generator/BriefsList'
import type { Cluster, Specialization } from '../data/clusters'
import { clusters } from '../data/clusters'
import { INITIAL_STATE } from '../modules/brief-generator/types'
import { getBriefTemplate } from '../data/briefTemplates'

type View = 'list' | 'new' | 'wizard'

export function BriefGenerator() {
  const { createBrief, saveBrief } = useBriefs()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>('new')
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null)
  const [activeInitialState, setActiveInitialState] = useState<typeof INITIAL_STATE | undefined>(undefined)
  const [bootstrapped, setBootstrapped] = useState(false)

  // Knowledge Hub deep-link: ?journey_step_id=…&cluster_id=…&title=…&background=…
  useEffect(() => {
    if (bootstrapped) return
    const journeyStepId = searchParams.get('journey_step_id')
    const clusterId = searchParams.get('cluster_id')
    if (!journeyStepId || !clusterId) return

    const cluster = clusters.find(c => c.id === clusterId)
    const spec = cluster?.specializations[0]
    if (!cluster || !spec) return

    const template = getBriefTemplate(cluster, spec)
    const title = searchParams.get('title') ?? 'טיוטה ללא שם'
    const background = searchParams.get('background') ?? ''
    const ministry = searchParams.get('ministry') ?? ''

    const prefilledState: typeof INITIAL_STATE = {
      ...INITIAL_STATE,
      ...template,
      identification: {
        ...INITIAL_STATE.identification,
        projectName: title,
        ministry,
        selectedCluster: cluster,
        selectedSpecialization: spec,
      },
      currentSituation: {
        ...INITIAL_STATE.currentSituation,
        ...(template.currentSituation ?? {}),
        ...(background ? { businessProblem: background } : {}),
      },
    }

    setBootstrapped(true)
    void createBrief({ journey_step_id: journeyStepId })
      .then(brief => {
        setActiveBriefId(brief.id)
        setActiveInitialState(prefilledState)
        setView('wizard')
        // Persist initial state so the journey link is materialised even if user leaves quickly.
        void saveBrief(brief.id, prefilledState, title)
        // Clean the URL so a refresh doesn't trigger this again.
        const params = new URLSearchParams(searchParams)
        params.delete('journey_step_id')
        params.delete('cluster_id')
        params.delete('title')
        params.delete('background')
        params.delete('ministry')
        setSearchParams(params, { replace: true })
      })
      .catch(() => { /* fall back to the regular new-brief flow */ })
  }, [searchParams, bootstrapped, createBrief, saveBrief, setSearchParams])

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
