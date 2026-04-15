import { useState } from 'react'
import styles from './StubPage.module.css'

const SUPPLIERS = [
  { name: 'מטריקס IT', regNum: '51-234567-8', clusters: ['דאטה', 'אנליטיקה', 'תשתיות'], rating: 4.7, projects: 12, people: 48 },
  { name: 'Accenture Israel', regNum: '51-345678-9', clusters: ['חדשנות', 'ענן', 'AI'], rating: 4.5, projects: 8, people: 35 },
  { name: 'אלביט מערכות', regNum: '51-456789-0', clusters: ['אבטחה', 'תשתיות'], rating: 4.8, projects: 15, people: 62 },
  { name: 'Amdocs', regNum: '51-567890-1', clusters: ['CRM', 'אינטגרציה'], rating: 4.3, projects: 6, people: 28 },
  { name: 'מגדל טכנולוגיות', regNum: '51-678901-2', clusters: ['BI', 'דאטה'], rating: 4.6, projects: 9, people: 31 },
  { name: 'רד-האט ישראל', regNum: '51-789012-3', clusters: ['ענן', 'DevOps', 'תשתיות'], rating: 4.9, projects: 11, people: 19 },
]

export function SuppliersPage() {
  const [search, setSearch] = useState('')

  const filtered = SUPPLIERS.filter(s =>
    !search || s.name.includes(search) || s.clusters.some(c => c.includes(search))
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>ניהול ספקים</h1>
        <p className={styles.sub}>{SUPPLIERS.length} ספקים מוסמכים</p>
      </div>

      <input
        className={styles.searchInput}
        type="text"
        placeholder="חיפוש ספק לפי שם, אשכול..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 24, width: 340 }}
      />

      <div className={styles.supplierGrid}>
        {filtered.map(s => (
          <div key={s.name} className={styles.supplierCard}>
            <div className={styles.supplierAvatar}>{s.name[0]}</div>
            <div className={styles.supplierInfo}>
              <div className={styles.supplierName}>{s.name}</div>
              <div className={styles.supplierReg}>{s.regNum}</div>
            </div>
            <span className={styles.activeBadge}>פעיל</span>
            <div className={styles.supplierClusters}>
              {s.clusters.map(c => <span key={c} className={styles.clusterTag}>{c}</span>)}
            </div>
            <div className={styles.supplierStats}>
              <span>⭐ {s.rating}</span>
              <span>· {s.projects} פרויקטים</span>
              <span>· {s.people} אנשים</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.comingSoonNote}>
        ניהול מלא של ספקים, מכרזים והגשות — בקרוב
      </div>
    </div>
  )
}
