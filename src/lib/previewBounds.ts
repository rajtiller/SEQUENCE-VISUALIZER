import {
  suggestGraphBounds,
  type CoordinateSystem,
  type GraphBounds,
} from './graphPlanConfig'
import { suggestHistogramBounds } from './histogram'
import type { CoordinateRow } from './parseCsv'
import type { VizConfig } from './vizConfig'

/** Bounds for the preview chart (histogram uses value/count axes, not row x/y). */
export function suggestPreviewBounds(
  rows: CoordinateRow[],
  system: CoordinateSystem,
  viz: Pick<VizConfig, 'chartKind' | 'histogramSource' | 'histogramInterval'>,
): GraphBounds {
  if (viz.chartKind === 'histogram') {
    return suggestHistogramBounds(
      rows,
      viz.histogramSource,
      viz.histogramInterval,
    )
  }
  return suggestGraphBounds(rows, system)
}
