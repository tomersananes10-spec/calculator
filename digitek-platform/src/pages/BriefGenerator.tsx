import { useState } from 'react'
import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import { useBriefs } from '../hooks/useBriefs'
import { BriefWizard } from '../modules/brief-generator/BriefWizard'
import { NewBriefSelector } from '../modules/brief-generator/NewBriefSelector'
import { BriefsList } from '../modules/brief-generator/BriefsList'
import type { Cluster, Specialization } from '../data/clusters'
import { INITIAL_STATE } from '../modules/brief-generator/types'
import { getBriefTemplate } from '../data/briefTemplates'

type View = 'list' | 'new' | 'wizard'

export function BriefGenerator() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''
  const { createBrief, saveBrief } = useBriefs()
  const [view, setView] = useState<View>('new')
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleStartNew(cluster: Cluster, spec: Specialization) {
    setCreating(true)
    try {
      const brief = await createBrief()
      const template = getBriefTemplate(cluster, spec)
      const prefilledState = {
        ...INITIAL_STATE,
        ...template,
        identification: { ...INITIAL_STATE.identification, selectedCluster: cluster, selectedSpecialization: spec },
      }
      await saveBrief(brief.id, prefilledState, 'טיוטה ללא שם')
      setActiveBriefId(brief.id)
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
      <Topbar
        title="מחולל בריפים"
        badge="Beta"
        userName={fullName}
        backHref="/"
      />
      {view === 'list' && (
        <BriefsList onOpen={handleOpen} onNew={() => setView('new')} onBack={() => setView('new')} />
      )}
      {view === 'new' && (
        <NewBriefSelector onSelect={handleStartNew} loading={creating} onMyBriefs={() => setView("list")} />
      )}
      {view === 'wizard' && activeBriefId && (
        <BriefWizard briefId={activeBriefId} onClose={handleClose} />
      )}
    </>
  )
}
