import { useEffect, useLayoutEffect, useState } from 'react'
import { GraphRenderer } from './components/GraphRenderer'
import { ProgressBar } from './components/ProgressBar'
import {
  estimateGraphExportRowCount,
  hasGraphExportData,
  loadGraphExport,
  loadGraphExportAsync,
  shouldShowGraphProgress,
  type GraphExportPayload,
} from './lib/graphExport'
import {
  prepareGraphRenderData,
  type PreparedGraphRender,
} from './lib/prepareGraphRender'
import './GraphView.css'

type LoadState =
  | { status: 'loading'; progress: number; message: string }
  | { status: 'ready'; payload: GraphExportPayload; prepared: PreparedGraphRender | null }
  | { status: 'error'; message: string }

export function GraphView() {
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'loading',
    progress: 0,
    message: 'Loading graph…',
  })
  const [size, setSize] = useState({ width: 800, height: 600 })

  useLayoutEffect(() => {
    document.documentElement.classList.add('graph-view-route')
    const prevTitle = document.title
    return () => {
      document.documentElement.classList.remove('graph-view-route')
      document.title = prevTitle
    }
  }, [])

  useLayoutEffect(() => {
    const update = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!hasGraphExportData()) {
        if (!cancelled) {
          setLoadState({
            status: 'error',
            message:
              'No graph data. Use Create graph from the main app after loading a CSV.',
          })
        }
        return
      }

      const estimatedRows = estimateGraphExportRowCount()
      const needsProgress =
        estimatedRows != null && shouldShowGraphProgress(estimatedRows)

      let payload: GraphExportPayload | null

      if (needsProgress) {
        payload = await loadGraphExportAsync((fraction, message) => {
          if (!cancelled) {
            setLoadState({
              status: 'loading',
              progress: fraction * 0.4,
              message,
            })
          }
        })
      } else {
        payload = loadGraphExport()
      }

      if (cancelled) return

      if (!payload || payload.coordinateRows.length === 0) {
        setLoadState({
          status: 'error',
          message: !payload
            ? 'No graph data. Use Create graph from the main app after loading a CSV.'
            : 'Graph data has no points.',
        })
        return
      }

      document.title = payload.fileName
        ? `Graph — ${payload.fileName}`
        : 'Graph'

      if (shouldShowGraphProgress(payload.coordinateRows.length)) {
        const prepared = await prepareGraphRenderData(
          payload,
          (fraction, message) => {
            if (!cancelled) {
              setLoadState({
                status: 'loading',
                progress: 0.4 + fraction * 0.6,
                message,
              })
            }
          },
        )
        if (!cancelled) {
          setLoadState({ status: 'ready', payload, prepared })
        }
        return
      }

      setLoadState({ status: 'ready', payload, prepared: null })
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (loadState.status === 'loading') {
    return (
      <div className="graph-view graph-view--loading">
        <div className="graph-view__progress-panel">
          <p className="graph-view__progress-title">Preparing graph</p>
          <ProgressBar
            value={loadState.progress}
            label={loadState.message}
          />
        </div>
      </div>
    )
  }

  if (loadState.status === 'error') {
    return (
      <div className="graph-view graph-view--error">
        <p>{loadState.message}</p>
      </div>
    )
  }

  const { payload, prepared } = loadState

  return (
    <div className="graph-view" aria-label="Generated graph (read-only)">
      <GraphRenderer
        payload={payload}
        prepared={prepared}
        width={size.width}
        height={size.height}
      />
    </div>
  )
}
