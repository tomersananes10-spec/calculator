import { Topbar } from '../components/Topbar'
import { useAuth } from '../hooks/useAuth'
import { Roved5 } from '../modules/roved5/Roved5'

export function Roved5Page() {
  const { user } = useAuth()
  const fullName = user?.user_metadata?.full_name ?? ''

  return (
    <>
      <Topbar
        title="רובד 5"
        badge="חדש"
        userName={fullName}
        backHref="/"
      />
      <Roved5 />
    </>
  )
}
