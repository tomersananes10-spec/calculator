/* Shared mock data + rendering for the AI/ML live-total mockups */
const ITEMS = [
  { id: 'spec', icon: '📄', name: 'מסמך אפיון מפורט', prices: { small: 40000, medium: 70000, large: 90000 } },
  { id: 'ml', icon: '🤖', name: 'למידת מכונה (ML)', prices: { small: 100000, medium: 150000, large: 200000 } },
  { id: 'nlp', icon: '💬', name: 'עיבוד שפה טבעית (NLP)', prices: { small: 90000, medium: 120000, large: 160000 } },
  { id: 'llm', icon: '🧠', name: 'עיבוד וניתוח מידע (LLM + RAG)', prices: { small: 140000, medium: 220000, large: 300000 } },
]
const SIZE_LABELS = { small: 'קטן', medium: 'בינוני', large: 'גדול' }
const state = {}
ITEMS.forEach(it => { state[it.id] = { small: { b: 0, e: 0 }, medium: { b: it.id === 'spec' || it.id === 'ml' ? 1 : 0, e: 0 }, large: { b: it.id === 'nlp' ? 1 : 0, e: 0 } } })

function fmt(n) { return '₪ ' + Math.round(n).toLocaleString('he-IL') }

function totals() {
  let sum = 0, units = 0
  ITEMS.forEach(it => {
    Object.keys(it.prices).forEach(sz => {
      const q = state[it.id][sz]
      sum += (q.b + q.e) * it.prices[sz]
      units += q.b + q.e
    })
  })
  return { sum, units, vat: sum * 0.18 }
}

function stepperHtml(id, sz, field) {
  const v = state[id][sz][field === 'b' ? 'b' : 'e']
  return `<div class="stp">
    <button onclick="bump('${id}','${sz}','${field}',-1)" ${v === 0 ? 'disabled' : ''}>−</button>
    <span class="stpVal">${v}</span>
    <button onclick="bump('${id}','${sz}','${field}',1)">+</button>
  </div>`
}

function renderCards(mount) {
  mount.innerHTML = ITEMS.map(it => `
    <div class="card">
      <div class="cardHead"><span>${it.icon} ${it.name}</span></div>
      <div class="hdrRow"><span></span><span>כמות בסיס</span><span>כמות נוספת</span><span>סה"כ</span></div>
      ${Object.keys(it.prices).map(sz => {
        const q = state[it.id][sz]; const t = (q.b + q.e) * it.prices[sz]
        return `<div class="szRow ${q.b + q.e > 0 ? 'on' : ''}">
          <div class="szInfo"><b>${SIZE_LABELS[sz]}</b><small>${fmt(it.prices[sz])} / יח'</small></div>
          ${stepperHtml(it.id, sz, 'b')}
          ${stepperHtml(it.id, sz, 'e')}
          <span class="szTot">${t > 0 ? fmt(t) : '—'}</span>
        </div>`
      }).join('')}
    </div>`).join('')
}

function bump(id, sz, field, d) {
  const q = state[id][sz]
  if (field === 'b') q.b = Math.max(0, q.b + d); else q.e = Math.max(0, q.e + d)
  renderCards(document.getElementById('cards'))
  window.onTotalsChange && window.onTotalsChange(totals())
}
