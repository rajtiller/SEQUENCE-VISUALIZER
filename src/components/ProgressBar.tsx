import './ProgressBar.css'

type Props = {
  value: number
  label?: string
}

export function ProgressBar({ value, label }: Props) {
  const clamped = Math.max(0, Math.min(1, value))
  const pct = Math.round(clamped * 100)

  return (
    <div className="progress-bar" role="group" aria-label={label ?? 'Progress'}>
      <div
        className="progress-bar__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="progress-bar__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      {label ? <p className="progress-bar__label">{label}</p> : null}
    </div>
  )
}
