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

const CHART_KINDS: ChartKind[] = ['line', 'scatter', 'bar']

export function normalizeVizConfig(
  value: Partial<VizConfig> | null | undefined,
): VizConfig {
  const defaults = defaultVizConfig()
  if (!value) return defaults

  const chartKind = CHART_KINDS.includes(value.chartKind as ChartKind)
    ? (value.chartKind as ChartKind)
    : defaults.chartKind

  const strokeWidth = Number.isFinite(value.strokeWidth)
    ? Math.max(MIN_STROKE_WIDTH, value.strokeWidth!)
    : defaults.strokeWidth

  const pointRadius = Number.isFinite(value.pointRadius)
    ? Math.max(MIN_POINT_RADIUS, value.pointRadius!)
    : defaults.pointRadius

  return { chartKind, strokeWidth, pointRadius }
}
