import { useRef } from 'react'
import type { CalcState, CalcAction } from './types'
import { LEVEL_LABELS, HOURS_PER_MONTH } from './data'
import { calcTotalCost, fmtCurrency } from './calc'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

const PERIOD_LABELS: Record<number, string> = { 6: '6 חודשים', 12: 'שנה', 24: 'שנתיים' }
const VAT_RATE = 0.17
const OVERHEAD_RATE = 0.10
const CONTINGENCY_RATE = 0.05

export function Step4Results({ state, dispatch }: Props) {
  const { mix, period, matchingOn, matchingPct, riskPct, rolesData, hoursMultiplier } = state
  const printRef = useRef<HTMLDivElement>(null)

  const { net: netManpower, matching, monthlyPerRole } = calcTotalCost(mix, period, matchingOn, matchingPct, rolesData, hoursMultiplier)
  const riskAmt      = Math.round(netManpower * riskPct / 100)
  const manpowerTotal = netManpower + riskAmt
  const overhead      = Math.round(manpowerTotal * OVERHEAD_RATE)
  const contingency   = Math.round((manpowerTotal + overhead) * CONTINGENCY_RATE)
  const subtotalPreVAT = manpowerTotal + overhead + contingency
  const vatAmt        = Math.round(subtotalPreVAT * VAT_RATE)
  const grandTotal    = subtotalPreVAT + vatAmt

  function shareURL() {
    const roles = mix.map(m => `${m.id}:${m.level}:${m.scope}`).join(',')
    const hash = `v1|period=${period}|matching=${matchingOn ? 1 : 0}|pct=${matchingPct}|roles=${roles}`
    location.hash = encodeURIComponent(hash)
    navigator.clipboard.writeText(location.href).catch(() => undefined)
  }

  async function downloadPDF() {
    if (!printRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2pdf = (await import('html2pdf.js' as any)).default
    html2pdf().set({
      margin: 10,
      filename: `takam-${state.project.name || 'report'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(printRef.current).save()
  }

  return (
    <div ref={printRef}>
      <div className={s.twoCol}>
        {/* ── LEFT: Input tables ── */}
        <div className={s.leftPanel}>
          {/* Manpower table */}
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>כוח אדם</span>
              <button className={s.editBtn} onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}>
                ✏️ ערוך
              </button>
            </div>
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>תפקיד</th>
                    <th>רמה</th>
                    <th>משרה</th>
                    <th>שעות/חודש</th>
                    <th>תעריף ₪/שעה</th>
                    <th>סה״כ ₪</th>
                  </tr>
                </thead>
                <tbody>
                  {mix.map((m, i) => {
                    const role = rolesData.find(r => r.id === m.id)
                    if (!role) return null
                    const rate  = role.rates[m.level] ?? 0
                    const base  = m.customHours ?? Math.round(HOURS_PER_MONTH * m.scope / 100)
                    const hours = m.customHours ? base : Math.round(base * hoursMultiplier)
                    const total = monthlyPerRole[i] * period
                    return (
                      <tr key={m.id}>
                        <td>{role.name}{role.custom && <span style={{ marginRight: 4, opacity: 0.6 }}>✱</span>}</td>
                        <td><span className={s.levelBadge}>{LEVEL_LABELS[m.level]}</span></td>
                        <td>{m.scope}%</td>
                        <td>{hours}</td>
                        <td>{rate.toLocaleString('he-IL')} ₪</td>
                        <td className={s.costCell}>{fmtCurrency(total, true)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {mix.length === 0 && (
              <p className={s.emptyMsg}>לא נוספו תפקידים. <button className={s.linkBtn} onClick={() => dispatch({ type: 'GO_STEP', payload: 2 })}>הוסף תפקיד ←</button></p>
            )}
          </div>

          {/* Matching + Risk controls */}
          <div className={s.panel}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>הגדרות חישוב</span>
            </div>
            <div className={s.controlsGrid}>
              <div className={s.controlItem}>
                <label className={s.controlLabel}>מאצ'ינג מהמערך</label>
                <div className={s.controlRow}>
                  <button
                    className={`${s.sw} ${matchingOn ? s.swOn : ''}`}
                    onClick={() => dispatch({ type: 'TOGGLE_MATCHING' })}
                    aria-label="toggle matching"
                  />
                  {matchingOn && (
                    <input
                      type="number"
                      className={s.numInput}
                      min={1} max={100}
                      value={matchingPct}
                      onChange={e => dispatch({ type: 'SET_MATCHING_PCT', payload: Math.min(100, Math.max(1, +e.target.value || 30)) })}
                    />
                  )}
                  {matchingOn && <span className={s.unit}>%</span>}
                </div>
              </div>
              <div className={s.controlItem}>
                <label className={s.controlLabel}>תוספת סיכון: {riskPct}%</label>
                <input
                  type="range"
                  min={0} max={50} step={1}
                  value={riskPct}
                  onChange={e => dispatch({ type: 'SET_RISK_PCT', payload: +e.target.value })}
                  style={{ accentColor: 'var(--amber)', width: '100%' }}
                />
              </div>
              <div className={s.controlItem}>
                <label className={s.controlLabel}>תקופה</label>
                <div className={s.seg}>
                  {([6, 12, 24] as const).map(p => (
                    <button
                      key={p}
                      className={`${s.segBtn} ${period === p ? s.segBtnActive : ''}`}
                      onClick={() => dispatch({ type: 'SET_PERIOD', payload: p })}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Cost Summary ── */}
        <div className={s.rightPanel}>
          <div className={s.summaryCard}>
            <div className={s.summaryTitle}>עלות כוללת לפרויקט</div>
            <div className={s.summaryGrand}>{fmtCurrency(grandTotal)}</div>

            <div className={s.summaryBreakdown}>
              <div className={s.summaryRow}>
                <span>כוח אדם (נטו)</span>
                <span>{fmtCurrency(manpowerTotal, true)}</span>
              </div>
              {matchingOn && (
                <div className={s.summaryRow} style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span>חיסכון מאצ'ינג מהמערך {matchingPct}%</span>
                  <span>−{fmtCurrency(matching, true)}</span>
                </div>
              )}
              {riskPct > 0 && (
                <div className={s.summaryRow} style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span>סיכון {riskPct}%</span>
                  <span>+{fmtCurrency(riskAmt, true)}</span>
                </div>
              )}
              <div className={s.summaryRow}>
                <span>תקורה ({Math.round(OVERHEAD_RATE * 100)}%)</span>
                <span>{fmtCurrency(overhead, true)}</span>
              </div>
              <div className={s.summaryRow}>
                <span>מרווח ({Math.round(CONTINGENCY_RATE * 100)}%)</span>
                <span>{fmtCurrency(contingency, true)}</span>
              </div>
            </div>

            <div className={s.summaryDivider} />

            <div className={s.summaryVAT}>
              <span>מע"מ 17%</span>
              <span>{fmtCurrency(vatAmt, true)}</span>
            </div>
            <div className={s.summaryTotal}>
              <span>סה״כ כולל מע"מ</span>
              <span>{fmtCurrency(grandTotal, true)}</span>
            </div>

            <div className={s.summaryActions}>
              <button className={s.summaryBtn} onClick={downloadPDF}>📥 ייצוא PDF</button>
              <button className={s.summaryBtnGhost} onClick={shareURL}>🔗 שתף</button>
              <button className={s.summaryBtnGhost} onClick={() => dispatch({ type: 'RESET' })}>🔄 איפוס</button>
            </div>
          </div>

          {/* Period comparison */}
          <div className={s.panel} style={{ marginTop: 16 }}>
            <div className={s.panelHeader}>
              <span className={s.panelTitle}>השוואת תקופות</span>
            </div>
            {([6, 12, 24] as const).map(p => {
              const { net: n } = calcTotalCost(mix, p, matchingOn, matchingPct, rolesData, hoursMultiplier)
              const ra = Math.round(n * riskPct / 100)
              const oh = Math.round((n + ra) * OVERHEAD_RATE)
              const cg = Math.round((n + ra + oh) * CONTINGENCY_RATE)
              const sp = n + ra + oh + cg
              const vt = Math.round(sp * VAT_RATE)
              const total = sp + vt
              return (
                <div key={p} className={`${s.periodRow} ${p === period ? s.periodRowActive : ''}`}
                  onClick={() => dispatch({ type: 'SET_PERIOD', payload: p })}>
                  <span className={s.periodLabel}>{PERIOD_LABELS[p]}</span>
                  <span className={s.periodVal}>{fmtCurrency(total, true)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Back button */}
      <div style={{ marginTop: 16 }}>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 3 })}>→ חזור לעריכה</button>
      </div>
    </div>
  )
}
