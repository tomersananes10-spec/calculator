import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import { TakamCalculator } from '../modules/takam-calculator/TakamCalculator'

export function Calculator() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''

  return (
    <>
      <Topbar
        title='מחשבון תכ"ם'
        badge="Beta"
        userName={fullName}
        backHref="/"
      />
      <TakamCalculator />
    </>
  )
}
