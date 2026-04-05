import { useState } from 'react'
import { clusters } from '../../data/clusters'
import type { Cluster, Specialization } from '../../data/clusters'

interface Props {
  onSelect: (cluster: Cluster, spec: Specialization) => void
  loading?: boolean
  onMyBriefs?: () => void
}

const CLUSTER_BG: Record<string, string> = {
  '1': '#fdf4ff', '2': '#eff6ff', '3': '#f0fdf4', '4': '#fff7ed',
  '5': '#fdf2f8', '6': '#f0fdfa', '7': '#fefce8', '8': '#f8fafc',
  '9': '#fef2f2', '10': '#f0f9ff', '11': '#fdf4ff', '12': '#f0fdf4',
}

function ClusterGrid({ list, selected, onSelect }: {
  list: Cluster[]
  selected: Cluster | null
  onSelect: (c: Cluster) => void
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: 7,
      marginBottom: 10,
    }}>
      {list.map(c => {
        const isSelected = selected?.id === c.id
        const isExpanded = expandedIds.has(c.id)
        const visibleSpecs = isExpanded ? c.specializations : c.specializations.slice(0, 2)
        const extraCount = c.specializations.length - 2

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            style={{
              background: 'var(--surface)',
              border: isSelected ? '1.5px solid var(--teal)' : '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 10px 30px',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: isSelected
                ? '0 0 0 3px rgba(13,148,136,0.15), 0 3px 10px rgba(13,148,136,0.1)'
                : '0 1px 3px rgba(0,0,0,0.05)',
              transform: isSelected ? 'translateY(-1px)' : undefined,
              transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: CLUSTER_BG[c.id] ?? '#f0fdfa', marginBottom: 6,
            }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', marginBottom: 5, lineHeight: 1.3 }}>{c.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {visibleSpecs.map(sp => (
                <span key={sp.id} style={{
                  fontSize: 9, fontWeight: 600,
                  background: '#f1f5f9', color: 'var(--text3)',
                  borderRadius: 20, padding: '1px 5px',
                  border: '1px solid var(--border)', lineHeight: 1.7,
                }}>
                  {sp.name}
                </span>
              ))}
              {extraCount > 0 && !isExpanded && (
                <span
                  onClick={e => toggleExpand(e, c.id)}
                  style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--teal)',
                    cursor: 'pointer', borderRadius: 20, padding: '1px 5px',
                    border: '1px solid var(--teal)', lineHeight: 1.7,
                    background: 'var(--teal-pale)', transition: 'all 0.15s',
                  }}
                >
                  +{extraCount}
                </span>
              )}
              {extraCount > 0 && isExpanded && (
                <span
                  onClick={e => toggleExpand(e, c.id)}
                  style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                    cursor: 'pointer', borderRadius: 20, padding: '1px 5px',
                    border: '1px solid var(--border)', lineHeight: 1.7,
                    background: '#f1f5f9', transition: 'all 0.15s',
                  }}
                >
                  {String.fromCharCode(9650)}
                </span>
              )}
            </div>
            {isSelected
              ? <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, fontWeight: 700, color: 'var(--teal)' }}>
                  נבחר ✓
                </div>
              : <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 13, color: 'var(--text3)' }}>←</div>
            }
          </div>
        )
      })}
    </div>
  )
}
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 7px' }}>{count} אשכולות</span>
    </div>
  )
}

export function NewBriefSelector({ onSelect, loading, onMyBriefs }: Props) {
  const [step, setStep] = useState<'cluster' | 'spec'>('cluster')
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<Specialization | null>(null)

  const digitalClusters = clusters.filter(c => c.type === 'digital')
  const techClusters = clusters.filter(c => c.type === 'tech')

  if (step === 'cluster') {
    return (
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 2px', letterSpacing: '-0.5px' }}>בריף חדש</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>שלב 1 מתוך 2 — בחר אשכול</p>
          </div>
          {onMyBriefs && (
            <button
              onClick={onMyBriefs}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--surface)', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '8px 16px',
                fontSize: 13, fontWeight: 700, color: 'var(--text2)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--teal)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)'
              }}
            >
              📄 הבריפים שלי
            </button>
          )}
        </div>
        <SectionHeader label="דיגיטל" count={digitalClusters.length} />
        <ClusterGrid list={digitalClusters} selected={selectedCluster} onSelect={setSelectedCluster} />
        <SectionHeader label="טכנולוגיה" count={techClusters.length} />
        <ClusterGrid list={techClusters} selected={selectedCluster} onSelect={setSelectedCluster} />
        {selectedCluster && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => setStep('spec')}
              style={{
                background: 'var(--teal)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 24px',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {selectedCluster.icon} {selectedCluster.name} —
              הבא ←
            </button>
          </div>
        )}
      </div>
    )
  }
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            {selectedCluster!.icon} {selectedCluster!.name}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>שלב 2 מתוך 2 — בחר התמחות</p>
        </div>
        <button
          onClick={() => { setStep('cluster'); setSelectedSpec(null) }}
          style={{ background: 'none', border: '1.5px solid var(--border2)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', fontFamily: 'inherit' }}
        >
          ← חזרה לאשכולות
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {selectedCluster!.specializations.map(sp => (
          <button
            key={sp.id}
            onClick={() => setSelectedSpec(sp)}
            style={{
              background: selectedSpec?.id === sp.id ? 'var(--teal-pale)' : 'var(--surface)',
              border: selectedSpec?.id === sp.id ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
              borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
              textAlign: 'right', fontFamily: 'inherit', transition: 'all 0.15s',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              boxShadow: selectedSpec?.id === sp.id ? '0 0 0 3px rgba(13,148,136,0.12)' : 'none',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
              border: selectedSpec?.id === sp.id ? '5px solid var(--teal)' : '2px solid var(--border2)',
              transition: 'all 0.15s',
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{sp.name}</div>
              {sp.description && (
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{sp.description}</div>
              )}
            </div>
          </button>
        ))}
      </div>
      {selectedSpec && (
        <button
          onClick={() => onSelect(selectedCluster!, selectedSpec)}
          disabled={loading}
          style={{
            background: 'var(--teal)', color: '#fff', border: 'none',
            borderRadius: 12, padding: '12px 28px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'יוצר בריף...' : 'התחל בריף ←'}
        </button>
      )}
    </div>
  )
}
