import type { ChartPoint } from '../components/DataChart'
import type { CoordinateRow } from './parseCsv'
import {
  isAllAtOnceDisplay,
  sliceToPointLimit,
  type GraphBounds,
  type GraphPlanConfig,
} from './graphPlanConfig'
import { rowsToCartesianPoints } from './polarGrid'
import { buildHistogramChartPoints } from './histogram'
import type { VizConfig } from './vizConfig'

export function plotRows(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
): CoordinateRow[] {
  return sliceToPointLimit(rows, graphPlan.pointCount)
}

export function previewRows(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
): CoordinateRow[] {
  return sliceToPointLimit(rows, graphPlan.previewPointCount)
}

export function buildChartPoints(
  rows: CoordinateRow[],
  cfg: VizConfig,
  bounds?: GraphBounds,
): ChartPoint[] {
  if (rows.length === 0) return []

  if (cfg.chartKind === 'histogram') {
    const domain =
      bounds && bounds.xMax > bounds.xMin
        ? { domainMin: bounds.xMin, domainMax: bounds.xMax }
        : undefined
    return buildHistogramChartPoints(rows, cfg.histogramSource, {
      interval: cfg.histogramInterval,
      ...domain,
    })
  }

  if (cfg.chartKind === 'bar') {
    return rows.map((row, i) => ({
      x: i,
      y: row.y,
      z: row.z,
      label: String(row.x),
    }))
  }

  return rows.map((row) => ({
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
  const slice = plotRows(rows, graphPlan)
  if (slice.length === 0) return []

  if (cfg.chartKind === 'histogram') {
    return buildChartPoints(slice, cfg, graphPlan.bounds)
  }

  if (graphPlan.coordinateSystem === 'polar') {
    return rowsToCartesianPoints(slice).map((p, i) => ({
      ...p,
      label: String(slice[i].x),
    }))
  }

  return buildChartPoints(slice, cfg, graphPlan.bounds)
}

export function rowsForGraph(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
): CoordinateRow[] {
  return plotRows(rows, graphPlan)
}

/** @deprecated Use plotRows */
export function capGraphViewRows(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
): CoordinateRow[] {
  return plotRows(rows, graphPlan)
}

export function resolveGraphViewPoints(
  rows: CoordinateRow[],
  graphPlan: GraphPlanConfig,
  cfg: VizConfig,
): ChartPoint[] {
  return resolveChartPoints(rows, graphPlan, cfg)
}

export { isAllAtOnceDisplay }
