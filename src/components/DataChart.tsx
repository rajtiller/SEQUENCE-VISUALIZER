import type { ChartKind } from '../lib/vizConfig'
import type { GraphBounds } from '../lib/graphPlanConfig'

export type ChartPoint = { x: number; y: number; z?: number; label: string }

type Props = {
  points: ChartPoint[]
  kind: ChartKind
  showGrid: boolean
  strokeWidth: number
  pointRadius: number
  width?: number
  height?: number
  /** When set (rectangular plots), map data into these axis limits. */
  bounds?: GraphBounds
  useGraphBounds?: boolean
}

const DEFAULT_W = 560
const DEFAULT_H = 200

function chartPad(w: number, h: number) {
  return {
    l: Math.max(40, Math.round(w * 0.07)),
    r: Math.max(12, Math.round(w * 0.02)),
    t: Math.max(10, Math.round(h * 0.04)),
    b: Math.max(28, Math.round(h * 0.1)),
  }
}

function extent(
  values: number[],
  flatFallback = 1,
): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 }
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 }
  }
  if (min === max) {
    min -= flatFallback
    max += flatFallback
  }
  const span = max - min
  return { min: min - span * 0.04, max: max + span * 0.04 }
}

function domainFromBounds(bounds: GraphBounds | undefined): {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
} | null {
  if (!bounds) return null
  const { xMin, xMax, yMin, yMax } = bounds
  if (
    !Number.isFinite(xMin) ||
    !Number.isFinite(xMax) ||
    !Number.isFinite(yMin) ||
    !Number.isFinite(yMax) ||
    xMax <= xMin ||
    yMax <= yMin
  ) {
    return null
  }
  return { xMin, xMax, yMin, yMax }
}

export function DataChart({
  points,
  kind,
  showGrid,
  strokeWidth,
  pointRadius,
  width = DEFAULT_W,
  height = DEFAULT_H,
  bounds,
  useGraphBounds = false,
}: Props) {
  const W = width
  const H = height
  const pad = chartPad(W, H)
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const fullSize = width !== DEFAULT_W || height !== DEFAULT_H

  if (points.length === 0) {
    return (
      <svg
        className="data-chart"
        viewBox={`0 0 ${W} ${H}`}
        width={fullSize ? '100%' : '100%'}
        height={fullSize ? '100%' : 'auto'}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="No numeric data to plot"
      >
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fill="var(--text)"
          fontSize="14"
        >
          No points to plot
        </text>
      </svg>
    )
  }

  const boundDomain = useGraphBounds ? domainFromBounds(bounds) : null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const xExtent = boundDomain
    ? { min: boundDomain.xMin, max: boundDomain.xMax }
    : extent(xs)
  const yExtent = boundDomain
    ? { min: boundDomain.yMin, max: boundDomain.yMax }
    : extent(ys)
  const { min: xMin, max: xMax } = xExtent
  const { min: yMin, max: yMax } = yExtent

  const sxNumeric = (x: number) =>
    pad.l + ((x - xMin) / (xMax - xMin)) * innerW

  const sxBar = (index: number) => {
    const n = points.length
    const slot = innerW / Math.max(n, 1)
    return pad.l + slot * (index + 0.5)
  }

  const sy = (y: number) =>
    pad.t + innerH - ((y - yMin) / (yMax - yMin)) * innerH

  const linePath =
    kind === 'line'
      ? points
          .map((p, i) => {
            const x = sxNumeric(p.x)
            return `${i === 0 ? 'M' : 'L'} ${x} ${sy(p.y)}`
          })
          .join(' ')
      : ''

  const barWidth = Math.max(4, Math.min(28, innerW / Math.max(points.length, 1) - 4))

  return (
    <svg
      className="data-chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={fullSize ? '100%' : 'auto'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Data visualization"
    >
      <rect width={W} height={H} fill="var(--chart-bg)" rx={fullSize ? 0 : 8} />

      {showGrid && (
        <g className="grid" stroke="var(--border)" strokeWidth="1" opacity={0.9}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = pad.t + t * innerH
            return (
              <line
                key={`h-${t}`}
                x1={pad.l}
                x2={W - pad.r}
                y1={y}
                y2={y}
              />
            )
          })}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const x = pad.l + t * innerW
            return (
              <line
                key={`v-${t}`}
                x1={x}
                x2={x}
                y1={pad.t}
                y2={H - pad.b}
              />
            )
          })}
        </g>
      )}

      <line
        x1={pad.l}
        x2={pad.l}
        y1={pad.t}
        y2={H - pad.b}
        stroke="var(--text-h)"
        strokeWidth="1"
      />
      <line
        x1={pad.l}
        x2={W - pad.r}
        y1={H - pad.b}
        y2={H - pad.b}
        stroke="var(--text-h)"
        strokeWidth="1"
      />

      {kind === 'line' && points.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {kind === 'scatter' &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={sxNumeric(p.x)}
            cy={sy(p.y)}
            r={pointRadius}
            fill="var(--accent)"
            stroke="var(--chart-bg)"
            strokeWidth="1"
          />
        ))}

      {kind === 'bar' &&
        points.map((p, i) => {
          const cx = sxBar(i)
          const y0 = sy(yMin)
          const y1 = sy(p.y)
          const top = Math.min(y0, y1)
          const barHeight = Math.abs(y1 - y0)
          return (
            <rect
              key={i}
              x={cx - barWidth / 2}
              y={top}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              fill="var(--accent)"
              opacity={0.85}
            />
          )
        })}

      {kind === 'bar' &&
        points.map((p, i) => {
          if (i % Math.ceil(points.length / 8) !== 0 && i !== points.length - 1) {
            return null
          }
          const label = p.label.length > 10 ? `${p.label.slice(0, 9)}…` : p.label
          return (
            <text
              key={`lbl-${i}`}
              x={sxBar(i)}
              y={H - pad.b + 14}
              textAnchor="middle"
              fill="var(--text)"
              fontSize="9"
              fontFamily="var(--mono)"
            >
              {label}
            </text>
          )
        })}

      <text
        x={pad.l}
        y={H - 10}
        fill="var(--text)"
        fontSize="11"
        fontFamily="var(--mono)"
      >
        {kind === 'bar' ? `${points.length} categories` : 'x axis'}
      </text>
      <text
        x={pad.l}
        y={pad.t + 12}
        fill="var(--text)"
        fontSize="11"
        fontFamily="var(--mono)"
      >
        y: {yMax.toPrecision(4)}
      </text>
    </svg>
  )
}
