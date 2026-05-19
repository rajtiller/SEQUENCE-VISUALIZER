import type { CoordinateRow } from './parseCsv'
import { parseNumber, splitDataLine } from './parseCsv'

export type InputMode = 'combined' | 'lists'

export type ListSeries = {
  values: number[]
  fileName: string | null
}

export type ListsInput = {
  x: ListSeries
  y: ListSeries
  z: ListSeries
}

export function emptyListSeries(): ListSeries {
  return { values: [], fileName: null }
}

export function emptyListsInput(): ListsInput {
  return {
    x: emptyListSeries(),
    y: emptyListSeries(),
    z: emptyListSeries(),
  }
}

/**
 * Parse a file that is one numeric value per line (or one column per line).
 * Blank lines and `#` comments are skipped.
 */
export function parseNumberList(text: string): number[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const values: number[] = []

  for (const line of normalized.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const fields = splitDataLine(line)
    const raw = fields.length > 0 ? fields[0] : trimmed
    const n = parseNumber(raw)
    if (!Number.isNaN(n)) values.push(n)
  }

  return values
}

export type MergeListsResult = {
  rows: CoordinateRow[]
  hasZ: boolean
  error: string | null
  /** Shorter length used when x/y/z lengths differ. */
  pairedCount: number
}

/**
 * Build coordinate rows from separate lists.
 * - Both x and y: pair by index (uses shortest length).
 * - Y only: x becomes 0..n-1 (histogram-friendly).
 * - X only: y becomes 0..n-1.
 * - Optional z: paired to the same length when present.
 */
export function mergeListsToCoordinateRows(
  x: number[],
  y: number[],
  z?: number[],
): MergeListsResult {
  const hasX = x.length > 0
  const hasY = y.length > 0

  if (!hasX && !hasY) {
    return { rows: [], hasZ: false, error: null, pairedCount: 0 }
  }

  let xs = x
  let ys = y

  if (!hasX) {
    xs = ys.map((_, i) => i)
  } else if (!hasY) {
    ys = xs.map((_, i) => i)
  }

  const n = Math.min(xs.length, ys.length)
  const rows: CoordinateRow[] = []
  let hasZ = false

  const zValues = z && z.length > 0 ? z : undefined

  for (let i = 0; i < n; i += 1) {
    const row: CoordinateRow = { x: xs[i], y: ys[i] }
    if (zValues && i < zValues.length) {
      const zi = zValues[i]
      if (!Number.isNaN(zi)) {
        row.z = zi
        hasZ = true
      }
    }
    rows.push(row)
  }

  let error: string | null = null
  if (hasX && hasY && (xs.length !== ys.length || (zValues && zValues.length !== n))) {
    const parts = [`Using first ${n} pairs`]
    if (xs.length !== ys.length) {
      parts.push(`x has ${xs.length}, y has ${ys.length}`)
    }
    if (zValues && zValues.length !== n) {
      parts.push(`z has ${zValues.length}`)
    }
    error = parts.join(' · ')
  }

  return { rows, hasZ, error, pairedCount: n }
}

export function listsInputLabel(lists: ListsInput): string | null {
  const parts = [
    lists.x.fileName ? `x: ${lists.x.fileName}` : null,
    lists.y.fileName ? `y: ${lists.y.fileName}` : null,
    lists.z.fileName ? `z: ${lists.z.fileName}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function listsHaveAnyData(lists: ListsInput): boolean {
  return (
    lists.x.values.length > 0 ||
    lists.y.values.length > 0 ||
    lists.z.values.length > 0
  )
}
