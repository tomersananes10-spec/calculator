import { useState } from 'react'
import type { CalcState, CalcAction, Role } from './types'
import { CATS, CAT_ICONS } from './data'
import s from './TakamCalculator.module.css'

interface Props {
  state: CalcState
  dispatch: React.Dispatch<CalcAction>
}

interface TooltipState { visible: boolean; text: string; x: number; y: number }

function getRateRange(role: Role): string {
  const vals = Object.values(role.rates).filter(Boolean) as number[]
  if (!vals.length) return ''
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return min === max ? `₪${min}/שע׳` : `₪${min}–${max}/שע׳`
}

export function Step2Roles({ state, dispatch }: Props) {
  const [activeCat, setActiveCat] = useState('הכל')
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 })
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCat, setCustomCat] = useState('פיתוח')
  const [customRates, setCustomRates] = useState({ a: '', b: '', c: '', d: '' })

  const filtered = state.rolesData.filter(r =>
    activeCat === 'הכל' || r.cat === activeCat
  )

  function showInfo(e: React.MouseEvent, role: Role) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({ visible: true, text: role.desc, x: rect.left, y: rect.bottom + 6 })
  }

  function hideInfo() {
    setTooltip(t => ({ ...t, visible: false }))
  }

  function addCustomRole() {
    if (!customName.trim()) return
    const rates: Partial<Record<string, number>> = {}
    if (customRates.a && +customRates.a > 0) rates['a'] = +customRates.a
    if (customRates.b && +customRates.b > 0) rates['b'] = +customRates.b
    if (customRates.c && +customRates.c > 0) rates['c'] = +customRates.c
    if (customRates.d && +customRates.d > 0) rates['d'] = +customRates.d
    if (!Object.keys(rates).length) return

    const id = 'custom-' + Date.now()
    const newRole: Role = {
      id, name: customName.trim(), cat: customCat,
      rates: rates as Role['rates'],
      desc: 'תפקיד מותאם אישית — אינו חלק מהוראת התכ"ם',
      custom: true,
    }
    dispatch({ type: 'ADD_CUSTOM_ROLE', payload: newRole })
    dispatch({ type: 'TOGGLE_ROLE', payload: id })
    setCustomName(''); setCustomRates({ a:'',b:'',c:'',d:'' }); setShowCustomForm(false)
  }

  function proceed() {
    if (state.mix.length === 0) return
    dispatch({ type: 'GO_STEP', payload: 3 })
  }

  return (
    <div onClick={hideInfo}>
      <div className={s.stepHeader}>
        <h2>בחירת תפקידים</h2>
        <p>בחר את התפקידים הרלוונטיים לפרויקט שלך</p>
      </div>

      <div className={s.catPillsRow}>
        {CATS.map(c => (
          <button
            key={c}
            className={`${s.catPill} ${activeCat === c ? s.catPillOn : ''}`}
            onClick={() => setActiveCat(c)}
          >
            {CAT_ICONS[c] ? `${CAT_ICONS[c]} ` : ''}{c}
          </button>
        ))}
      </div>

      <div className={s.rolesGrid}>
        {filtered.map(role => {
          const isSelected = state.selectedIds.has(role.id)
          return (
            <div
              key={role.id}
              className={`${s.roleCard} ${isSelected ? s.roleCardSelected : ''}`}
              onClick={() => dispatch({ type: 'TOGGLE_ROLE', payload: role.id })}
            >
              <div className={s.roleCardTop}>
                <div className={s.roleCheckbox}>{isSelected ? '✓' : ''}</div>
                <span className={s.roleName}>{role.name}</span>
                <button
                  className={s.roleInfoBtn}
                  onClick={e => showInfo(e, role)}
                  tabIndex={-1}
                >i</button>
              </div>
              <div className={s.roleCat}>{CAT_ICONS[role.cat] || ''} {role.cat}</div>
              <div className={s.rolePriceRange}>{getRateRange(role)}</div>
            </div>
          )
        })}
      </div>

      <div className={s.customRoleWrap}>
        <button className={s.customRoleToggleBtn} onClick={() => setShowCustomForm(v => !v)}>
          + הוסף תפקיד מותאם אישית
        </button>
        {showCustomForm && (
          <div className={s.customRoleForm}>
            <div className={s.field}>
              <label className={s.fieldLabel}>שם התפקיד</label>
              <input className={s.input} value={customName} onChange={e => setCustomName(e.target.value)} placeholder="לדוגמה: מנהל תוכן" />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>קטגוריה</label>
              <select className={s.input} value={customCat} onChange={e => setCustomCat(e.target.value)}>
                {CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel}>תעריפים לשעה (₪) — מלא לפחות רמה אחת</label>
              <div className={s.ratesGrid}>
                {(['a','b','c','d'] as const).map(lv => (
                  <div key={lv} className={s.rateField}>
                    <label className={s.rateFieldLabel}>רמה {lv.toUpperCase()}</label>
                    <input
                      type="number"
                      className={s.input}
                      placeholder="₪/שעה"
                      value={customRates[lv]}
                      onChange={e => setCustomRates(r => ({ ...r, [lv]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={addCustomRole}>הוסף תפקיד</button>
          </div>
        )}
      </div>

      {tooltip.visible && (
        <div
          className={s.infoTooltip}
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.text}
        </div>
      )}

      <div className={s.navRow}>
        <button className={s.btnBack} onClick={() => dispatch({ type: 'GO_STEP', payload: 1 })}>→ חזור</button>
        <span className={s.stepBadge}>שלב 2 מתוך 4</span>
        <div className={s.navSpacer} />
        {state.mix.length > 0 && (
          <div className={s.selectedBar} style={{ position:'static', borderRadius: 10, margin: 0 }}>
            <span className={s.selectedBarText}>{state.mix.length} תפקידים נבחרו</span>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={proceed}>
              הגדרת רמות ←
            </button>
          </div>
        )}
        {state.mix.length === 0 && (
          <button className={`${s.btn} ${s.btnPrimary}`} disabled>בחר לפחות תפקיד אחד</button>
        )}
      </div>
    </div>
  )
}
