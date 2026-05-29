import type { CheckResult } from '../engine/types'
import { Badge } from '../../components/ui/Badge'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { StatusIcon, statusLabel, reqStatusLabel } from '../../components/ui/StatusIcon'
import { Lock, Sparkles } from 'lucide-react'
import s from './Step2Results.module.css'

interface Step2Props {
  result: CheckResult
  onNext: () => void
  onBack: () => void
}

function statusVariant(status: string) {
  if (status === 'pass') return 'pass' as const
  if (status === 'requires_review') return 'review' as const
  return 'fail' as const
}

function bannerClass(status: string) {
  if (status === 'pass') return s.overallBannerPass
  if (status === 'requires_review') return s.overallBannerReview
  return s.overallBannerFail
}

export function Step2Results({ result, onNext, onBack }: Step2Props) {
  const passCount = result.results.filter(r => r.status === 'pass').length
  const reviewCount = result.results.filter(r => r.status === 'requires_review').length
  const failCount = result.results.filter(r => r.status === 'fail').length

  return (
    <div className={s.section}>
      <div className={bannerClass(result.overallStatus)}>
        <div className={s.overallRight}>
          <StatusIcon status={result.overallStatus} size={28} />
          <span className={s.overallTitle}>{statusLabel(result.overallStatus)}</span>
        </div>
        <Badge variant={statusVariant(result.overallStatus)}>
          ציון {result.overallScore}%
        </Badge>
      </div>

      <div className={s.statsRow}>
        <div className={s.statBox}>
          <div className={s.statLabel}>אומדן שנות ניסיון</div>
          <div className={s.statValue}>{result.estimatedYears}</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>עומד</div>
          <div className={s.statValue} style={{ color: 'var(--green)' }}>{passCount}</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>לבדיקה</div>
          <div className={s.statValue} style={{ color: 'var(--amber)' }}>{reviewCount}</div>
        </div>
        <div className={s.statBox}>
          <div className={s.statLabel}>לא עומד</div>
          <div className={s.statValue} style={{ color: 'var(--red)' }}>{failCount}</div>
        </div>
      </div>

      {result.results.map(req => {
        const variant = statusVariant(req.status)
        const matchedKws = req.keywordMatches.filter(m => m.found).map(m => m.keyword)
        return (
          <div key={req.requirementId} className={s.reqCard}>
            <div className={s.reqHeader}>
              <div>
                <div className={s.reqTitleRow}>
                  <StatusIcon status={req.status} size={20} />
                  <span className={s.reqTitle}>{req.requirement.label}</span>
                </div>
                <div className={s.reqDesc}>{req.requirement.description}</div>
              </div>
              <div className={s.reqBadges}>
                <Badge variant={variant}>{reqStatusLabel(req.status)}</Badge>
                <Badge variant="neutral">ודאות {Math.round(req.confidence * 100)}%</Badge>
                {req.requirement.hardRule && (
                  <span className={s.hardRuleBadge}>
                    <Lock size={11} /> דרישת סף
                  </span>
                )}
              </div>
            </div>

            <ProgressBar value={req.score} variant={variant} />

            <div className={s.evidenceBox}>
              <div className={s.evidenceTitle}>אינדיקציות שאותרו</div>
              <div className={s.evidenceText}>{req.summary}</div>
            </div>

            <div className={s.keywordsRow}>
              {req.requirement.keywords.slice(0, 14).map(kw => (
                <span
                  key={kw}
                  className={matchedKws.includes(kw) ? s.kwTagFound : s.kwTagMissing}
                >
                  {kw}
                </span>
              ))}
            </div>

            {req.ai && (
              <div className={s.aiBox}>
                <div className={s.aiBoxHeader}>
                  <Sparkles size={14} />
                  <span>ניתוח AI</span>
                </div>
                <div className={s.aiReasoning}>{req.ai.reasoning}</div>
                {req.ai.evidence.length > 0 && (
                  <div className={s.aiEvidence}>
                    {req.ai.evidence.map((ev, i) => (
                      <div key={i} className={s.aiEvidenceItem}>• {ev}</div>
                    ))}
                  </div>
                )}
                {req.ai.missingInfo && (
                  <div className={s.aiMissing}>חסר: {req.ai.missingInfo}</div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className={s.actions}>
        <button className={s.btnPrimary} onClick={onNext}>
          המשך להחלטת רכזת ←
        </button>
        <button className={s.btnOutline} onClick={onBack}>
          → חזרה לקליטה
        </button>
      </div>
    </div>
  )
}
