import type { ChartPoint } from '../components/DataChart'
import type { CoordinateRow } from './parseCsv'
import { isAllAtOnceDisplay, type GraphPlanConfig } from './graphPlanConfig'
import { rowsToCartesianPoints } from './polarGrid'
import type { VizConfig } from './vizConfig'

export function buildChartPoints(
  rows: CoordinateRow[],
  cfg: VizConfig,
  maxPoints: number,
): ChartPoint[] {
  const cap = Math.max(1, Math.min(maxPoints, 20_000))
  const slice = rows.slice(0, cap)

  if (cfg.chartKind === 'bar') {
    return slice.map((row, i) => ({
      x: i,
      y: row.y,
      z: row.z,
      label: String(row.x),
    }))
  }

  return slice.map((row) => ({
    x: row.x,
    y: row.y,
    z: row.z,
    label: String(row.x),
  }))
}

export function resolveChartPoints(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
  cfg: VizConfig,
): ChartPoint[] {
  const cap = Math.max(
    1,
    Math.min(graphPlan.pointCount, 20_000, rows.length),
  )
  const slice = rows.slice(0, cap)
  if (slice.length === 0) return []

  if (graphPlan.coordinateSystem === 'polar') {
    return rowsToCartesianPoints(slice).map((p, i) => ({
      ...p,
      label: String(slice[i].x),
    }))
  }

  return buildChartPoints(slice, cfg, slice.length)
}

export function rowsForGraph(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
): CoordinateRow[] {
  const cap = Math.max(
    1,
    Math.min(graphPlan.pointCount, 20_000, rows.length),
  )
  return rows.slice(0, cap)
}

export { isAllAtOnceDisplay }
