import { useMemo } from 'react'
import type { CoordinateRow } from '../lib/parseCsv'
import type { GraphBounds } from '../lib/graphPlanConfig'
import {
  buildFilledCells,
  gridCellCount,
  isCellInBounds,
  iterGridCells,
} from '../lib/pixelGrid'

type Props = {
  rows: CoordinateRow[]
  bounds: GraphBounds
  showGrid: boolean
}

const W = 640
const H = 360
const pad = { l: 44, r: 16, t: 16, b: 40 }
const MAX_GRID_CELLS = 12_000

export function PixelGridChart({ rows, bounds, showGrid }: Props) {
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const xSpan = bounds.xMax - bounds.xMin
  const ySpan = bounds.yMax - bounds.yMin
  const invalidBounds = xSpan <= 0 || ySpan <= 0

  const { occupied, truncated } = useMemo(
    () => buildFilledCells(rows),
    [rows],
  )

  const occupiedKeys = useMemo(
    () => new Set(occupied.map((c) => `${c.gx},${c.gy}`)),
    [occupied],
  )

  const cellW = innerW / xSpan
  const cellH = innerH / ySpan

  const cellLeft = (gx: number) => pad.l + (gx - bounds.xMin) * cellW
  const cellTop = (gy: number) => pad.t + (bounds.yMax - gy - 1) * cellH

  const originX =
    bounds.xMin < 0 && bounds.xMax > 0
      ? pad.l + ((0 - bounds.xMin) / xSpan) * innerW
      : null
  const originY =
    bounds.yMin < 0 && bounds.yMax > 0
      ? pad.t + ((bounds.yMax - 0) / ySpan) * innerH
      : null

  const totalCells = gridCellCount(bounds)
  const drawFullGrid = showGrid && totalCells <= MAX_GRID_CELLS && !invalidBounds
  const gridCells = useMemo(
    () => (drawFullGrid ? iterGridCells(bounds) : []),
    [drawFullGrid, bounds],
  )

  const visibleFilled = useMemo(
    () =>
      occupied.filter(({ gx, gy }) => isCellInBounds(gx, gy, bounds)),
    [occupied, bounds],
  )

  if (invalidBounds) {
    return (
      <svg
        className="data-chart pixel-grid-chart"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Invalid graph bounds"
      >
        <rect width={W} height={H} fill="var(--chart-bg)" rx="8" />
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fill="var(--text)"
          fontSize="14"
        >
          Graph bounds invalid: upper must be greater than lower on each axis.
        </text>
      </svg>
    )
  }

  if (rows.length === 0) {
    return (
      <svg
        className="data-chart pixel-grid-chart"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        role="img"
        aria-label="Rectangle grid"
      >
        <rect width={W} height={H} fill="var(--chart-bg)" rx="8" />
        {drawFullGrid &&
          gridCells.map(({ gx, gy }) => (
            <rect
              key={`e-${gx}-${gy}`}
              x={cellLeft(gx)}
              y={cellTop(gy)}
              width={cellW}
              height={cellH}
              fill="transparent"
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          ))}
        {originX !== null && (
          <line
            x1={originX}
            x2={originX}
            y1={pad.t}
            y2={H - pad.b}
            stroke="var(--text-h)"
            strokeWidth={1.5}
            opacity={0.6}
          />
        )}
        {originY !== null && (
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={originY}
            y2={originY}
            stroke="var(--text-h)"
            strokeWidth={1.5}
            opacity={0.6}
          />
        )}
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fill="var(--text)"
          fontSize="14"
        >
          Load a CSV with x, y coordinates to fill rectangles
        </text>
      </svg>
    )
  }

  return (
    <svg
      className="data-chart pixel-grid-chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="Rectangle grid from graph bounds"
    >
      <rect width={W} height={H} fill="var(--chart-bg)" rx="8" />

      {drawFullGrid &&
        gridCells.map(({ gx, gy }) => {
          const filled = occupiedKeys.has(`${gx},${gy}`)
          return (
            <rect
              key={`g-${gx}-${gy}`}
              x={cellLeft(gx)}
              y={cellTop(gy)}
              width={cellW}
              height={cellH}
              fill={filled ? 'var(--accent)' : 'transparent'}
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={filled ? 0.9 : 0.35}
            />
          )
        })}

      {(!drawFullGrid || !showGrid) &&
        visibleFilled.map(({ gx, gy }) => (
          <rect
            key={`f-${gx}-${gy}`}
            x={cellLeft(gx)}
            y={cellTop(gy)}
            width={cellW}
            height={cellH}
            fill="var(--accent)"
            opacity={0.9}
          />
        ))}

      {originX !== null && (
        <line
          x1={originX}
          x2={originX}
          y1={pad.t}
          y2={H - pad.b}
          stroke="var(--text-h)"
          strokeWidth={1.5}
        />
      )}
      {originY !== null && (
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={originY}
          y2={originY}
          stroke="var(--text-h)"
          strokeWidth={1.5}
        />
      )}

      <text
        x={pad.l}
        y={H - 10}
        fill="var(--text)"
        fontSize="10"
        fontFamily="var(--mono)"
      >
        x: {bounds.xMin} … {bounds.xMax}
      </text>
      <text
        x={W - pad.r}
        y={pad.t + 12}
        textAnchor="end"
        fill="var(--text)"
        fontSize="10"
        fontFamily="var(--mono)"
      >
        y: {bounds.yMax} … {bounds.yMin}
      </text>

      <text
        x={pad.l}
        y={pad.t + 12}
        fill="var(--text)"
        fontSize="11"
        fontFamily="var(--mono)"
      >
        {visibleFilled.length} filled · {totalCells} cells
        {truncated ? ' (CSV truncated)' : ''}
        {!drawFullGrid && showGrid ? ' · grid hidden (too many cells)' : ''}
      </text>
    </svg>
  )
}
