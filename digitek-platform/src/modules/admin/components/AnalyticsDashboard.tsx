import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AdminProfile } from '../types'
import s from '../AdminPanel.module.css'

interface Props {
  profiles: AdminProfile[]
}

type TimeRange = 7 | 30 | 90

export default function AnalyticsDashboard({ profiles }: Props) {
  const [range, setRange] = useState<TimeRange>(30)

  const now = Date.now()
  const rangeMs = range * 86400000

  const stats = useMemo(() => {
    const totalUsers = profiles.length
    const adminCount = profiles.filter(p => p.is_admin).length
    const newUsers = profiles.filter(
      p => now - new Date(p.created_at).getTime() < rangeMs,
    ).length
    const activeUsers = profiles.filter(p => {
      if (!p.last_sign_in_at) return false
      return now - new Date(p.last_sign_in_at).getTime() < rangeMs
    }).length
    const totalCalcs = profiles.reduce(
      (sum, p) => sum + p.calculation_count,
      0,
    )
    const totalBriefs = profiles.reduce((sum, p) => sum + p.brief_count, 0)
    const neverLoggedIn = profiles.filter(p => !p.last_sign_in_at).length

    return {
      totalUsers,
      adminCount,
      newUsers,
      activeUsers,
      totalCalcs,
      totalBriefs,
      neverLoggedIn,
      stickiness:
        totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    }
  }, [profiles, rangeMs, now])

  const growthData = useMemo(() => {
    const days: { date: string; count: number }[] = []
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000)
      const dateStr = d.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
      })
      const cutoff = d.getTime() + 86400000
      const count = profiles.filter(
        p => new Date(p.created_at).getTime() < cutoff,
      ).length
      days.push({ date: dateStr, count })
    }
    return days
  }, [profiles, range, now])

  const kpis = [
    {
      label: 'סה"כ משתמשים',
      value: stats.totalUsers,
      bg: 'var(--primary-bg)',
      color: 'var(--primary)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
    {
      label: 'פעילים',
      value: stats.activeUsers,
      sub: `מתוך ${stats.totalUsers}`,
      bg: 'var(--green-bg)',
      color: 'var(--green)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      label: `חדשים (${range} ימים)`,
      value: stats.newUsers,
      bg: 'var(--primary-bg)',
      color: 'var(--primary)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M20 8v6M23 11h-6" />
        </svg>
      ),
    },
    {
      label: 'חישובי תכ"ם',
      value: stats.totalCalcs,
      bg: 'var(--amber-bg)',
      color: 'var(--amber)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M8 6h8M8 10h8M8 14h4" />
        </svg>
      ),
    },
    {
      label: 'בריפים',
      value: stats.totalBriefs,
      bg: 'var(--green-bg)',
      color: 'var(--green)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      ),
    },
    {
      label: 'דביקות',
      value: `${stats.stickiness}%`,
      sub: 'אחוז פעילים',
      bg: stats.stickiness > 30 ? 'var(--green-bg)' : 'var(--red-bg)',
      color: stats.stickiness > 30 ? 'var(--green)' : 'var(--red)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stats.stickiness > 30 ? 'var(--green)' : 'var(--red)'} strokeWidth="2">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      {/* Time range */}
      <div className={s.toolbar}>
        <div>
          <h2 className={s.toolbarTitle}>📊 לוח בקרה אנליטי</h2>
          <p className={s.toolbarSub}>
            {stats.totalUsers} משתמשים • {stats.adminCount} מנהלים •{' '}
            {stats.neverLoggedIn} מעולם לא התחברו
          </p>
        </div>
        <div className={s.rangeSelector}>
          {([7, 30, 90] as TimeRange[]).map(r => (
            <button
              key={r}
              className={`${s.rangeBtn} ${range === r ? s.rangeBtnActive : ''}`}
              onClick={() => setRange(r)}
            >
              {r} ימים
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiGrid}>
        {kpis.map(kpi => (
          <div key={kpi.label} className={s.kpiCard}>
            <div className={s.kpiIcon} style={{ background: kpi.bg }}>
              {kpi.icon}
            </div>
            <div>
              <div className={s.kpiLabel}>{kpi.label}</div>
              <div className={s.kpiValue} style={{ color: kpi.color }}>
                {kpi.value}
              </div>
              {kpi.sub && <div className={s.kpiSub}>{kpi.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <div className={s.chartCard}>
        <h3 className={s.chartTitle}>צמיחת משתמשים</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={growthData}>
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text3)' }}
              interval={Math.max(Math.floor(growthData.length / 8), 0)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text3)' }}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 13,
                direction: 'rtl',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="משתמשים"
              stroke="var(--primary)"
              fill="url(#growthFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
