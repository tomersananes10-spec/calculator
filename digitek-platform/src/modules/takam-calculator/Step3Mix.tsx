import { useState } from 'react'
import type { CalcState, CalcAction, Level } from './types'
import { ALL_LEVELS, LEVEL_LABELS, HOURS_PER_MONTH } from './data'
import { calcRoleMonthlyCost, fmtCurrency } from './calc'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

export function Step3Mix({ state, dispatch }: Props) {
  const [editingHours, setEditingHours] = useState<number | null>(null)
  const [editHoursVal, setEditHoursVal] = useState('')

  const totalMonthly = state.mix.reduce(
    (sum, m) => sum + calcRoleMonthlyCost(m, state.rolesData, state.hoursMultiplier),
    0
  )
  const HOURS_OPTIONS = [160, 176, 180, 200]
  const selectedHours = Math.round(state.hoursMultiplier * HOURS_PER_MONTH)

  function confirmCustomHours(i: number) {
    const v = parseInt(editHoursVal)
    dispatch({ type: 'SET_CUSTOM_HOURS', payload: { index: i, hours: v > 0 ? v : undefined } })
    setEditingHours(null)
  }

  if (state.mix.length === 0) {
    dispatch({ type: 'GO_STEP', payload: 2 })
    return null
  }

  return (
    <div>
      <div className={s.stepHeader}>
        <h2>הגדרת רמות ומשרות</h2>
        <p>קבע רמה וגודל משרה לכל תפקיד</p>
      </div>

      <div className={s.mixSummaryBar}>
        <div className={s.mixSummaryItem}>
          <span className={s.mixSummaryLabel}>עלות חודשית כוללת</span>
          <span className={s.mixSummaryValue}>{fmtCurrency(totalMonthly, true)}</span>
        </div>
        <div className={s.mixSummaryItem}>
          <span className={s.mixSummaryLabel}>שנתי (אומדן)</span>
          <span className={s.mixSummaryValue}>{fmtCurrency(totalMonthly * 12, true)}</span>
        </div>
        <div className={s.mixSummaryItem} style={{ minWidth: 200 }}>
          <span className={s.mixSummaryLabel}>שעות/חודש (משרה מלאה)</span>
          <span className={s.mixSummaryValue}>{selectedHours} שע׳</span>
          <input
            type="range"
            className={s.slider}
            min={120} max={250} step={1}
            value={selectedHours}
            onChange={e => dispatch({ type: 'SET_HOURS_MULTIPLIER', payload: Math.round((+e.target.value / HOURS_PER_MONTH) * 100) / 100 })}
            style={{ width: '100%', accentColor: 'rgba(255,255,255,0.7)', marginTop: 6 }}
          />
        </div>
      </div>

      {state.mix.map((m, i) => {
        const role = state.rolesData.find(r => r.id === m.id)
        if (!role) return null
        const monthly = calcRoleMonthlyCost(m, state.rolesData, state.hoursMultiplier)
        const rate = role.rates[m.level] ?? 0
        const baseHours = m.customHours ?? Math.round(HOURS_PER_MONTH * m.scope / 100)
        const hours = m.customHours ? baseHours : Math.round(baseHours * state.hoursMultiplier)

        return (
          <div key={m.id} className={s.mixRoleCard}>
            <div className={s.mixRoleHeader}>
              <span className={s.mixRoleName}>{role.name}</span>
              <button className={s.mixRemoveBtn} onClick={() => dispatch({ type: 'REMOVE_ROLE', payload: m.id })}>×</button>
            </div>

            <div className={s.levelBtns}>
              {ALL_LEVELS.map(lv => {
                const available = lv in role.rates
                return (
                  <button
                    key={lv}
                    className={`${s.levelBtn} ${m.level === lv ? s.levelBtnOn : ''} ${!available ? s.levelBtnDisabled : ''}`}
                    disabled={!available}
                    onClick={() => available && dispatch({ type: 'SET_LEVEL', payload: { index: i, level: lv as Level } })}
                  >
                    רמה {LEVEL_LABELS[lv]}
                  </button>
                )
              })}
            </div>

            <div className={s.scopeRow}>
              <input
                type="range" className={s.slider}
                min={10} max={100} step={10} value={m.scope}
                onChange={e => dispatch({ type: 'SET_SCOPE', payload: { index: i, scope: +e.target.value } })}
              />
              <span className={s.scopeVal}>{m.scope}%</span>
            </div>

            <div className={s.rateRow}>
              <div className={s.rateItem}>
                <span className={s.rateLabel}>תעריף שעתי</span>
                <span className={s.rateVal}>₪{rate}/שעה</span>
              </div>
              <div className={s.rateItem}>
                <span className={s.rateLabel}>שעות/חודש</span>
                {editingHours === i ? (
                  <div className={s.hoursEditRow}>
                    <input
                      type="number"
                      className={s.numInput}
                      style={{ width: 60 }}
                      value={editHoursVal}
                      onChange={e => setEditHoursVal(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmCustomHours(i)}
                      autoFocus
                    />
                    <button className={`${s.btn} ${s.btnPrimary}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => confirmCustomHours(i)}>✓</button>
                    <button className={s.btnBack} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { dispatch({ type: 'SET_CUSTOM_HOURS', payload: { index: i, hours: undefined } }); setEditingHours(null) }}>×</button>
                  </div>
                ) : (
                  <span className={s.rateVal}>
                    {hours} שע׳
                    {m.customHours && <span style={{ fontSize: 10, color: 'var(--amber)', marginRight: 4 }}>מותאם</span>}
                    <button className={s.editHoursBtn} onClick={() => { setEditingHours(i); setEditHoursVal(String(hours)) }}>✏️</button>
                  </span>
                )}
              </div>
              <div className={s.rateItem}>
                <span className={s.rateLabel}>עלות חודשית (כולל מע"מ)</span>
                <span className={s.rateVal}>{fmtCurrency(monthly, true)}</span>
              </div>
              <div className={s.rateItem}>
                <span className={s.rateLabel}>עלות שנתית (אומדן)</span>
                <span className={s.rateVal}>{fmtCurrency(monthly * 12, true)}</span>
              </div>
            </div>
          </div>
        )
      })}

      <div className={s.navRow}>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 2 })}>→ חזור</button>
        <span className={s.stepBadge}>שלב 3 מתוך 4</span>
        <div className={s.navSpacer} />
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => dispatch({ type: 'GO_STEP', payload: 4 })}>
          ראה תוצאות ←
        </button>
      </div>
    </div>
  )
}
