export type ChartKind = 'line' | 'scatter' | 'bar'

export type VizConfig = {
  chartKind: ChartKind
  strokeWidth: number
  pointRadius: number
}

export const defaultVizConfig = (): VizConfig => ({
  chartKind: 'line',
  strokeWidth: 2,
  pointRadius: 4,
})
