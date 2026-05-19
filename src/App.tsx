import { useCallback, useMemo, useState, type DragEvent } from 'react'
import { DataChart, type ChartPoint } from './components/DataChart'
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
import { rowsToCartesianPoints } from './lib/polarGrid'
import { defaultVizConfig, type VizConfig } from './lib/vizConfig'
import './App.css'

function buildChartPoints(
  rows: CoordinateRow[],
  cfg: VizConfig,
  maxPoints: number,
): ChartPoint[] {
  const cap = Math.max(1, Math.min(maxPoints, 20_000))
  const slice = rows.slice(0, cap)

  if (cfg.chartKind === 'bar') {
    return slice.map((row, i) => ({
      x: i,
      y: row.y,
      z: row.z,
      label: String(row.x),
    }))
  }

  return slice.map((row) => ({
    x: row.x,
    y: row.y,
    z: row.z,
    label: String(row.x),
  }))
}

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

  const rowsForChart = useMemo(() => {
    const cap = Math.max(
      1,
      Math.min(graphPlan.pointCount, 20_000, coordinateRows.length),
    )
    return coordinateRows.slice(0, cap)
  }, [coordinateRows, graphPlan.pointCount])

  const points = useMemo(() => {
    if (rowsForChart.length === 0) return []
    if (graphPlan.coordinateSystem === 'polar') {
      return rowsToCartesianPoints(rowsForChart).map((p, i) => ({
        ...p,
        label: String(rowsForChart[i].x),
      }))
    }
    return buildChartPoints(rowsForChart, cfg, rowsForChart.length)
  }, [rowsForChart, graphPlan.coordinateSystem, cfg])

  const previewRows = useMemo(
    () => coordinateRows.slice(0, 12),
    [coordinateRows],
  )

  const isPolar = graphPlan.coordinateSystem === 'polar'
  const showRectPixels = graphPlan.usePixels && !isPolar

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
      <header className="viz-header">
        <h1>CSV visualizer</h1>
        <p className="viz-lead">
          {isPolar
            ? 'Each line: x = radius, y = angle in radians (from +x). Optional z. Comma- or space-separated.'
            : 'Each line: x, y, and optional z. Comma- or space-separated.'}
        </p>
      </header>

      <div className="viz-layout">
        <section className="viz-panel" aria-labelledby="data-heading">
          <h2 id="data-heading">Data</h2>

          <label
            className="file-drop"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <span className="file-drop-title">
              {fileName ? fileName : 'Choose a CSV file'}
            </span>
            <span className="file-drop-hint">or drop a file (click to browse)</span>
          </label>

          {parseError && <p className="viz-error">{parseError}</p>}

          {coordinateRows.length > 0 && (
            <p className="viz-meta">
              {coordinateRows.length} point{coordinateRows.length === 1 ? '' : 's'}
              {hasZ ? ' · includes z' : ''}
            </p>
          )}

          {previewRows.length > 0 && (
            <div className="table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>{isPolar ? 'r' : 'x'}</th>
                    <th>{isPolar ? 'θ (rad)' : 'y'}</th>
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
              {coordinateRows.length > previewRows.length && (
                <p className="table-note">
                  Showing first {previewRows.length} rows of{' '}
                  {coordinateRows.length}.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="viz-panel" aria-labelledby="settings-heading">
          <h2 id="settings-heading">Visualization</h2>

          <div className="plan-section">
            <h3 className="plan-section-title">Preview</h3>
            {!showRectPixels && (
            <div className="field-grid">
              <label className="field">
                <span>Chart type (preview)</span>
                <select
                  value={cfg.chartKind}
                  onChange={(e) =>
                    setCfg((c) => ({
                      ...c,
                      chartKind: e.target.value as VizConfig['chartKind'],
                    }))
                  }
                >
                  <option value="line">Line (numeric X and Y)</option>
                  <option value="scatter">Scatter (numeric X and Y)</option>
                  <option value="bar">Bar (y by row index; x as label)</option>
                </select>
              </label>

              <label className="field">
                <span>Line width</span>
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
                <span>Point size</span>
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
          </div>

          <div className="chart-wrap chart-wrap-preview">
            {showRectPixels ? (
              <PixelGridChart
                rows={coordinateRows}
                bounds={graphPlan.bounds}
                showGrid={graphPlan.gridLines === 'yes'}
              />
            ) : (
              <DataChart
                points={points}
                kind={cfg.chartKind}
                showGrid={graphPlan.gridLines === 'yes'}
                strokeWidth={cfg.strokeWidth}
                pointRadius={cfg.pointRadius}
              />
            )}
          </div>

          {showRectPixels && coordinateRows.length > 0 && (
            <p className="chart-caption chart-caption-preview">
              Rectangles: each (x, y) fills one unit cell; bounds set grid size.
            </p>
          )}
          {!showRectPixels && points.length > 0 && (
            <p className="chart-caption chart-caption-preview">
              Preview: {points.length} point{points.length === 1 ? '' : 's'}
              {isPolar
                ? ' (polar → Cartesian for plot; capped by point count).'
                : ` (x, y${hasZ ? ', z' : ''} per line; capped by point count).`}
            </p>
          )}

          <div className="plan-section">
            <h3 className="plan-section-title">Options</h3>
            <div className="field-grid">
              <label className="field">
                <span>1. Graph type</span>
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
                  <option value="rectangular">Rectangular coordinates</option>
                  <option value="polar">Polar coordinates</option>
                </select>
              </label>

              {!isPolar && (
                <label className="field checkbox-field">
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
                  <span>Pixels (filled rectangles on the grid)</span>
                </label>
              )}

              <label className="field">
                <span>2. Grid lines</span>
                <select
                  value={graphPlan.gridLines}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      gridLines: e.target.value as GraphPlanConfig['gridLines'],
                    }))
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label className="field">
                <span>3. Point types</span>
                <select
                  value={graphPlan.pointType}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      pointType: e.target.value as GraphPlanConfig['pointType'],
                    }))
                  }
                >
                  <option value="circle">Circle</option>
                  <option value="rectangle">Rectangles</option>
                </select>
              </label>

              <label className="field">
                <span>4. Display method</span>
                <select
                  value={graphPlan.displayMethod}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      displayMethod: e.target
                        .value as GraphPlanConfig['displayMethod'],
                    }))
                  }
                >
                  <option value="all-at-once">All at once</option>
                  <option value="one-point-at-a-time">
                    One point at a time
                  </option>
                </select>
              </label>

              <label className="field">
                <span>5. 3D</span>
                <select
                  value={graphPlan.threeD}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      threeD: e.target.value as GraphPlanConfig['threeD'],
                    }))
                  }
                >
                  <option value="yes-with-color">Yes, with color</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label className="field">
                <span>6. Multicolored points</span>
                <select
                  value={graphPlan.multicolored}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      multicolored: e.target
                        .value as GraphPlanConfig['multicolored'],
                    }))
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>

              <label className="field">
                <span>7. Trendline</span>
                <select
                  value={graphPlan.trendline}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      trendline: e.target.value as GraphPlanConfig['trendline'],
                    }))
                  }
                >
                  <option value="none">None</option>
                  <option value="linear">Linear</option>
                  <option value="polynomial">Polynomial</option>
                </select>
              </label>
            </div>
          </div>

          <div className="plan-section">
            <h3 className="plan-section-title">Input</h3>
            <div className="field-grid">
              <div className="field bounds-field">
                <span>1. Graph bounds</span>
                <p className="field-hint">
                  {isPolar
                    ? 'R and angle (radians) shown on the polar plot.'
                    : 'X and Y limits; each integer (x, y) is one rectangle when Pixels is on.'}
                </p>
                <div className="bounds-grid">
                  <label className="metric">
                    <span className="metric-label">
                      {isPolar ? 'R lower' : 'X lower'}
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
                      {isPolar ? 'R upper' : 'X upper'}
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
                      {isPolar ? 'Angle lower (rad)' : 'Y lower'}
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
                      {isPolar ? 'Angle upper (rad)' : 'Y upper'}
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

              <label className="field">
                <span>2. Graph type</span>
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
                  <option value="logarithmic">Logarithmic</option>
                  <option value="polynomial">Polynomial</option>
                </select>
              </label>

              <label className="field">
                <span>3. Point count</span>
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

              <label className="field">
                <span>4. Points</span>
                <select
                  value={graphPlan.pointsLayout}
                  onChange={(e) =>
                    setGraphPlan((p) => ({
                      ...p,
                      pointsLayout: e.target
                        .value as GraphPlanConfig['pointsLayout'],
                    }))
                  }
                >
                  <option value="rows-xy">Rows of x, y (optional z)</option>
                </select>
              </label>
            </div>
          </div>

          <div className="create-graph-row">
            <button
              type="button"
              className="create-graph-btn"
              disabled
              title="Not wired yet"
            >
              Create graph
            </button>
            <p className="create-graph-hint">
              Options above are saved in the form only; this button does not
              build a graph yet.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
