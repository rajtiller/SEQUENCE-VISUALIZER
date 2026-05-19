import { useEffect, useMemo, useState } from 'react'
import { DataChart, type ChartPoint } from './DataChart'
import { PixelGridChart } from './PixelGridChart'
import type { GraphExportPayload } from '../lib/graphExport'
import type { PreparedGraphRender } from '../lib/prepareGraphRender'
import {
  capGraphViewRows,
  isAllAtOnceDisplay,
  resolveGraphViewPoints,
} from '../lib/buildChartData'
import { normalizeGraphBounds } from '../lib/graphPlanConfig'
import { normalizeVizConfig } from '../lib/vizConfig'

type Props = {
  payload: GraphExportPayload
  width: number
  height: number
  prepared?: PreparedGraphRender | null
}

export function GraphRenderer({ payload, width, height, prepared }: Props) {
  const { coordinateRows, graphPlan } = payload
  const vizConfig = normalizeVizConfig(payload.vizConfig)
  const isPolar = graphPlan.coordinateSystem === 'polar'
  const showRectPixels = graphPlan.usePixels && !isPolar
  const showGrid = graphPlan.gridLines === 'yes'
  const bounds = normalizeGraphBounds(
    graphPlan.bounds,
    graphPlan.coordinateSystem,
  )

  const allPoints = useMemo(() => {
    if (prepared) return prepared.allPoints
    return resolveGraphViewPoints(coordinateRows, graphPlan, vizConfig)
  }, [prepared, coordinateRows, graphPlan, vizConfig])

  const graphRows = useMemo(() => {
    if (prepared) return prepared.graphRows
    return capGraphViewRows(coordinateRows)
  }, [prepared, coordinateRows])

  const animate = !isAllAtOnceDisplay(graphPlan.pointsPerSecond)
  const [visibleCount, setVisibleCount] = useState(() =>
    animate ? 0 : allPoints.length,
  )

  useEffect(() => {
    if (!animate) {
      setVisibleCount(allPoints.length)
      return
    }

    const rate = graphPlan.pointsPerSecond!
    setVisibleCount(0)
    const stepMs = 50
    const id = window.setInterval(() => {
      setVisibleCount((v) => {
        const next = v + (rate * stepMs) / 1000
        if (next >= allPoints.length) {
          window.clearInterval(id)
          return allPoints.length
        }
        return Math.floor(next)
      })
    }, stepMs)

    return () => window.clearInterval(id)
  }, [animate, allPoints.length, graphPlan.pointsPerSecond])

  useEffect(() => {
    if (!animate) {
      setVisibleCount(allPoints.length)
    }
  }, [animate, allPoints])

  const points: ChartPoint[] = useMemo(
    () => allPoints.slice(0, visibleCount),
    [allPoints, visibleCount],
  )

  if (showRectPixels) {
    return (
      <PixelGridChart
        rows={graphRows}
        bounds={bounds}
        showGrid={showGrid}
        width={width}
        height={height}
        filledCells={prepared?.filledCells}
      />
    )
  }

  const histLabel = isPolar
    ? vizConfig.histogramSource === 'x'
      ? 'radius'
      : 'θ'
    : vizConfig.histogramSource

  return (
    <DataChart
      points={points}
      kind={vizConfig.chartKind}
      showGrid={showGrid}
      strokeWidth={vizConfig.strokeWidth}
      pointRadius={vizConfig.pointRadius}
      width={width}
      height={height}
      bounds={bounds}
      useGraphBounds={!isPolar}
      histogramSource={vizConfig.histogramSource}
      histogramValueLabel={histLabel}
    />
  )
}
