import { useState, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAdminData } from './hooks/useAdminData'
import type { AdminTab } from './types'
import s from './AdminPanel.module.css'

const UsersTable = lazy(() => import('./components/UsersTable'))
const AdminsManager = lazy(() => import('./components/AdminsManager'))
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'))
const SupportTickets = lazy(() => import('./components/SupportTickets'))
const DevTasks = lazy(() => import('./components/DevTasks'))
const HealthCheck = lazy(() => import('./components/HealthCheck'))
const DataQuality = lazy(() => import('./components/DataQuality'))
const SecurityMonitor = lazy(() => import('./components/SecurityMonitor'))
const AppErrors = lazy(() => import('./components/AppErrors'))

const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'analytics', label: 'לוח בקרה', icon: '📊' },
  { key: 'users', label: 'משתמשים', icon: '👥' },
  { key: 'admins', label: 'מנהלי מערכת', icon: '🛡️' },
  { key: 'support', label: 'תמיכה', icon: '🛟' },
  { key: 'dev', label: 'פיתוח', icon: '🔧' },
  { key: 'health', label: 'תקינות', icon: '❤️' },
  { key: 'data-quality', label: 'איכות נתונים', icon: '🔍' },
  { key: 'security', label: 'אבטחת מידע', icon: '🔒' },
  { key: 'errors', label: 'שגיאות', icon: '⚠️' },
]

export default function AdminPanel() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>('users')
  const adminData = useAdminData(isAdmin)

  const adminCount = useMemo(
    () => adminData.profiles.filter(p => p.is_admin).length,
    [adminData.profiles],
  )

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
        אין לך הרשאת גישה לדף זה
      </div>
    )
  }

  const getTabLabel = (tab: typeof TABS[number]) => {
    if (tab.key === 'users') return `${tab.icon} ${tab.label} (${adminData.profiles.length})`
    if (tab.key === 'admins') return `${tab.icon} ${tab.label} (${adminCount})`
    return `${tab.icon} ${tab.label}`
  }

  const Loading = () => (
    <div className={s.empty}>
      <div className={s.spinner} />
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <Link to="/" className={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          חזרה
        </Link>
      </div>

      <div className={s.header}>
        <div className={s.headerIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <h1 className={s.title}>ניהול מערכת</h1>
          <p className={s.subtitle}>סטטיסטיקות, משתמשים ומנהלים</p>
        </div>
      </div>

      <div className={s.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${s.tab} ${activeTab === tab.key ? s.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      <Suspense fallback={<Loading />}>
        {activeTab === 'analytics' && (
          <AnalyticsDashboard profiles={adminData.profiles} />
        )}
        {activeTab === 'users' && (
          <UsersTable
            profiles={adminData.profiles}
            loading={adminData.loading}
            currentUserId={user?.id}
            onToggleAdmin={adminData.toggleAdmin}
            onUpdateName={adminData.updateName}
            onDeleteUser={adminData.deleteUser}
            onRefresh={adminData.refresh}
          />
        )}
        {activeTab === 'admins' && (
          <AdminsManager
            profiles={adminData.profiles}
            currentUserId={user?.id}
            onToggleAdmin={adminData.toggleAdmin}
          />
        )}
        {activeTab === 'support' && <SupportTickets />}
        {activeTab === 'dev' && <DevTasks />}
        {activeTab === 'health' && <HealthCheck />}
        {activeTab === 'data-quality' && <DataQuality />}
        {activeTab === 'security' && <SecurityMonitor />}
        {activeTab === 'errors' && <AppErrors />}
      </Suspense>
    </div>
  )
}
