import { useState } from 'react'
import { clusters } from '../../data/clusters'
import type { Cluster, Specialization } from '../../data/clusters'

interface Props {
  onSelect: (cluster: Cluster, spec: Specialization) => void
  onCancel: () => void
  loading?: boolean
}

export function NewBriefSelector({ onSelect, onCancel, loading }: Props) {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<Specialization | null>(null)

  const digitalClusters = clusters.filter(c => c.type === 'digital')
  const techClusters = clusters.filter(c => c.type === 'tech')

  function handleClusterClick(c: Cluster) {
    setSelectedCluster(c)
    setSelectedSpec(null)
  }

  function handleStart() {
    if (selectedCluster && selectedSpec) onSelect(selectedCluster, selectedSpec)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>בריף חדש</h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>בחר אשכול והתמחות כדי להתחיל</p>
        </div>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: '1.5px solid var(--border2)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)', fontFamily: 'inherit' }}
        >
          ← חזרה
        </button>
      </div>

      {/* Step 1: Cluster */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16 }}>
          שלב 1 — בחר אשכול
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 10 }}>דיגיטל</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
          {digitalClusters.map(c => (
            <ClusterCard key={c.id} cluster={c} selected={selectedCluster?.id === c.id} onClick={() => handleClusterClick(c)} />
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', marginBottom: 10 }}>טכנולוגיה</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {techClusters.map(c => (
            <ClusterCard key={c.id} cluster={c} selected={selectedCluster?.id === c.id} onClick={() => handleClusterClick(c)} />
          ))}
        </div>
      </div>

      {/* Step 2: Specialization */}
      {selectedCluster && (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--teal)', borderRadius: 16, padding: '24px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16 }}>
            שלב 2 — בחר התמחות עבור {selectedCluster.icon} {selectedCluster.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedCluster.specializations.map(sp => (
              <button
                key={sp.id}
                onClick={() => setSelectedSpec(sp)}
                style={{
                  background: selectedSpec?.id === sp.id ? 'var(--teal-pale)' : 'var(--bg)',
                  border: selectedSpec?.id === sp.id ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
                  borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
                  textAlign: 'right', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  boxShadow: selectedSpec?.id === sp.id ? '0 0 0 3px rgba(0,164,153,0.12)' : 'none',
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
        </div>
      )}

      {/* Start button */}
      {selectedCluster && selectedSpec && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={handleStart}
            disabled={loading}
            style={{
              background: 'var(--teal)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '14px 36px',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'יוצר בריף...' : 'התחל בריף →'}
          </button>
        </div>
      )}
    </div>
  )
}

function ClusterCard({ cluster, selected, onClick }: { cluster: Cluster; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? 'var(--teal-pale)' : 'var(--bg)',
        border: selected ? '1.5px solid var(--teal)' : '1.5px solid var(--border)',
        borderRadius: 10, padding: '14px 12px', cursor: 'pointer',
        textAlign: 'center', fontFamily: 'inherit',
        transition: 'all 0.15s',
        boxShadow: selected ? '0 0 0 3px rgba(0,164,153,0.12)' : 'none',
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 6 }}>{cluster.icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{cluster.name}</div>
    </button>
  )
}
