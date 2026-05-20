import type { ChartPoint } from '../components/DataChart'
import type { CoordinateRow } from './parseCsv'
import {
  colorForRow,
  colorValueExtent,
  defaultColorConfig,
  indexColorByPosition,
  inferDefaultColorSource,
  normalizeColorConfig,
  type ColorConfig,
} from './colorConfig'
import type { GraphPlanConfig } from './graphPlanConfig'

export function applyPointColors(
  points: ChartPoint[],
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
  hasZ: boolean,
): ChartPoint[] {
  if (points.length === 0) return points

  if (graphPlan.threeD === 'yes-with-color') {
    const config = normalizeColorConfig(graphPlan.color, hasZ)
    const extent = colorValueExtent(rows, config.source)
    if (!extent) return points

    const n = Math.min(points.length, rows.length)
    return points.map((p, i) => {
      if (i >= n) return p
      const fill = colorForRow(rows[i], config, extent)
      return fill ? { ...p, fill } : p
    })
  }

  if (graphPlan.multicolored === 'yes') {
    const total = points.length
    return points.map((p, i) => ({
      ...p,
      fill: indexColorByPosition(i, total),
    }))
  }

  return points
}

/** Per grid cell fill when using pixels + 3D color. */
export function buildPixelCellFills(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
  hasZ: boolean,
): Map<string, string> {
  const map = new Map<string, string>()
  if (graphPlan.threeD !== 'yes-with-color' || rows.length === 0) {
    return map
  }

  const config = normalizeColorConfig(graphPlan.color, hasZ)
  const extent = colorValueExtent(rows, config.source)
  if (!extent) return map

  for (const row of rows) {
    const gx = Math.round(row.x)
    const gy = Math.round(row.y)
    const fill = colorForRow(row, config, extent)
    if (fill) map.set(`${gx},${gy}`, fill)
  }
  return map
}

export function withColorSourceForData(
  color: Partial<ColorConfig> | undefined,
  hasZ: boolean,
): ColorConfig {
  const base = color
    ? normalizeColorConfig(color, hasZ)
    : defaultColorConfig(hasZ)
  return {
    ...base,
    source: inferDefaultColorSource(hasZ),
  }
}
