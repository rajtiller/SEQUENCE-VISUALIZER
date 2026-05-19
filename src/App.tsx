import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { DataChart } from './components/DataChart'
import { PixelGridChart } from './components/PixelGridChart'
import {
  parseCoordinateCsv,
  type CoordinateRow,
} from './lib/parseCsv'
import {
  defaultGraphBounds,
  defaultGraphPlanConfig,
  normalizeGraphBounds,
  suggestGraphBounds,
  type CoordinateSystem,
  type GraphBounds,
  type GraphPlanConfig,
} from './lib/graphPlanConfig'
import { resolveChartPoints } from './lib/buildChartData'
import {
  openGraphInNewTab,
  saveGraphExportAsync,
  shouldShowGraphProgress,
} from './lib/graphExport'
import { ProgressBar } from './components/ProgressBar'
import { defaultVizConfig, type VizConfig } from './lib/vizConfig'
import './App.css'

const PREVIEW_ROW_COUNT = 4

function App() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [coordinateRows, setCoordinateRows] = useState<CoordinateRow[]>([])
  const [hasZ, setHasZ] = useState(false)
  const [cfg, setCfg] = useState<VizConfig>(() => defaultVizConfig())
  const [graphPlan, setGraphPlan] = useState<GraphPlanConfig>(() =>
    defaultGraphPlanConfig(),
  )

  const applyTable = useCallback((text: string, name: string | null) => {
    setParseError(null)
    try {
      const parsed = parseCoordinateCsv(text)
      if (parsed.rows.length === 0) {
        setParseError(
          'No points found. Each line needs at least two numbers: x, y (optional z).',
        )
        setCoordinateRows([])
        setHasZ(false)
        setFileName(name)
        return
      }
      setCoordinateRows(parsed.rows)
      setHasZ(parsed.hasZ)
      setFileName(name)
      setGraphPlan((p) => ({
        ...p,
        bounds: suggestGraphBounds(parsed.rows, p.coordinateSystem),
      }))
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Could not parse CSV.')
      setCoordinateRows([])
      setHasZ(false)
      setFileName(name)
    }
  }, [])

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return
      const looksCsv =
        /\.csv$/i.test(file.name) ||
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        !file.type
      if (!looksCsv) {
        setParseError('Drop a .csv file (or a file with CSV contents).')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        applyTable(text, file.name)
      }
      reader.onerror = () => {
        setParseError('Failed to read file.')
      }
      reader.readAsText(file)
    },
    [applyTable],
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const f = e.dataTransfer.files?.[0]
      if (f) onFile(f)
    },
    [onFile],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const points = useMemo(
    () => resolveChartPoints(coordinateRows, graphPlan, cfg),
    [coordinateRows, graphPlan, cfg],
  )

  const canCreateGraph = coordinateRows.length > 0
  const [createGraphProgress, setCreateGraphProgress] = useState<{
    value: number
    message: string
  } | null>(null)

  const onCreateGraph = useCallback(async () => {
    if (!canCreateGraph || createGraphProgress) return

    const showProgress = shouldShowGraphProgress(coordinateRows.length)
    if (showProgress) {
      setCreateGraphProgress({ value: 0, message: 'Starting…' })
    }

    const result = await saveGraphExportAsync(
      {
        coordinateRows,
        graphPlan,
        vizConfig: cfg,
        fileName,
      },
      (value, message) => {
        if (showProgress) setCreateGraphProgress({ value, message })
      },
    )

    setCreateGraphProgress(null)

    if (!result.ok) {
      setParseError(result.error)
      return
    }

    openGraphInNewTab()
  }, [
    canCreateGraph,
    coordinateRows,
    graphPlan,
    cfg,
    fileName,
    createGraphProgress,
  ])

  const previewRows = useMemo(
    () => coordinateRows.slice(0, PREVIEW_ROW_COUNT),
    [coordinateRows],
  )

  const isPolar = graphPlan.coordinateSystem === 'polar'
  const showRectPixels = graphPlan.usePixels && !isPolar
  const showGrid = graphPlan.gridLines === 'yes'

  const setBound = useCallback((key: keyof GraphBounds, raw: string) => {
    const n = Number.parseFloat(raw)
    setGraphPlan((p) => ({
      ...p,
      bounds: normalizeGraphBounds(
        {
          ...p.bounds,
          [key]: Number.isFinite(n) ? n : p.bounds[key],
        },
        p.coordinateSystem,
      ),
    }))
  }, [])

  return (
    <div className="viz-app">
      <header className="viz-header-compact">
        <h1>CSV visualizer</h1>
        <p className="viz-tagline">
          {isPolar
            ? 'x = radius, y = angle (rad)'
            : 'x, y per line · optional z'}
        </p>
      </header>

      <div className="viz-shell">
        <aside className="viz-data" aria-labelledby="data-heading">
          <h2 id="data-heading">Data</h2>

          <label
            className="file-drop-compact"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <strong>{fileName ?? 'Choose CSV'}</strong>
            {fileName ? '' : ' — click or drop'}
          </label>

          {parseError && <p className="viz-error">{parseError}</p>}

          {coordinateRows.length > 0 && (
            <p className="viz-meta">
              {coordinateRows.length} pts{hasZ ? ' · z' : ''}
              {coordinateRows.length > PREVIEW_ROW_COUNT
                ? ` · first ${PREVIEW_ROW_COUNT} below`
                : ''}
            </p>
          )}

          {previewRows.length > 0 && (
            <div className="table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>{isPolar ? 'r' : 'x'}</th>
                    <th>{isPolar ? 'θ' : 'y'}</th>
                    {hasZ && <th>z</th>}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.x}</td>
                      <td>{row.y}</td>
                      {hasZ && <td>{row.z ?? ''}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>

        <div className="viz-main" aria-labelledby="viz-heading">
          <h2 id="viz-heading">Visualization</h2>

          <div className="chart-wrap">
            {showRectPixels ? (
              <PixelGridChart
                rows={coordinateRows}
                bounds={graphPlan.bounds}
                showGrid={showGrid}
              />
            ) : (
              <DataChart
                points={points}
                kind={cfg.chartKind}
                showGrid={showGrid}
                strokeWidth={cfg.strokeWidth}
                pointRadius={cfg.pointRadius}
              />
            )}
          </div>

          {!showRectPixels && (
            <div className="preview-toggles">
              <label className="field">
                <span>Preview</span>
                <select
                  value={cfg.chartKind}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      chartKind: e.target.value as VizConfig['chartKind'],
                    }))
                  }
                >
                  <option value="line">Line</option>
                  <option value="scatter">Scatter</option>
                  <option value="bar">Bar</option>
                </select>
              </label>
              <label className="field">
                <span>Line</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={cfg.strokeWidth}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      strokeWidth: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Points</span>
                <input
                  type="range"
                  min={2}
                  max={12}
                  value={cfg.pointRadius}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      pointRadius: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
          )}

          <div className="settings-block">
            <div className="settings-grid">
              <label className="field">
                <span>Coordinates</span>
                <select
                  value={graphPlan.coordinateSystem}
                  onChange={(e) => {
                    const system = e.target.value as CoordinateSystem
                    setGraphPlan((p) => ({
                      ...p,
                      coordinateSystem: system,
                      usePixels: system === 'polar' ? false : p.usePixels,
                      bounds:
                        coordinateRows.length > 0
                          ? suggestGraphBounds(coordinateRows, system)
                          : defaultGraphBounds(system),
                    }))
                  }}
                >
                  <option value="rectangular">Rectangular</option>
                  <option value="polar">Polar</option>
                </select>
              </label>

              <label className="field">
                <span>Points / sec</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="leave blank for all at once"
                  value={
                    graphPlan.pointsPerSecond == null
                      ? ''
                      : graphPlan.pointsPerSecond
                  }
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    if (raw === '') {
                      setGraphPlan((p) => ({ ...p, pointsPerSecond: null }))
                      return
                    }
                    const n = Number.parseFloat(raw)
                    setGraphPlan((p) => ({
                      ...p,
                      pointsPerSecond:
                        Number.isFinite(n) && n > 0 ? n : null,
                    }))
                  }}
                />
              </label>

              <label className="field">
                <span>Scale</span>
                <select
                  value={graphPlan.inputScaleType}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      inputScaleType: e.target
                        .value as GraphPlanConfig['inputScaleType'],
                    }))
                  }
                >
                  <option value="linear">Linear</option>
                  <option value="logarithmic">Log</option>
                  <option value="polynomial">Poly</option>
                </select>
              </label>

              <label className="field">
                <span>Point count</span>
                <input
                  type="number"
                  min={10}
                  max={20000}
                  step={10}
                  value={graphPlan.pointCount}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    setGraphPlan((p) => ({
                      ...p,
                      pointCount: Number.isFinite(n)
                        ? Math.max(10, Math.min(20000, n))
                        : p.pointCount,
                    }))
                  }}
                />
              </label>

              <div className="checkbox-row">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) =>
                      setGraphPlan((p) => ({
                        ...p,
                        gridLines: e.target.checked ? 'yes' : 'no',
                      }))
                    }
                  />
                  Grid lines
                </label>
                {!isPolar && (
                  <label className="checkbox-inline">
                    <input
                      type="checkbox"
                      checked={graphPlan.usePixels}
                      onChange={(e) =>
                        setGraphPlan((p) => ({
                          ...p,
                          usePixels: e.target.checked,
                        }))
                      }
                    />
                    Pixels
                  </label>
                )}
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={graphPlan.threeD === 'yes-with-color'}
                    onChange={(e) =>
                      setGraphPlan((p) => ({
                        ...p,
                        threeD: e.target.checked ? 'yes-with-color' : 'no',
                      }))
                    }
                  />
                  3D
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={graphPlan.multicolored === 'yes'}
                    onChange={(e) =>
                      setGraphPlan((p) => ({
                        ...p,
                        multicolored: e.target.checked ? 'yes' : 'no',
                      }))
                    }
                  />
                  Multicolor
                </label>
              </div>

              <div className="bounds-row">
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'R min' : 'X min'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={graphPlan.bounds.xMin}
                    onChange={(e) => setBound('xMin', e.target.value)}
                  />
                </label>
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'R max' : 'X max'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={graphPlan.bounds.xMax}
                    onChange={(e) => setBound('xMax', e.target.value)}
                  />
                </label>
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'θ min' : 'Y min'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={graphPlan.bounds.yMin}
                    onChange={(e) => setBound('yMin', e.target.value)}
                  />
                </label>
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'θ max' : 'Y max'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={graphPlan.bounds.yMax}
                    onChange={(e) => setBound('yMax', e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="create-graph-row">
              <button
                type="button"
                className="create-graph-btn"
                disabled={!canCreateGraph || createGraphProgress != null}
                title={
                  canCreateGraph
                    ? 'Open full-screen graph in a new tab'
                    : 'Load a CSV first'
                }
                onClick={onCreateGraph}
              >
                Create graph
              </button>
              <p className="create-graph-hint">
                Opens a new tab with the graph only (read-only).
              </p>
            </div>
          </div>
        </div>
      </div>

      {createGraphProgress ? (
        <div className="create-graph-overlay" role="dialog" aria-modal="true">
          <div className="create-graph-overlay__panel">
            <p className="create-graph-overlay__title">Creating graph</p>
            <ProgressBar
              value={createGraphProgress.value}
              label={createGraphProgress.message}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
