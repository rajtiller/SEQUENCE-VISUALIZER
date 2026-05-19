import type { ChartPoint } from '../components/DataChart'
import type { CoordinateRow } from './parseCsv'
import type { HistogramSource } from './vizConfig'

export type HistogramBin = {
  start: number
  end: number
  center: number
  count: number
}

const MIN_BINS = 5
const MAX_BINS = 48

export function chooseBinCount(valueCount: number): number {
  if (valueCount <= 1) return 1
  const sturges = Math.ceil(Math.log2(valueCount) + 1)
  return Math.max(MIN_BINS, Math.min(MAX_BINS, sturges))
}

export function computeHistogramBins(
  values: number[],
  options?: {
    binCount?: number
    domainMin?: number
    domainMax?: number
  },
): HistogramBin[] {
  if (values.length === 0) return []

  let min = options?.domainMin
  let max = options?.domainMax

  if (min === undefined || max === undefined || max <= min) {
    min = Infinity
    max = -Infinity
    for (const v of values) {
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return []
    if (min === max) {
      min -= 0.5
      max += 0.5
    }
  }

  const k = options?.binCount ?? chooseBinCount(values.length)
  const width = (max - min) / k
  const counts = new Array<number>(k).fill(0)

  for (const v of values) {
    let idx = Math.floor((v - min) / width)
    if (idx < 0) idx = 0
    if (idx >= k) idx = k - 1
    counts[idx] += 1
  }

  const bins: HistogramBin[] = []
  for (let i = 0; i < k; i += 1) {
    const start = min + i * width
    const end = i === k - 1 ? max : min + (i + 1) * width
    bins.push({
      start,
      end,
      center: (start + end) / 2,
      count: counts[i],
    })
  }

  return bins
}

export function buildHistogramChartPoints(
  rows: CoordinateRow[],
  source: HistogramSource,
  options?: {
    domainMin?: number
    domainMax?: number
    binCount?: number
  },
): ChartPoint[] {
  const values = rows.map((r) => (source === 'x' ? r.x : r.y))
  const bins = computeHistogramBins(values, options)
  return bins.map((b) => ({
    x: b.center,
    y: b.count,
    label: formatBinLabel(b.start, b.end),
  }))
}

function formatBinLabel(start: number, end: number): string {
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toPrecision(4)
  return `${fmt(start)}–${fmt(end)}`
}
