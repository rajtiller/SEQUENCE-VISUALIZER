/** Split one CSV line into fields; supports double-quoted fields and escaped quotes (""). */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let i = 0
  let inQuotes = false

  while (i < line.length) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      current += c
      i += 1
      continue
    }
    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ',') {
      fields.push(current)
      current = ''
      i += 1
      continue
    }
    current += c
    i += 1
  }
  fields.push(current)
  return fields
}

/** Split a line into fields (comma-separated CSV, or whitespace if no commas). */
export function splitDataLine(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []
  if (trimmed.includes(',')) {
    return parseCsvLine(trimmed).map((f) => f.trim())
  }
  return trimmed.split(/\s+/).filter((f) => f.length > 0)
}

export function parseNumber(raw: string): number {
  const s = String(raw ?? '').trim().replace(/,/g, '')
  return Number.parseFloat(s)
}

export type CoordinateRow = {
  x: number
  y: number
  z?: number
}

export type ParsedCoordinates = {
  rows: CoordinateRow[]
  /** True if any row included a third numeric value. */
  hasZ: boolean
}

/**
 * Parse coordinate data: each line is x, y, and optionally z (1st, 2nd, 3rd field).
 * No header row — every non-empty line is a point.
 */
export function parseCoordinateCsv(text: string): ParsedCoordinates {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const rows: CoordinateRow[] = []
  let hasZ = false

  for (const line of lines) {
    const fields = splitDataLine(line)
    if (fields.length < 2) continue

    const x = parseNumber(fields[0])
    const y = parseNumber(fields[1])
    if (Number.isNaN(x) || Number.isNaN(y)) continue

    const row: CoordinateRow = { x, y }

    if (fields.length >= 3) {
      const z = parseNumber(fields[2])
      if (!Number.isNaN(z)) {
        row.z = z
        hasZ = true
      }
    }

    rows.push(row)
  }

  return { rows, hasZ }
}
