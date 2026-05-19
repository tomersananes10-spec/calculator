import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { HealthCheckResult, HealthCheckStatus } from '../types'
import s from '../AdminPanel.module.css'

const INITIAL_CHECKS: HealthCheckResult[] = [
  { id: 'db', label: 'מסד נתונים', description: 'בדיקת חיבור לטבלת profiles', status: 'idle', icon: 'db' },
  { id: 'storage-avatars', label: 'אחסון אווטארים', description: 'בדיקת bucket avatars', status: 'idle', icon: 'storage' },
  { id: 'storage-logos', label: 'אחסון לוגואים', description: 'בדיקת bucket logos', status: 'idle', icon: 'storage' },
  { id: 'calculations', label: 'טבלת חישובים', description: 'בדיקת גישה לטבלת calculations', status: 'idle', icon: 'table' },
  { id: 'briefs', label: 'טבלת בריפים', description: 'בדיקת גישה לטבלת briefs', status: 'idle', icon: 'table' },
  { id: 'rpc-admin', label: 'RPC: admin_get_all_profiles', description: 'בדיקת תגובה של פונקציית אדמין', status: 'idle', icon: 'fn' },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  db: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  storage: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 6h.01M6 18h.01"/></svg>,
  table: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  fn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
}

export default function HealthCheck() {
  const [checks, setChecks] = useState<HealthCheckResult[]>(INITIAL_CHECKS)
  const [running, setRunning] = useState(false)

  const updateCheck = (id: string, updates: Partial<HealthCheckResult>) => {
    setChecks(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
  }

  const runCheck = async (
    id: string,
    fn: () => Promise<{ status: HealthCheckStatus; message?: string }>,
  ) => {
    updateCheck(id, { status: 'running', message: undefined })
    const t0 = performance.now()
    try {
      const result = await fn()
      updateCheck(id, { ...result, durationMs: Math.round(performance.now() - t0) })
    } catch (err) {
      updateCheck(id, {
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
        durationMs: Math.round(performance.now() - t0),
      })
    }
  }

  const runAll = async () => {
    setRunning(true)
    setChecks(
      INITIAL_CHECKS.map(c => ({
        ...c,
        status: 'idle' as HealthCheckStatus,
        message: undefined,
        durationMs: undefined,
      })),
    )

    await runCheck('db', async () => {
      const { error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      if (error) return { status: 'fail', message: error.message }
      return { status: 'pass', message: 'תגובה תקינה' }
    })

    await runCheck('storage-avatars', async () => {
      const { error } = await supabase.storage.from('avatars').list('', { limit: 1 })
      if (error) return { status: 'fail', message: error.message }
      return { status: 'pass', message: 'Bucket נגיש' }
    })

    await runCheck('storage-logos', async () => {
      const { error } = await supabase.storage.from('logos').list('', { limit: 1 })
      if (error) return { status: 'fail', message: error.message }
      return { status: 'pass', message: 'Bucket נגיש' }
    })

    await runCheck('calculations', async () => {
      const { error } = await supabase
        .from('calculations')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      if (error) return { status: 'fail', message: error.message }
      return { status: 'pass', message: 'טבלה נגישה' }
    })

    await runCheck('briefs', async () => {
      const { error } = await supabase
        .from('briefs')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      if (error) return { status: 'fail', message: error.message }
      return { status: 'pass', message: 'טבלה נגישה' }
    })

    await runCheck('rpc-admin', async () => {
      const { error } = await supabase.rpc('admin_get_all_profiles')
      if (error) return { status: 'fail', message: error.message }
      return { status: 'pass', message: 'הפונקציה מגיבה' }
    })

    setRunning(false)
  }

  const renderBadge = (status: HealthCheckStatus) => {
    switch (status) {
      case 'idle':
        return <span className={`${s.badge} ${s.badgeGray}`}>לא נבדק</span>
      case 'running':
        return (
          <span className={`${s.badge} ${s.badgeBlue}`}>
            <span className={s.spinner} style={{ width: 12, height: 12, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginLeft: 4 }} />
            בודק…
          </span>
        )
      case 'pass':
        return <span className={`${s.badge} ${s.badgeGreen}`}>✓ תקין</span>
      case 'warn':
        return <span className={`${s.badge} ${s.badgeAmber}`}>⚠ אזהרה</span>
      case 'fail':
        return <span className={`${s.badge} ${s.badgeRed}`}>✗ כשל</span>
    }
  }

  const summary = {
    pass: checks.filter(c => c.status === 'pass').length,
    fail: checks.filter(c => c.status === 'fail').length,
    warn: checks.filter(c => c.status === 'warn').length,
    total: checks.length,
  }

  return (
    <div>
      <div className={s.toolbar}>
        <div>
          <h2 className={s.toolbarTitle}>❤️ בדיקת תקינות מערכת</h2>
          <p className={s.toolbarSub}>
            סריקה של רכיבי תשתית קריטיים: DB, אחסון, טבלאות ו-RPC.
          </p>
        </div>
        <button
          className={s.btnPrimary}
          onClick={runAll}
          disabled={running}
        >
          {running ? (
            <>
              <span className={s.spinner} style={{ width: 16, height: 16, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle' }} />
              בודק…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              הרץ בדיקות
            </>
          )}
        </button>
      </div>

      {/* Summary */}
      {(summary.pass > 0 || summary.fail > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className={`${s.badge} ${s.badgeGreen}`}>✓ {summary.pass} תקינים</span>
          {summary.warn > 0 && (
            <span className={`${s.badge} ${s.badgeAmber}`}>⚠ {summary.warn} אזהרות</span>
          )}
          {summary.fail > 0 && (
            <span className={`${s.badge} ${s.badgeRed}`}>✗ {summary.fail} כשלונות</span>
          )}
          <span className={`${s.badge} ${s.badgeGray}`}>סה"כ {summary.total}</span>
        </div>
      )}

      {/* Check cards */}
      {checks.map(check => (
        <div key={check.id} className={s.checkCard}>
          <div className={s.checkInfo}>
            <div className={s.checkIconBox}>{ICON_MAP[check.icon]}</div>
            <div>
              <div className={s.checkLabel}>{check.label}</div>
              <div className={s.checkDesc}>{check.description}</div>
              {check.message && (
                <div
                  className={s.checkMessage}
                  style={{
                    color:
                      check.status === 'fail'
                        ? 'var(--red)'
                        : check.status === 'warn'
                          ? 'var(--amber)'
                          : 'var(--text3)',
                  }}
                >
                  {check.message}
                </div>
              )}
            </div>
          </div>
          <div className={s.checkResult}>
            {renderBadge(check.status)}
            {check.durationMs !== undefined && (
              <span className={s.checkTime}>{check.durationMs}ms</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
