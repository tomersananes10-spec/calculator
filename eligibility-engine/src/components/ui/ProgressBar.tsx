import s from './ProgressBar.module.css'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'pass' | 'fail' | 'review'
}

export function ProgressBar({ value, max = 100, variant = 'pass' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const fillClass = variant === 'pass' ? s.fillPass : variant === 'fail' ? s.fillFail : s.fillReview

  return (
    <div className={s.wrapper}>
      <div className={s.track}>
        <div className={`${s.fill} ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={s.label}>{Math.round(value)}%</span>
    </div>
  )
}
