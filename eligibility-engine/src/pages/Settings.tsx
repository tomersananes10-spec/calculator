import { getRoleTemplateList } from '../data/roleTemplates'
import { Card } from '../components/ui/Card'

export function Settings() {
  const templates = getRoleTemplateList()

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>הגדרות תבניות תפקידים</h1>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 28 }}>
        ניהול תבניות תפקידים ותנאי סף
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {templates.map(t => (
          <Card key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                  {t.description} · {t.requirements.length} תנאי סף
                  {t.takamCode && ` · קוד ${t.takamCode}`}
                </div>
              </div>
              <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: 'var(--green-bg)',
                color: 'var(--green)',
              }}>
                פעיל
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        marginTop: 20,
        fontSize: 13,
        color: 'var(--text2)',
      }}>
        עריכת תבניות תפקידים תהיה זמינה בגרסה הבאה (Phase 2+)
      </div>
    </div>
  )
}
