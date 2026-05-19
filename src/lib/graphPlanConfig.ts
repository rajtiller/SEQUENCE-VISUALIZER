/** Settings from `cpp-playground/planning.txt` (UI only until “Create graph” is wired). */

export type CoordinateSystem = 'rectangular' | 'pixels' | 'polar'

export type GridLinesChoice = 'yes' | 'no'

export type PointTypeChoice = 'circle' | 'rectangle'

/** Planning item 4.c is blank; two modes for now. */
export type DisplayMethodChoice = 'all-at-once' | 'one-point-at-a-time'

export type ThreeDChoice = 'yes-with-color' | 'no'

export type MulticoloredChoice = 'yes' | 'no'

/** Planning lists “Trendline” without options; common presets for the dropdown. */
export type TrendlineChoice = 'none' | 'linear' | 'polynomial'

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
  gridLines: GridLinesChoice
  pointType: PointTypeChoice
  displayMethod: DisplayMethodChoice
  threeD: ThreeDChoice
  multicolored: MulticoloredChoice
  trendline: TrendlineChoice
  bounds: GraphBounds
  inputScaleType: InputScaleTypeChoice
  pointCount: number
  pointsLayout: PointsLayoutChoice
}

export function defaultGraphBounds(): GraphBounds {
  return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
}

export function suggestGraphBounds(
  rows: { x: number; y: number }[],
): GraphBounds {
  if (rows.length === 0) return defaultGraphBounds()

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
  const xMin = xLo - pad
  const xMax = xHi + pad + 1
  const yMin = yLo - pad
  const yMax = yHi + pad + 1

  return normalizeGraphBounds({ xMin, xMax, yMin, yMax })
}

/** Ensure upper > lower on each axis; fall back to defaults if invalid. */
export function normalizeGraphBounds(bounds: GraphBounds): GraphBounds {
  let { xMin, xMax, yMin, yMax } = bounds
  if (!Number.isFinite(xMin)) xMin = -10
  if (!Number.isFinite(xMax)) xMax = 10
  if (!Number.isFinite(yMin)) yMin = -10
  if (!Number.isFinite(yMax)) yMax = 10
  if (xMax <= xMin) xMax = xMin + 1
  if (yMax <= yMin) yMax = yMin + 1
  return { xMin, xMax, yMin, yMax }
}

export function defaultGraphPlanConfig(): GraphPlanConfig {
  return {
    coordinateSystem: 'rectangular',
    gridLines: 'yes',
    pointType: 'circle',
    displayMethod: 'all-at-once',
    threeD: 'no',
    multicolored: 'no',
    trendline: 'none',
    bounds: defaultGraphBounds(),
    inputScaleType: 'linear',
    pointCount: 500,
    pointsLayout: 'rows-xy',
  }
}
