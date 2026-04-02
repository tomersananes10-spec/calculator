import { useState } from 'react'
import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import { BriefWizard } from '../modules/brief-generator/BriefWizard'
import { BriefsList } from '../modules/brief-generator/BriefsList'

export function BriefGenerator() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null)

  return (
    <>
      <Topbar
        title="מחולל בריפים"
        badge="Beta"
        userName={fullName}
        backHref="/"
      />
      {activeBriefId === null ? (
        <BriefsList onOpen={setActiveBriefId} />
      ) : (
        <BriefWizard briefId={activeBriefId} onClose={() => setActiveBriefId(null)} />
      )}
    </>
  )
}
