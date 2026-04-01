import type { CalcState, CalcAction } from './types'
import { TEAL_SHADES, LEVEL_LABELS, HOURS_PER_MONTH } from './data'
import { calcTotalCost, fmtCurrency } from './calc'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }

function showToast(msg: string) {
  let t = document.getElementById('calcToast') as HTMLDivElement | null
  if (!t) {
    t = document.createElement('div')
    t.id = 'calcToast'
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--navy);color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:999;opacity:0;transition:all 0.25s;pointer-events:none'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.style.opacity = '1'
  t.style.transform = 'translateX(-50%) translateY(0)'
  setTimeout(() => {
    if (t) { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)' }
  }, 2500)
}

export function Step4Results({ state, dispatch }: Props) {
  const { mix, period, matchingOn, matchingPct, riskPct, rolesData, hoursMultiplier } = state

  const { matching, net, monthlyPerRole } = calcTotalCost(mix, period, matchingOn, matchingPct, rolesData, hoursMultiplier)
  const riskAmt = Math.round(net * riskPct / 100)
  const totalWithRisk = net + riskAmt
  const totalAnnual = monthlyPerRole.reduce((s, v) => s + v, 0) * 12
  const maxAnnual = Math.max(...monthlyPerRole.map(v => v * 12), 1)

  function shareURL() {
    const roles = mix.map(m => `${m.id}:${m.level}:${m.scope}`).join(',')
    const hash = `v1|period=${period}|matching=${matchingOn ? 1 : 0}|pct=${matchingPct}|roles=${roles}`
    location.hash = encodeURIComponent(hash)
    navigator.clipboard.writeText(location.href).then(
      () => showToast('קישור הועתק ללוח ✓'),
      () => showToast('העתק את הכתובת מסרגל הכתובות')
    )
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>תוצאות החישוב</h2>
        <p>{mix.length} תפקידים · {PERIOD_LABELS[period]} · תעריף גג{matchingOn ? ` · מאצ'ינג ${matchingPct}%` : ''}</p>
      </div>

      {/* KPI Row */}
      <div className={s.kpiRow}>
        {([6, 12, 24] as const).map(p => {
          const { net: n } = calcTotalCost(mix, p, matchingOn, matchingPct, rolesData, hoursMultiplier)
          const ra = Math.round(n * riskPct / 100)
          const total = n + ra
          const isHL = p === period
          return (
            <div key={p} className={`${s.kpi} ${isHL ? s.kpiHighlighted : ''}`}>
              <div className={s.kpiPeriod}>{PERIOD_LABELS[p]}</div>
              <div className={s.kpiTotal}>{fmtCurrency(total, true)}</div>
              <div className={s.kpiLabel}>כולל {riskPct}% סיכון</div>
              {riskPct > 0 && <div className={s.kpiGross}>בסיס: {fmtCurrency(n, true)}</div>}
              {matchingOn && <div className={s.kpiGross}>ברוטו: {fmtCurrency(calcTotalCost(mix, p, false, 0, rolesData, hoursMultiplier).gross, true)}</div>}
            </div>
          )
        })}
      </div>

      {/* Matching note */}
      {matchingOn && (
        <div className={s.matchingNote}>
          ✅ מאצ'ינג {matchingPct}% — חיסכון של {fmtCurrency(matching, true)} לתקופה הנבחרת
        </div>
      )}

      {/* Risk box */}
      <div className={s.riskBox}>
        <div className={s.riskHeader}>
          <span className={s.riskTitle}>רזרבה לסיכון</span>
          <span className={`${s.riskBadge} ${riskPct === 0 ? s.riskBadgeZero : ''}`}>{riskPct}%</span>
        </div>
        <input
          type="range"
          className={s.slider}
          min={0} max={50} step={1}
          value={riskPct}
          onChange={e => dispatch({ type: 'SET_RISK_PCT', payload: +e.target.value })}
          style={{ width: '100%', accentColor: 'var(--amber)' }}
        />
        <div className={s.riskTotals}>
          {riskPct === 0 ? (
            <div className={s.riskTotalItem}>
              <span className={s.riskTotalLabel}>עלות כוללת ({PERIOD_LABELS[period]})</span>
              <span className={`${s.riskTotalVal} ${s.riskTotalValHighlight}`}>{fmtCurrency(net, true)}</span>
            </div>
          ) : (
            <>
              <div className={s.riskTotalItem}>
                <span className={s.riskTotalLabel}>עלות בסיס ({PERIOD_LABELS[period]})</span>
                <span className={s.riskTotalVal}>{fmtCurrency(net, true)}</span>
              </div>
              <div className={s.riskTotalItem}>
                <span className={s.riskTotalLabel}>תוספת סיכון {riskPct}%</span>
                <span className={s.riskTotalVal} style={{ color: 'var(--amber)' }}>+{fmtCurrency(riskAmt, true)}</span>
              </div>
              <div className={s.riskTotalItem}>
                <span className={s.riskTotalLabel}>סה"כ כולל סיכון</span>
                <span className={`${s.riskTotalVal} ${s.riskTotalValHighlight}`}>{fmtCurrency(totalWithRisk, true)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div className={s.resultsGrid}>
        <div className={s.cardBox}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>פירוט לפי תפקיד</div>
          <table className={s.breakdownTable}>
            <thead>
              <tr>
                <th>תפקיד</th>
                <th style={{ textAlign: 'center' }}>רמה</th>
                <th style={{ textAlign: 'center' }}>משרה</th>
                <th style={{ textAlign: 'center' }}>שעות/חודש</th>
                <th style={{ textAlign: 'left' }}>שנתי</th>
              </tr>
            </thead>
            <tbody>
              {mix.map((m, i) => {
                const role = rolesData.find(r => r.id === m.id)
                if (!role) return null
                const annual = monthlyPerRole[i] * 12
                const base = m.customHours ?? Math.round(HOURS_PER_MONTH * m.scope / 100)
                const hours = m.customHours ? base : Math.round(base * hoursMultiplier)
                return (
                  <tr key={m.id} className={role.custom ? s.customRowHighlight : ''}>
                    <td>{role.name}{role.custom && <span title="תפקיד מותאם אישית" style={{ marginRight: 4 }}>⚠️</span>}</td>
                    <td style={{ textAlign: 'center' }}>{LEVEL_LABELS[m.level]}</td>
                    <td style={{ textAlign: 'center' }}>{m.scope}%</td>
                    <td style={{ textAlign: 'center' }}>{hours}</td>
                    <td className={s.costVal}>{fmtCurrency(annual, true)}</td>
                  </tr>
                )
              })}
              <tr className={s.totalRow}>
                <td colSpan={4}>סה"כ ברוטו שנתי</td>
                <td className={s.costVal}>{fmtCurrency(totalAnnual, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={s.cardBox}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>חלוקה גרפית (שנתי)</div>
          <div className={s.barChart}>
            {mix.map((m, i) => {
              const role = rolesData.find(r => r.id === m.id)
              if (!role) return null
              const annual = monthlyPerRole[i] * 12
              const pct = Math.round(annual / maxAnnual * 100)
              return (
                <div key={m.id} className={s.barRow}>
                  <div className={s.barName} title={role.name}>{role.name}</div>
                  <div className={s.barTrack}>
                    <div className={s.barFill} style={{ width: pct + '%', background: TEAL_SHADES[i % TEAL_SHADES.length] }} />
                  </div>
                  <div className={s.barVal}>{fmtCurrency(annual, true)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={s.actionsRow}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => window.print()}>🖨️ הדפס</button>
        <button className={s.btnBack} onClick={shareURL}>🔗 שתף קישור</button>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'RESET' })}>🔄 איפוס</button>
      </div>

      <div className={s.navRow}>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}>→ חזור לעריכה</button>
        <span className={s.stepBadge}>שלב 4 מתוך 4</span>
      </div>
    </div>
  )
}
