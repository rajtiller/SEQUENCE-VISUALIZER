import type { CoordinateRow } from './parseCsv'

export function polarToCartesian(r: number, theta: number): { x: number; y: number } {
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) }
}

export function rowsToCartesianPoints(rows: CoordinateRow[]) {
  return rows.map((row) => {
    const { x, y } = polarToCartesian(row.x, row.y)
    return { x, y, z: row.z, label: `r=${row.x}` }
  })
}
