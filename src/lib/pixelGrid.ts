import type { CoordinateRow } from './parseCsv'
import type { GraphBounds } from './graphPlanConfig'

export type GridCell = { gx: number; gy: number }

export type FilledCellsModel = {
  occupied: GridCell[]
  truncated: boolean
}

const MAX_FILLED = 100_000

/** Integer lattice cells to fill from CSV (x, y) rows. */
export function buildFilledCells(rows: CoordinateRow[]): FilledCellsModel {
  const seen = new Set<string>()
  const occupied: GridCell[] = []
  let truncated = false

  for (const row of rows) {
    const gx = Math.round(row.x)
    const gy = Math.round(row.y)
    const key = `${gx},${gy}`
    if (seen.has(key)) continue
    if (occupied.length >= MAX_FILLED) {
      truncated = true
      break
    }
    seen.add(key)
    occupied.push({ gx, gy })
  }

  return { occupied, truncated }
}

export function isCellInBounds(
  gx: number,
  gy: number,
  bounds: GraphBounds,
): boolean {
  return (
    gx >= Math.floor(bounds.xMin) &&
    gx < Math.ceil(bounds.xMax) &&
    gy >= Math.floor(bounds.yMin) &&
    gy < Math.ceil(bounds.yMax)
  )
}

export function iterGridCells(bounds: GraphBounds): GridCell[] {
  const cells: GridCell[] = []
  const x0 = Math.floor(bounds.xMin)
  const x1 = Math.ceil(bounds.xMax)
  const y0 = Math.floor(bounds.yMin)
  const y1 = Math.ceil(bounds.yMax)
  for (let gx = x0; gx < x1; gx += 1) {
    for (let gy = y0; gy < y1; gy += 1) {
      cells.push({ gx, gy })
    }
  }
  return cells
}

export function gridCellCount(bounds: GraphBounds): number {
  const xN = Math.max(0, Math.ceil(bounds.xMax) - Math.floor(bounds.xMin))
  const yN = Math.max(0, Math.ceil(bounds.yMax) - Math.floor(bounds.yMin))
  return xN * yN
}
