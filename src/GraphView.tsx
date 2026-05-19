import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GraphRenderer } from './components/GraphRenderer'
import { ProgressBar } from './components/ProgressBar'
import { downloadTextFile } from './lib/downloadFile'
import { downloadGraphPng, findChartSvg } from './lib/downloadGraphPng'
import {
  estimateGraphExportRowCount,
  hasGraphExportData,
  loadGraphExport,
  loadGraphExportAsync,
  shouldShowGraphProgress,
  type GraphExportPayload,
} from './lib/graphExport'
import {
  buildPresetCsvText,
  graphPngDownloadName,
  presetCsvDownloadName,
} from './lib/presetCsv'
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
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportingPng, setExportingPng] = useState(false)
  const chartHostRef = useRef<HTMLDivElement>(null)

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

  const onDownloadPng = useCallback(async () => {
    if (loadState.status !== 'ready') return
    const host = chartHostRef.current
    if (!host) return
    const svg = findChartSvg(host)
    if (!svg) {
      setExportError('Could not find graph to export.')
      return
    }
    setExportError(null)
    setExportingPng(true)
    try {
      await downloadGraphPng(
        svg,
        graphPngDownloadName(loadState.payload.fileName),
      )
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'PNG export failed.')
    } finally {
      setExportingPng(false)
    }
  }, [loadState])

  const onDownloadPresetCsv = useCallback(() => {
    if (loadState.status !== 'ready') return
    setExportError(null)
    try {
      const text = buildPresetCsvText(loadState.payload)
      downloadTextFile(
        text,
        presetCsvDownloadName(loadState.payload.fileName),
      )
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'CSV export failed.')
    }
  }, [loadState])

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
      <div className="graph-view__chart" ref={chartHostRef}>
        <GraphRenderer
          payload={payload}
          prepared={prepared}
          width={size.width}
          height={size.height}
        />
      </div>
      <div className="graph-view__toolbar" role="toolbar" aria-label="Export graph">
        <button
          type="button"
          className="graph-view__btn"
          disabled={exportingPng}
          onClick={() => void onDownloadPng()}
        >
          {exportingPng ? 'Saving PNG…' : 'Download PNG'}
        </button>
        <button
          type="button"
          className="graph-view__btn"
          onClick={onDownloadPresetCsv}
        >
          Download preset CSV
        </button>
      </div>
      {exportError ? (
        <p className="graph-view__export-error" role="alert">
          {exportError}
        </p>
      ) : null}
    </div>
  )
}
