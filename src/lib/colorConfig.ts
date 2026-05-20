import type { CoordinateRow } from './parseCsv'

export type ColorSource = 'x' | 'y' | 'z'

export type ColorMappingMode = 'linear' | 'custom'

export type ColorConfig = {
  /** Column used to drive color (0–255 scale). */
  source: ColorSource
  /** Maps to color index 0; blank = lowest value in data. */
  valueMin: number | null
  /** Maps to color index 255; blank = highest value in data. */
  valueMax: number | null
  /** CSS color at index 0. */
  colorLow: string
  /** CSS color at index 255. */
  colorHigh: string
  mappingMode: ColorMappingMode
  /** Expression in `v` (0–255); result is taken mod 256. Used when mappingMode is custom. */
  customExpression: string
}

export const DEFAULT_COLOR_LOW = '#0f172a'
export const DEFAULT_COLOR_HIGH = '#38bdf8'

export function inferDefaultColorSource(hasZ: boolean): ColorSource {
  return hasZ ? 'z' : 'x'
}

export function defaultColorConfig(hasZ: boolean): ColorConfig {
  return {
    source: inferDefaultColorSource(hasZ),
    valueMin: null,
    valueMax: null,
    colorLow: DEFAULT_COLOR_LOW,
    colorHigh: DEFAULT_COLOR_HIGH,
    mappingMode: 'linear',
    customExpression: 'v',
  }
}

const COLOR_SOURCES: ColorSource[] = ['x', 'y', 'z']
const MAPPING_MODES: ColorMappingMode[] = ['linear', 'custom']

export function coerceColorSource(
  source: ColorSource,
  hasZ: boolean,
): ColorSource {
  if (source === 'z' && !hasZ) return 'x'
  return source
}

export function normalizeColorConfig(
  value: Partial<ColorConfig> | null | undefined,
  hasZ = true,
): ColorConfig {
  const d = defaultColorConfig(hasZ)
  if (!value) return d

  const source = COLOR_SOURCES.includes(value.source as ColorSource)
    ? coerceColorSource(value.source as ColorSource, hasZ)
    : d.source

  let valueMin: number | null = d.valueMin
  if (value.valueMin === null) valueMin = null
  else if (Number.isFinite(value.valueMin)) valueMin = value.valueMin!

  let valueMax: number | null = d.valueMax
  if (value.valueMax === null) valueMax = null
  else if (Number.isFinite(value.valueMax)) valueMax = value.valueMax!

  const mappingMode = MAPPING_MODES.includes(value.mappingMode as ColorMappingMode)
    ? (value.mappingMode as ColorMappingMode)
    : d.mappingMode

  const customExpression =
    typeof value.customExpression === 'string' && value.customExpression.trim()
      ? value.customExpression.trim()
      : d.customExpression

  const colorLow =
    typeof value.colorLow === 'string' && value.colorLow.trim()
      ? value.colorLow.trim()
      : d.colorLow

  const colorHigh =
    typeof value.colorHigh === 'string' && value.colorHigh.trim()
      ? value.colorHigh.trim()
      : d.colorHigh

  return {
    source,
    valueMin,
    valueMax,
    colorLow,
    colorHigh,
    mappingMode,
    customExpression,
  }
}

export function colorSourceValue(
  row: CoordinateRow,
  source: ColorSource,
): number | null {
  const v =
    source === 'x' ? row.x : source === 'y' ? row.y : row.z
  return Number.isFinite(v) ? v! : null
}

export function formatColorScaleValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toPrecision(4)
}

export function colorValueExtent(
  rows: CoordinateRow[],
  source: ColorSource,
): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    const v = colorSourceValue(row, source)
    if (v === null) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  return { min, max }
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

export function resolveColorScaleBounds(
  config: ColorConfig,
  extent: { min: number; max: number },
): { min: number; max: number } | null {
  const min =
    config.valueMin != null && Number.isFinite(config.valueMin)
      ? config.valueMin
      : extent.min
  const max =
    config.valueMax != null && Number.isFinite(config.valueMax)
      ? config.valueMax
      : extent.max

  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    return null
  }
  return { min, max }
}

/**
 * Clamp only the bound(s) being edited so they stay within the opposing
 * effective limit (user override or auto extent). Does not modify the other bound.
 */
