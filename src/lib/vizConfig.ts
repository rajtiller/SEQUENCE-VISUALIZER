export type ChartKind = 'line' | 'scatter' | 'bar' | 'histogram'

/** Which column / list to bin when `chartKind` is `histogram`. */
export type HistogramSource = 'x' | 'y'

export type VizConfig = {
  chartKind: ChartKind
  strokeWidth: number
  pointRadius: number
  histogramSource: HistogramSource
  /** Width of each histogram bin on the value axis. */
  histogramInterval: number
}

export const MIN_STROKE_WIDTH = 1
export const MIN_POINT_RADIUS = 2
export const MIN_HISTOGRAM_INTERVAL = 1e-9
export const DEFAULT_HISTOGRAM_INTERVAL = 1

export const defaultVizConfig = (): VizConfig => ({
  chartKind: 'line',
  strokeWidth: MIN_STROKE_WIDTH,
  pointRadius: MIN_POINT_RADIUS,
  histogramSource: 'y',
  histogramInterval: DEFAULT_HISTOGRAM_INTERVAL,
})

const CHART_KINDS: ChartKind[] = ['line', 'scatter', 'bar', 'histogram']
const HISTOGRAM_SOURCES: HistogramSource[] = ['x', 'y']

export function normalizeVizConfig(
  value: Partial<VizConfig> | null | undefined,
): VizConfig {
  const defaults = defaultVizConfig()
  if (!value) return defaults

  const chartKind = CHART_KINDS.includes(value.chartKind as ChartKind)
    ? (value.chartKind as ChartKind)
    : defaults.chartKind

  const histogramSource = HISTOGRAM_SOURCES.includes(
    value.histogramSource as HistogramSource,
  )
    ? (value.histogramSource as HistogramSource)
    : defaults.histogramSource

  const strokeWidth = Number.isFinite(value.strokeWidth)
    ? Math.max(MIN_STROKE_WIDTH, value.strokeWidth!)
    : defaults.strokeWidth

  const pointRadius = Number.isFinite(value.pointRadius)
    ? Math.max(MIN_POINT_RADIUS, value.pointRadius!)
    : defaults.pointRadius

  const histogramInterval = Number.isFinite(value.histogramInterval)
    ? Math.max(MIN_HISTOGRAM_INTERVAL, value.histogramInterval!)
    : defaults.histogramInterval

  return {
    chartKind,
    strokeWidth,
    pointRadius,
    histogramSource,
    histogramInterval,
  }
}
