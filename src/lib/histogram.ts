import type { ChartPoint } from '../components/DataChart'
import type { CoordinateRow } from './parseCsv'
import type { HistogramSource } from './vizConfig'

export type HistogramBin = {
  start: number
  end: number
  center: number
  count: number
}

const MAX_BINS = 512

/**
 * Tile [domainMin, domainMax] with fixed-width bins (flush, no gaps).
 * Values outside the domain are ignored.
 */
export function computeHistogramBins(
  values: number[],
  options: {
    interval: number
    domainMin?: number
    domainMax?: number
  },
): HistogramBin[] {
  const width = options.interval
  if (!Number.isFinite(width) || width <= 0) return []

  let min = options.domainMin
  let max = options.domainMax

  if (min === undefined || max === undefined || max <= min) {
    if (values.length === 0) return []
    min = Infinity
    max = -Infinity
    for (const v of values) {
      if (v < min) min = v
      if (v > max) max = v
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return []
    if (min === max) {
      min -= width / 2
      max += width / 2
    }
  }

  const bins: HistogramBin[] = []
  for (let s = min; s < max; s += width) {
    if (bins.length >= MAX_BINS) break
    const binEnd = Math.min(s + width, max)
    bins.push({
      start: s,
      end: binEnd,
      center: (s + binEnd) / 2,
      count: 0,
    })
    if (binEnd >= max) break
  }

  if (bins.length === 0) {
    bins.push({
      start: min,
      end: max,
      center: (min + max) / 2,
      count: 0,
    })
  }

  for (const v of values) {
    if (v < min || v > max) continue
    let idx = Math.floor((v - min) / width)
    if (idx < 0) idx = 0
    if (idx >= bins.length) idx = bins.length - 1
    bins[idx].count += 1
  }

  return bins
}

export function buildHistogramChartPoints(
  rows: CoordinateRow[],
  source: HistogramSource,
  options: {
    interval: number
    /** Chart horizontal axis (graph X min / max). */
    domainMin?: number
    domainMax?: number
  },
): ChartPoint[] {
  const values = rows.map((r) => (source === 'x' ? r.x : r.y))
  const bins = computeHistogramBins(values, options)
  return bins.map((b) => ({
    x: b.center,
    y: b.count,
    label: formatBinLabel(b.start, b.end),
    binStart: b.start,
    binEnd: b.end,
  }))
}

function formatBinLabel(start: number, end: number): string {
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toPrecision(4)
  return `${fmt(start)}–${fmt(end)}`
}
