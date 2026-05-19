import type { ChartPoint } from '../components/DataChart'
import type { FilledCellsModel } from './pixelGrid'
import { buildFilledCellsAsync } from './pixelGrid'
import type { CoordinateRow } from './parseCsv'
import {
  buildChartPoints,
  rowsForGraph,
} from './buildChartData'
import type { GraphExportPayload } from './graphExport'
import { shouldShowGraphProgress } from './graphExport'
import { rowsToCartesianPoints } from './polarGrid'
import { yieldToMain } from './yieldToMain'

export type PreparedGraphRender = {
  allPoints: ChartPoint[]
  graphRows: CoordinateRow[]
  filledCells?: FilledCellsModel
}

const PROCESS_CHUNK = 2500

export type ProgressCallback = (fraction: number, message: string) => void

export async function prepareGraphRenderData(
  payload: GraphExportPayload,
  onProgress: ProgressCallback,
): Promise<PreparedGraphRender> {
  const { coordinateRows, graphPlan, vizConfig } = payload
  const graphRows = rowsForGraph(coordinateRows, graphPlan)
  const isPolar = graphPlan.coordinateSystem === 'polar'
  const showRectPixels = graphPlan.usePixels && !isPolar
  const n = graphRows.length

  if (!shouldShowGraphProgress(coordinateRows.length)) {
    return prepareGraphRenderDataSync(payload, graphRows)
  }

  if (showRectPixels) {
    onProgress(0.05, 'Building pixel grid…')
    const filledCells = await buildFilledCellsAsync(graphRows, (p) => {
      onProgress(0.05 + p * 0.9, 'Building pixel grid…')
    })
    onProgress(1, 'Ready')
    return { allPoints: [], graphRows, filledCells }
  }

  const allPoints: ChartPoint[] = []

  if (isPolar) {
    for (let i = 0; i < n; i += PROCESS_CHUNK) {
      const slice = graphRows.slice(i, i + PROCESS_CHUNK)
      const mapped = rowsToCartesianPoints(slice).map((p, j) => ({
        ...p,
        label: String(slice[j].x),
      }))
      allPoints.push(...mapped)
      const done = Math.min(i + slice.length, n)
      onProgress(
        (done / n) * 0.95,
        `Preparing points ${done.toLocaleString()} / ${n.toLocaleString()}…`,
      )
      await yieldToMain()
    }
  } else {
    for (let i = 0; i < n; i += PROCESS_CHUNK) {
      const slice = graphRows.slice(i, i + PROCESS_CHUNK)
      allPoints.push(...buildChartPoints(slice, vizConfig, slice.length))
      const done = Math.min(i + slice.length, n)
      onProgress(
        (done / n) * 0.95,
        `Preparing points ${done.toLocaleString()} / ${n.toLocaleString()}…`,
      )
      await yieldToMain()
    }
  }

  onProgress(1, 'Ready')
  return { allPoints, graphRows }
}

function prepareGraphRenderDataSync(
  payload: GraphExportPayload,
  graphRows: CoordinateRow[],
): PreparedGraphRender {
  const { graphPlan, vizConfig } = payload
  const isPolar = graphPlan.coordinateSystem === 'polar'
  const showRectPixels = graphPlan.usePixels && !isPolar

  if (showRectPixels) {
    return { allPoints: [], graphRows }
  }

  if (isPolar) {
    return {
      allPoints: rowsToCartesianPoints(graphRows).map((p, i) => ({
        ...p,
        label: String(graphRows[i].x),
      })),
      graphRows,
    }
  }

  return {
    allPoints: buildChartPoints(graphRows, vizConfig, graphRows.length),
    graphRows,
  }
}
