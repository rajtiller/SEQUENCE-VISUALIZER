import type { ChartPoint } from '../components/DataChart'
import type { CoordinateRow } from './parseCsv'
import {
  isAllAtOnceDisplay,
  type GraphBounds,
  type GraphPlanConfig,
} from './graphPlanConfig'
import { rowsToCartesianPoints } from './polarGrid'
import { buildHistogramChartPoints } from './histogram'
import type { VizConfig } from './vizConfig'

/** Max points drawn in the full-screen graph (preview uses `graphPlan.pointCount`). */
export const MAX_GRAPH_VIEW_POINTS = 50_000

export function buildChartPoints(
  rows: CoordinateRow[],
  cfg: VizConfig,
  maxPoints: number,
  bounds?: GraphBounds,
): ChartPoint[] {
  const cap = Math.max(1, Math.min(maxPoints, 20_000))
  const slice = rows.slice(0, cap)

  if (cfg.chartKind === 'histogram') {
    const domain =
      bounds && bounds.xMax > bounds.xMin && bounds.yMax > bounds.yMin
        ? cfg.histogramSource === 'x'
          ? { domainMin: bounds.xMin, domainMax: bounds.xMax }
          : { domainMin: bounds.yMin, domainMax: bounds.yMax }
        : undefined
    return buildHistogramChartPoints(slice, cfg.histogramSource, domain)
  }

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

  if (cfg.chartKind === 'histogram') {
    return buildChartPoints(slice, cfg, slice.length)
  }

  if (graphPlan.coordinateSystem === 'polar') {
    return rowsToCartesianPoints(slice).map((p, i) => ({
      ...p,
      label: String(slice[i].x),
    }))
  }

  return buildChartPoints(slice, cfg, slice.length, graphPlan.bounds)
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

export function capGraphViewRows(rows: CoordinateRow[]): CoordinateRow[] {
  if (rows.length <= MAX_GRAPH_VIEW_POINTS) return rows
  return rows.slice(0, MAX_GRAPH_VIEW_POINTS)
}

/** Full-screen graph: use all loaded rows (up to cap), not preview `pointCount`. */
export function resolveGraphViewPoints(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
  cfg: VizConfig,
): ChartPoint[] {
  const slice = capGraphViewRows(rows)
  if (slice.length === 0) return []

  if (cfg.chartKind === 'histogram') {
    return buildChartPoints(slice, cfg, slice.length)
  }

  if (graphPlan.coordinateSystem === 'polar') {
    return rowsToCartesianPoints(slice).map((p, i) => ({
      ...p,
      label: String(slice[i].x),
    }))
  }

  return buildChartPoints(slice, cfg, slice.length, graphPlan.bounds)
}

export { isAllAtOnceDisplay }
