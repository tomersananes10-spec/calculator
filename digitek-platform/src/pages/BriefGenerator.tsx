import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import { BriefWizard } from '../modules/brief-generator/BriefWizard'

export function BriefGenerator() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''

  return (
    <>
      <Topbar
        title="מחולל בריפים"
        badge="Beta"
        userName={fullName}
        backHref="/"
      />
      <BriefWizard />
    </>
  )
}
