import type { ChartPoint } from '../components/DataChart'
import {
  defaultRectBounds,
  normalizeGraphBounds,
  type GraphBounds,
} from './graphPlanConfig'
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

/** Chart axes for histogram preview: X = binned values, Y = counts (from 0). */
export function suggestHistogramBounds(
  rows: CoordinateRow[],
  source: HistogramSource,
  interval: number,
): GraphBounds {
  const width = interval
  if (!Number.isFinite(width) || width <= 0) return defaultRectBounds()

  const values = rows
    .map((r) => (source === 'x' ? r.x : r.y))
    .filter((v) => Number.isFinite(v))
  if (values.length === 0) return defaultRectBounds()

  let dataMin = Infinity
  let dataMax = -Infinity
  for (const v of values) {
    if (v < dataMin) dataMin = v
    if (v > dataMax) dataMax = v
  }
  if (dataMin === dataMax) {
    dataMin -= width / 2
    dataMax += width / 2
  }

  const xMin = Math.floor(dataMin / width) * width
  const xMax = Math.ceil(dataMax / width) * width
  const bins = computeHistogramBins(values, {
    interval: width,
    domainMin: xMin,
    domainMax: xMax,
  })

  let maxCount = 0
  for (const b of bins) maxCount = Math.max(maxCount, b.count)
  const countPad = Math.max(1, Math.ceil(maxCount * 0.1))

  return normalizeGraphBounds({
    xMin,
    xMax,
    yMin: 0,
    yMax: maxCount + countPad,
  })
}
