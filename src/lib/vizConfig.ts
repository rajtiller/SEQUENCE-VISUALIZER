export type ChartKind = 'line' | 'scatter' | 'bar'

export type VizConfig = {
  chartKind: ChartKind
  strokeWidth: number
  pointRadius: number
}

export const MIN_STROKE_WIDTH = 1
export const MIN_POINT_RADIUS = 2

export const defaultVizConfig = (): VizConfig => ({
  chartKind: 'line',
  strokeWidth: MIN_STROKE_WIDTH,
  pointRadius: MIN_POINT_RADIUS,
})
