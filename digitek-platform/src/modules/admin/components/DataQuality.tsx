import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { DataQualityCheck, DQCheckStatus } from '../types'
import s from '../AdminPanel.module.css'

const STATUS_META: Record<DQCheckStatus, { label: string; cls: string }> = {
  pass: { label: 'תקין', cls: s.badgeGreen },
  fail: { label: 'נכשל', cls: s.badgeRed },
  warn: { label: 'אזהרה', cls: s.badgeAmber },
  error: { label: 'שגיאה', cls: s.badgeRed },
}

const LAYER_LABELS: Record<string, string> = {
  integrity: '🔗 שלמות',
  synthetic: '🤖 בדיקה סינתטית',
  sampling: '🎲 דגימה',
  security_config: '🔒 תצורת אבטחה',
  security_sampling: '🎲 דגימת בידוד',
}

export default function DataQuality() {
  const [checks, setChecks] = useState<DataQualityCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [layerFilter, setLayerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<DQCheckStatus | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadLatest = useCallback(async () => {
    setLoading(true)
    const { data: latest } = await supabase
      .from('data_quality_checks')
      .select('batch_id')
      .order('ran_at', { ascending: false })
      .limit(1)

    if (!latest || latest.length === 0) {
      setChecks([])
      setLoading(false)
      return
    }

    const bid = latest[0].batch_id as string
    const { data } = await supabase
      .from('data_quality_checks')
      .select('*')
      .eq('batch_id', bid)
      .order('layer')
      .order('check_name')

    setChecks((data as DataQualityCheck[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLatest()
  }, [loadLatest])

  const runNow = async () => {
    setRunning(true)
    try {
      await supabase.functions.invoke('data-quality-monitor', { body: {} })
      await loadLatest()
    } catch {
      // silently handle
    } finally {
      setRunning(false)
    }
  }

  const filtered = checks.filter(
    c =>
      (layerFilter === 'all' || c.layer === layerFilter) &&
      (statusFilter === 'all' || c.status === statusFilter),
  )

  const counts = {
    pass: checks.filter(c => c.status === 'pass').length,
    fail: checks.filter(c => c.status === 'fail').length,
    warn: checks.filter(c => c.status === 'warn').length,
    error: checks.filter(c => c.status === 'error').length,
  }

  const layers = [...new Set(checks.map(c => c.layer))]

  return (
    <div>
      <div className={s.toolbar}>
        <div>
          <h2 className={s.toolbarTitle}>🔍 איכות נתונים</h2>
          <p className={s.toolbarSub}>
            {checks.length > 0
              ? `סריקה אחרונה: ${new Date(checks[0].ran_at).toLocaleString('he-IL')}`
              : 'טרם בוצעה סריקה'}
          </p>
        </div>
        <div className={s.toolbarActions}>
          <button className={s.btnGhost} onClick={loadLatest} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            רענן
          </button>
          <button className={s.btnPrimary} onClick={runNow} disabled={running}>
            {running ? 'סורק...' : '▶ סרוק עכשיו'}
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className={s.kpiGrid}>
        {(['pass', 'fail', 'warn', 'error'] as DQCheckStatus[]).map(st => (
          <div key={st} className={s.kpiCard}>
            <div>
              <div className={s.kpiLabel}>{STATUS_META[st].label}</div>
              <div className={s.kpiValue}>{counts[st]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={s.filterBar}>
        <span className={s.filterLabel}>שכבה:</span>
        <button
          className={`${s.filterBtn} ${layerFilter === 'all' ? s.filterBtnActive : ''}`}
          onClick={() => setLayerFilter('all')}
        >
          הכל
        </button>
        {layers.map(l => (
          <button
            key={l}
            className={`${s.filterBtn} ${layerFilter === l ? s.filterBtnActive : ''}`}
            onClick={() => setLayerFilter(l)}
          >
            {LAYER_LABELS[l] || l}
          </button>
        ))}
        <span className={s.filterLabel} style={{ marginRight: 8 }}>סטטוס:</span>
        <button
          className={`${s.filterBtn} ${statusFilter === 'all' ? s.filterBtnActive : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          הכל
        </button>
        {(['pass', 'fail', 'warn', 'error'] as DQCheckStatus[]).map(st => (
          <button
            key={st}
            className={`${s.filterBtn} ${statusFilter === st ? s.filterBtnActive : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            {STATUS_META[st].label}
          </button>
        ))}
      </div>

      {/* Results table */}
      {loading ? (
        <div className={s.empty}>
          <div className={s.spinner} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={s.empty}>
          <span>אין תוצאות. לחץ "סרוק עכשיו" להפעלת סריקה ראשונה.</span>
        </div>
      ) : (
        <div className={s.card}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>בדיקה</th>
                  <th>שכבה</th>
                  <th>סטטוס</th>
                  <th>משתמש</th>
                  <th>משך</th>
                  <th>פרטים</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isOpen = expanded === c.id
                  return (
                    <tr key={c.id}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr
                              style={{ cursor: 'pointer' }}
                              onClick={() => setExpanded(isOpen ? null : c.id)}
                            >
                              <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                                {c.check_name}
                              </td>
                              <td style={{ padding: '10px 16px', fontSize: 12 }}>
                                {LAYER_LABELS[c.layer] || c.layer}
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span className={`${s.badge} ${STATUS_META[c.status].cls}`}>
                                  {STATUS_META[c.status].label}
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>
                                {c.target_user_id ? c.target_user_id.slice(0, 8) : '—'}
                              </td>
                              <td style={{ padding: '10px 16px', fontSize: 12 }}>
                                {c.duration_ms}ms
                              </td>
                              <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text3)' }}>
                                {isOpen ? 'סגור' : 'הצג'}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr className={s.expandRow}>
                                <td colSpan={6} style={{ padding: 0 }}>
                                  <div className={s.expandContent}>
                                    <div>
                                      <div className={s.expandLabel}>צפוי:</div>
                                      <pre className={s.expandPre}>
                                        {JSON.stringify(c.expected, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <div className={s.expandLabel}>בפועל:</div>
                                      <pre className={s.expandPre}>
                                        {JSON.stringify(c.actual, null, 2)}
                                      </pre>
                                    </div>
                                    {c.message && (
                                      <div className={s.expandFull}>
                                        <div className={s.expandLabel}>הודעה:</div>
                                        <p style={{ fontSize: 12 }}>{c.message}</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
