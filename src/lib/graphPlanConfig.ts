/** Settings from `cpp-playground/planning.txt` (UI only until “Create graph” is wired). */

export type CoordinateSystem = 'rectangular' | 'polar'

export type GridLinesChoice = 'yes' | 'no'

export type ThreeDChoice = 'yes-with-color' | 'no'

export type MulticoloredChoice = 'yes' | 'no'

export type InputScaleTypeChoice = 'linear' | 'logarithmic' | 'polynomial'

export type PointsLayoutChoice = 'rows-xy'

export type GraphBounds = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export type GraphPlanConfig = {
  coordinateSystem: CoordinateSystem
  /** Filled unit rectangles on the grid (rectangular coordinates only). */
  usePixels: boolean
  gridLines: GridLinesChoice
  /** Blank or null = show all points at once; positive = animate at this rate. */
  pointsPerSecond: number | null
  threeD: ThreeDChoice
  multicolored: MulticoloredChoice
  bounds: GraphBounds
  inputScaleType: InputScaleTypeChoice
  /** First n rows to plot; null = all points. */
  pointCount: number | null
  pointsLayout: PointsLayoutChoice
}

/** Points are always drawn as circles (no UI option). */
export const POINT_TYPE = 'circle' as const

export function isAllAtOnceDisplay(pointsPerSecond: number | null): boolean {
  return pointsPerSecond == null || pointsPerSecond <= 0
}

export function defaultRectBounds(): GraphBounds {
  return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
}

export function defaultPolarBounds(): GraphBounds {
  const twoPi = 2 * Math.PI
  return { xMin: 0, xMax: 10, yMin: 0, yMax: twoPi }
}

export function defaultGraphBounds(system: CoordinateSystem): GraphBounds {
  return system === 'polar' ? defaultPolarBounds() : defaultRectBounds()
}

export function suggestRectBounds(
  rows: { x: number; y: number }[],
): GraphBounds {
  if (rows.length === 0) return defaultRectBounds()

  let xLo = Infinity
  let xHi = -Infinity
  let yLo = Infinity
  let yHi = -Infinity

  for (const row of rows) {
    const gx = Math.round(row.x)
    const gy = Math.round(row.y)
    xLo = Math.min(xLo, gx)
    xHi = Math.max(xHi, gx)
    yLo = Math.min(yLo, gy)
    yHi = Math.max(yHi, gy)
  }

  const pad = 1
  return normalizeGraphBounds({
    xMin: xLo - pad,
    xMax: xHi + pad + 1,
    yMin: yLo - pad,
    yMax: yHi + pad + 1,
  })
}

/** Polar CSV: x = radius, y = angle (radians, from +x axis). */
export function suggestPolarBounds(
  rows: { x: number; y: number }[],
): GraphBounds {
  if (rows.length === 0) return defaultPolarBounds()

  let rLo = Infinity
  let rHi = -Infinity
  let tLo = Infinity
  let tHi = -Infinity

  for (const row of rows) {
    const gr = Math.round(row.x)
    const gt = Math.round(row.y)
    rLo = Math.min(rLo, gr)
    rHi = Math.max(rHi, gr)
    tLo = Math.min(tLo, gt)
    tHi = Math.max(tHi, gt)
  }

  const pad = 1
  return normalizeGraphBounds({
    xMin: Math.max(0, rLo - pad),
    xMax: rHi + pad + 1,
    yMin: tLo - pad,
    yMax: tHi + pad + 1,
  })
}

export function suggestGraphBounds(
  rows: { x: number; y: number }[],
  system: CoordinateSystem,
): GraphBounds {
  return system === 'polar' ? suggestPolarBounds(rows) : suggestRectBounds(rows)
}

/** Ensure upper > lower on each axis; fall back to defaults if invalid. */
export function normalizeGraphBounds(
  bounds: GraphBounds,
  system: CoordinateSystem = 'rectangular',
): GraphBounds {
  const fallback =
    system === 'polar' ? defaultPolarBounds() : defaultRectBounds()
  let { xMin, xMax, yMin, yMax } = bounds
  if (!Number.isFinite(xMin)) xMin = fallback.xMin
  if (!Number.isFinite(xMax)) xMax = fallback.xMax
  if (!Number.isFinite(yMin)) yMin = fallback.yMin
  if (!Number.isFinite(yMax)) yMax = fallback.yMax
  if (xMax <= xMin) xMax = xMin + 1
  if (yMax <= yMin) yMax = yMin + 1
  if (system === 'polar' && xMin < 0) xMin = 0
  return { xMin, xMax, yMin, yMax }
}

export function defaultGraphPlanConfig(): GraphPlanConfig {
  return {
    coordinateSystem: 'rectangular',
    usePixels: false,
    gridLines: 'yes',
    pointsPerSecond: null,
    threeD: 'no',
    multicolored: 'no',
    bounds: defaultRectBounds(),
    inputScaleType: 'linear',
    pointCount: null,
    pointsLayout: 'rows-xy',
  }
}

/** Keep the first n rows when limited; otherwise return all rows. */
export function sliceToPointLimit(
  rows: { x: number; y: number }[],
  pointCount: number | null,
): typeof rows {
  if (pointCount == null || !Number.isFinite(pointCount) || pointCount <= 0) {
    return rows
  }
  return rows.slice(0, Math.max(1, Math.floor(pointCount)))
}
