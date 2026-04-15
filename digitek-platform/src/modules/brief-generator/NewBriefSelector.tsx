import { useState } from 'react'
import { clusters } from '../../data/clusters'
import type { Cluster, Specialization } from '../../data/clusters'

interface Props {
  onSelect: (cluster: Cluster, spec: Specialization) => void
  loading?: boolean
  onMyBriefs?: () => void
}

const CLUSTER_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  '1':  { bg: '#fdf4ff', border: '#e9d5ff', icon: '#a855f7' },
  '2':  { bg: '#eff6ff', border: '#bfdbfe', icon: '#3b82f6' },
  '3':  { bg: '#f0fdf4', border: '#bbf7d0', icon: '#22c55e' },
  '4':  { bg: '#fff7ed', border: '#fed7aa', icon: '#f97316' },
  '5':  { bg: '#fdf2f8', border: '#fbcfe8', icon: '#ec4899' },
  '6':  { bg: '#f0fdfa', border: '#99f6e4', icon: '#14b8a6' },
  '7':  { bg: '#fefce8', border: '#fde68a', icon: '#eab308' },
  '8':  { bg: '#f8fafc', border: '#e2e8f0', icon: '#64748b' },
  '9':  { bg: '#fef2f2', border: '#fecaca', icon: '#ef4444' },
  '10': { bg: '#f0f9ff', border: '#bae6fd', icon: '#0ea5e9' },
  '11': { bg: '#fdf4ff', border: '#e9d5ff', icon: '#a855f7' },
  '12': { bg: '#f0fdf4', border: '#bbf7d0', icon: '#22c55e' },
}

const COLLAPSED_LIMIT = 3

function ClusterTile({
  cluster,
  onSelect,
  loading,
}: {
  cluster: Cluster
  onSelect: (cluster: Cluster, spec: Specialization) => void
  loading?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const colors = CLUSTER_COLORS[cluster.id] ?? { bg: '#f8fafc', border: '#e2e8f0', icon: '#64748b' }
  const hasMore = cluster.specializations.length > COLLAPSED_LIMIT
  const visibleSpecs = expanded ? cluster.specializations : cluster.specializations.slice(0, COLLAPSED_LIMIT)

  return (
    <div style={{
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      borderRadius: 14,
      padding: '16px 16px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Cluster header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#fff', border: `1.5px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          {cluster.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
            {cluster.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {cluster.specializations.length} התמחויות
          </div>
        </div>
      </div>

      {/* Specializations list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleSpecs.map(sp => (
          <button
            key={sp.id}
            onClick={() => !loading && onSelect(cluster, sp)}
            disabled={loading}
            style={{
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '7px 10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              textAlign: 'right',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              transition: 'all 0.12s',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = colors.icon
                ;(e.currentTarget as HTMLButtonElement).style.background = colors.bg
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.background = '#fff'
            }}
          >
            <span style={{ flex: 1, textAlign: 'right' }}>{sp.name}</span>
            <span style={{ color: colors.icon, fontSize: 14, flexShrink: 0 }}>←</span>
          </button>
        ))}
      </div>

      {/* Expand / collapse toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          style={{
            background: 'transparent',
            border: `1px dashed ${colors.border}`,
            borderRadius: 8,
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11,
            fontWeight: 700,
            color: colors.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fff'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          {expanded ? (
            <><span style={{ fontSize: 14 }}>−</span> פחות התמחויות</>
          ) : (
            <><span style={{ fontSize: 14 }}>+</span> עוד {cluster.specializations.length - COLLAPSED_LIMIT} התמחויות</>
          )}
        </button>
      )}
    </div>
  )
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 12, marginTop: 4,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 800, color: 'var(--text3)',
        letterSpacing: '1px', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 10, color: 'var(--text3)',
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '1px 8px',
      }}>
        {count} אשכולות
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

export function NewBriefSelector({ onSelect, loading, onMyBriefs }: Props) {
  const digitalClusters = clusters.filter(c => c.type === 'digital')
  const techClusters = clusters.filter(c => c.type === 'tech')

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '20px 24px 40px' }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 900, color: 'var(--text)',
            margin: '0 0 3px', letterSpacing: '-0.5px',
          }}>
            בריף חדש
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
            בחר אשכול והתמחות כדי להתחיל
          </p>
        </div>
        {onMyBriefs && (
          <button
            onClick={onMyBriefs}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 10, padding: '8px 16px',
              fontSize: 13, fontWeight: 700, color: 'var(--text2)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
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

      {/* Digital clusters */}
      <SectionLabel label="דיגיטל" count={digitalClusters.length} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
        marginBottom: 28,
      }}>
        {digitalClusters.map(c => (
          <ClusterTile key={c.id} cluster={c} onSelect={onSelect} loading={loading} />
        ))}
      </div>

      {/* Tech clusters */}
      <SectionLabel label="טכנולוגיה" count={techClusters.length} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {techClusters.map(c => (
          <ClusterTile key={c.id} cluster={c} onSelect={onSelect} loading={loading} />
        ))}
      </div>
    </div>
  )
}