export function reconcileColorScaleOverrides(
  color: ColorConfig,
  extent: { min: number; max: number } | null,
  patch: Partial<Pick<ColorConfig, 'valueMin' | 'valueMax' | 'source'>> = {},
): Partial<Pick<ColorConfig, 'valueMin' | 'valueMax'>> {
  const out: Partial<Pick<ColorConfig, 'valueMin' | 'valueMax'>> = {}
  if (!extent) return out

  const ceiling =
    color.valueMax != null && Number.isFinite(color.valueMax)
      ? color.valueMax
      : extent.max
  const floor =
    color.valueMin != null && Number.isFinite(color.valueMin)
      ? color.valueMin
      : extent.min

  if (patch.valueMin !== undefined) {
    let valueMin = patch.valueMin
    if (valueMin != null && Number.isFinite(valueMin)) {
      valueMin = Math.min(valueMin, ceiling)
    }
    out.valueMin = valueMin
  } else if (patch.source !== undefined && color.valueMin != null) {
    if (Number.isFinite(color.valueMin) && color.valueMin > ceiling) {
      out.valueMin = ceiling
    }
  }

  if (patch.valueMax !== undefined) {
    let valueMax = patch.valueMax
    if (valueMax != null && Number.isFinite(valueMax)) {
      valueMax = Math.max(valueMax, floor)
    }
    out.valueMax = valueMax
  } else if (patch.source !== undefined && color.valueMax != null) {
    if (Number.isFinite(color.valueMax) && color.valueMax < floor) {
      out.valueMax = floor
    }
  }

  return out
}

/** Normalized position along the scale (0 = low color, 1 = high color). */
export function valueToColorT(
  raw: number,
  config: ColorConfig,
  extent: { min: number; max: number },
): number {
  const bounds = resolveColorScaleBounds(config, extent)
  if (!bounds) return 0.5

  const { min, max } = bounds
  if (raw <= min) return 0
  if (raw >= max) return 1
  return (raw - min) / (max - min)
}

/** Map a data value to 0–255 using configured bounds (or data extent). */
export function valueToColorIndex(
  raw: number,
  config: ColorConfig,
  extent: { min: number; max: number },
): number {
  return Math.round(valueToColorT(raw, config, extent) * 255)
}

export function applyCustomColorIndex(
  linearIndex: number,
  expression: string,
): number {
  const v = Math.max(0, Math.min(255, Math.round(linearIndex)))
  try {
    const fn = new Function('v', 'Math', `"use strict"; return (${expression});`)
    const result = fn(v, Math)
    if (!Number.isFinite(result)) return v
    return ((Math.trunc(result) % 256) + 256) % 256
  } catch {
    return v
  }
}

type Rgb = { r: number; g: number; b: number }

function parseHexColor(input: string): Rgb | null {
  const t = input.trim()
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t)
  if (!m) return null
  let hex = m[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const n = Number.parseInt(hex, 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  }
}

function parseCssColor(input: string): Rgb | null {
  const hex = parseHexColor(input)
  if (hex) return hex

  if (typeof document === 'undefined') return null
  const el = document.createElement('span')
  el.style.color = input
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  document.body.removeChild(el)
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(computed)
  if (!m) return null
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
  }
}

export function colorFromT(
  t: number,
  colorLow: string,
  colorHigh: string,
): string {
  const u = clamp01(t)
  const low = parseCssColor(colorLow) ?? parseHexColor(colorLow)
  const high = parseCssColor(colorHigh) ?? parseHexColor(colorHigh)
  if (!low || !high) {
    return u < 0.5 ? colorLow : colorHigh
  }
  const r = Math.round(low.r + (high.r - low.r) * u)
  const g = Math.round(low.g + (high.g - low.g) * u)
  const b = Math.round(low.b + (high.b - low.b) * u)
  return `rgb(${r}, ${g}, ${b})`
}

export function colorFromIndex(
  index: number,
  colorLow: string,
  colorHigh: string,
): string {
  return colorFromT(index / 255, colorLow, colorHigh)
}

export function colorForRow(
  row: CoordinateRow,
  config: ColorConfig,
  extent: { min: number; max: number },
): string | undefined {
  const raw = colorSourceValue(row, config.source)
  if (raw === null) return undefined
  let t = valueToColorT(raw, config, extent)
  if (config.mappingMode === 'custom') {
    const index = applyCustomColorIndex(Math.round(t * 255), config.customExpression)
    t = index / 255
  }
  return colorFromT(t, config.colorLow, config.colorHigh)
}

export function indexColorByPosition(index: number, total: number): string {
  const hue = total > 1 ? (index / total) * 360 : 0
  return `hsl(${hue} 68% 52%)`
}
