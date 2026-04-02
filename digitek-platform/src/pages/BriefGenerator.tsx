import { useState } from 'react'
import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import { useBriefs } from '../hooks/useBriefs'
import { BriefWizard } from '../modules/brief-generator/BriefWizard'
import { BriefsList } from '../modules/brief-generator/BriefsList'
import { NewBriefSelector } from '../modules/brief-generator/NewBriefSelector'
import type { Cluster, Specialization } from '../data/clusters'
import { INITIAL_STATE } from '../modules/brief-generator/types'

type View = 'list' | 'select' | 'wizard'

export function BriefGenerator() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''
  const { createBrief, saveBrief } = useBriefs()
  const [view, setView] = useState<View>('list')
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleStartNew(cluster: Cluster, spec: Specialization) {
    setCreating(true)
    try {
      const brief = await createBrief()
      const prefilledState = {
        ...INITIAL_STATE,
        identification: {
          ...INITIAL_STATE.identification,
          selectedCluster: cluster,
          selectedSpecialization: spec,
        },
      }
      await saveBrief(brief.id, prefilledState, 'טיוטה ללא שם')
      setActiveBriefId(brief.id)
      setView('wizard')
    } finally {
      setCreating(false)
    }
  }

  function openExisting(briefId: string) {
    setActiveBriefId(briefId)
    setView('wizard')
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
        <BriefsList
          onOpen={openExisting}
          onNew={() => setView('select')}
        />
      )}
      {view === 'select' && (
        <NewBriefSelector
          onSelect={handleStartNew}
          onCancel={() => setView('list')}
          loading={creating}
        />
      )}
      {view === 'wizard' && activeBriefId && (
        <BriefWizard briefId={activeBriefId} onClose={() => setView('list')} />
      )}
    </>
  )
}
