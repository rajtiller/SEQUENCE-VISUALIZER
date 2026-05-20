import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { DataChart } from './components/DataChart'
import { DeferredNumberInput } from './components/DeferredNumberInput'
import { ListFileInput } from './components/ListFileInput'
import { PixelGridChart } from './components/PixelGridChart'
import type { CoordinateRow } from './lib/parseCsv'
import {
  emptyListsInput,
  listsInputLabel,
  mergeListsToCoordinateRows,
  parseNumberList,
  type InputMode,
  type ListsInput,
} from './lib/dataInput'
import { parseCsvWithPreset } from './lib/presetCsv'
import {
  defaultGraphBounds,
  defaultGraphPlanConfig,
  defaultPreviewPointCount,
  normalizeGraphBounds,
  normalizeColorConfig,
  sliceToPointLimit,
  type CoordinateSystem,
  type GraphBounds,
  type GraphPlanConfig,
} from './lib/graphPlanConfig'
import { normalizeGraphPlan } from './lib/presetCsv'
import { buildPixelCellFills, withColorSourceForData } from './lib/applyPointColors'
import {
  coerceColorSource,
  type ColorMappingMode,
  type ColorSource,
} from './lib/colorConfig'
import { suggestPreviewBounds } from './lib/previewBounds'
import {
  plotRows,
  previewRows,
  resolveChartPoints,
} from './lib/buildChartData'
import {
  openGraphInNewTab,
  saveGraphExportAsync,
  shouldShowGraphProgress,
} from './lib/graphExport'
import { ProgressBar } from './components/ProgressBar'
import {
  DEFAULT_HISTOGRAM_INTERVAL,
  defaultVizConfig,
  type VizConfig,
} from './lib/vizConfig'
import './App.css'

const PREVIEW_ROW_COUNT = 4

function App() {
  const [inputMode, setInputMode] = useState<InputMode>('combined')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [listWarning, setListWarning] = useState<string | null>(null)
  const [combinedRows, setCombinedRows] = useState<CoordinateRow[]>([])
  const [combinedHasZ, setCombinedHasZ] = useState(false)
  const [lists, setLists] = useState<ListsInput>(() => emptyListsInput())
  const [cfg, setCfg] = useState<VizConfig>(() => defaultVizConfig())
  const [graphPlan, setGraphPlan] = useState<GraphPlanConfig>(() =>
    defaultGraphPlanConfig(),
  )

  const applyTable = useCallback(
    (text: string, name: string | null) => {
      setParseError(null)
      setListWarning(null)
      try {
        const parsed = parseCsvWithPreset(text)
        if (parsed.rows.length === 0) {
          setParseError(
            'No points found. Each line needs at least two numbers: x, y (optional z).',
          )
          setCombinedRows([])
          setCombinedHasZ(false)
          setFileName(name)
          return
        }
        setInputMode('combined')
        setCombinedRows(parsed.rows)
        setCombinedHasZ(parsed.hasZ)
        setFileName(name)
        if (parsed.preset) {
          setGraphPlan(
            normalizeGraphPlan(parsed.preset.graphPlan, {
              hasZ: parsed.hasZ,
            }),
          )
          setCfg(parsed.preset.vizConfig)
        } else {
          const previewN = defaultPreviewPointCount(parsed.rows.length)
          setGraphPlan((p) => ({
            ...p,
            previewPointCount: previewN,
            pointCount: null,
            color: withColorSourceForData(undefined, parsed.hasZ),
            bounds: suggestPreviewBounds(
              sliceToPointLimit(parsed.rows, previewN),
              p.coordinateSystem,
              cfg,
            ),
          }))
        }
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Could not parse CSV.')
        setCombinedRows([])
        setCombinedHasZ(false)
        setFileName(name)
      }
    },
    [cfg],
  )

  const applyListFile = useCallback(
    (key: 'x' | 'y' | 'z', text: string, name: string) => {
      setParseError(null)
      const values = parseNumberList(text)
      if (values.length === 0) {
        setParseError(`No numbers found in ${key.toUpperCase()} list.`)
        return
      }
      setLists((prev) => {
        const next = {
          ...prev,
          [key]: { values, fileName: name },
        }
        const merged = mergeListsToCoordinateRows(
          next.x.values,
          next.y.values,
          next.z.values.length > 0 ? next.z.values : undefined,
        )
        setListWarning(merged.error)
        if (merged.rows.length > 0) {
          setGraphPlan((gp) => {
            const previewN =
              gp.previewPointCount ??
              defaultPreviewPointCount(merged.rows.length)
            return {
              ...gp,
              previewPointCount: previewN,
              color: withColorSourceForData(gp.color, merged.hasZ),
              bounds: suggestPreviewBounds(
                sliceToPointLimit(merged.rows, previewN),
                gp.coordinateSystem,
                cfg,
              ),
            }
          })
        }
        return next
      })
    },
    [cfg],
  )

  const clearList = useCallback((key: 'x' | 'y' | 'z') => {
    setLists((prev) => {
      const next = { ...prev, [key]: { values: [], fileName: null } }
      const merged = mergeListsToCoordinateRows(
        next.x.values,
        next.y.values,
        next.z.values.length > 0 ? next.z.values : undefined,
      )
      setListWarning(merged.error)
      return next
    })
  }, [])

  const readListFile = useCallback(
    (key: 'x' | 'y' | 'z', file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        applyListFile(key, text, file.name)
      }
      reader.onerror = () => setParseError(`Failed to read ${key.toUpperCase()} file.`)
      reader.readAsText(file)
    },
    [applyListFile],
  )

  const listsDerived = useMemo(
    () =>
      mergeListsToCoordinateRows(
        lists.x.values,
        lists.y.values,
        lists.z.values.length > 0 ? lists.z.values : undefined,
      ),
    [lists],
  )

  const coordinateRows =
    inputMode === 'combined' ? combinedRows : listsDerived.rows
  const hasZ = inputMode === 'combined' ? combinedHasZ : listsDerived.hasZ
  const displayFileName =
    inputMode === 'combined' ? fileName : listsInputLabel(lists)

  const plotRowsData = useMemo(
    () => plotRows(coordinateRows, graphPlan),
    [coordinateRows, graphPlan.pointCount],
  )

  const previewRowsData = useMemo(
    () => previewRows(coordinateRows, graphPlan),
    [coordinateRows, graphPlan.previewPointCount],
  )

  useEffect(() => {
    if (cfg.chartKind !== 'histogram' || previewRowsData.length === 0) return
    setGraphPlan((p) => ({
      ...p,
      bounds: suggestPreviewBounds(
        previewRowsData,
        p.coordinateSystem,
        cfg,
      ),
    }))
  }, [
    cfg.chartKind,
    cfg.histogramSource,
    cfg.histogramInterval,
    previewRowsData,
  ])

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

  const previewPoints = useMemo(
    () =>
      resolveChartPoints(previewRowsData, graphPlan, cfg, {
        hasZ,
        useRowsAsIs: true,
      }),
    [previewRowsData, graphPlan, cfg, hasZ],
  )

  const canCreateGraph = plotRowsData.length > 0
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
        coordinateRows: plotRowsData,
        graphPlan,
        vizConfig: cfg,
        fileName: displayFileName,
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
    plotRowsData,
    graphPlan,
    cfg,
    displayFileName,
    createGraphProgress,
  ])

  const previewTableRows = useMemo(
    () => previewRowsData.slice(0, PREVIEW_ROW_COUNT),
    [previewRowsData],
  )

  const commitPreviewPointCount = useCallback(
    (n: number | null) => {
      const previewCount = n != null && n > 0 ? Math.floor(n) : null
      setGraphPlan((p) => {
        const rows = sliceToPointLimit(coordinateRows, previewCount)
        return {
          ...p,
          previewPointCount: previewCount,
          bounds:
            rows.length > 0
              ? suggestPreviewBounds(rows, p.coordinateSystem, cfg)
              : p.bounds,
        }
      })
    },
    [coordinateRows, cfg],
  )

  const isPolar = graphPlan.coordinateSystem === 'polar'
  const showRectPixels = graphPlan.usePixels && !isPolar
  const showGrid = graphPlan.gridLines === 'yes'
  const threeDColorOn = graphPlan.threeD === 'yes-with-color'

  const previewCellFills = useMemo(() => {
    if (!threeDColorOn || !showRectPixels) return undefined
    return buildPixelCellFills(previewRowsData, graphPlan, hasZ)
  }, [previewRowsData, graphPlan, hasZ, threeDColorOn, showRectPixels])

  const patchColor = useCallback(
    (patch: Partial<GraphPlanConfig['color']>) => {
      setGraphPlan((p) => ({
        ...p,
        color: normalizeColorConfig({ ...p.color, ...patch }, hasZ),
      }))
    },
    [hasZ],
  )

  const commitBound = useCallback((key: keyof GraphBounds, n: number) => {
    setGraphPlan((p) => ({
      ...p,
      bounds: normalizeGraphBounds(
        { ...p.bounds, [key]: n },
        p.coordinateSystem,
      ),
    }))
  }, [])

  return (
    <div className="viz-app">
      <header className="viz-header-compact">
        <h1>CSV visualizer</h1>
        <p className="viz-tagline">
          {inputMode === 'lists'
            ? 'Separate lists · y-only uses row index as x'
            : isPolar
              ? 'x = radius, y = angle (rad)'
              : 'x, y per line · optional z'}
        </p>
      </header>

      <div className="viz-shell">
        <aside className="viz-data" aria-labelledby="data-heading">
          <h2 id="data-heading">Data</h2>

          <div className="input-mode-row" role="radiogroup" aria-label="Input format">
            <label className="input-mode-option">
              <input
                type="radio"
                name="input-mode"
                checked={inputMode === 'combined'}
                onChange={() => setInputMode('combined')}
              />
              Combined file
            </label>
            <label className="input-mode-option">
              <input
                type="radio"
                name="input-mode"
                checked={inputMode === 'lists'}
                onChange={() => setInputMode('lists')}
              />
              Separate lists
            </label>
          </div>

          {inputMode === 'combined' ? (
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
              {fileName ? '' : ' — x, y[, z] per line'}
            </label>
          ) : (
            <div className="lists-input-panel">
              <ListFileInput
                label="X list"
                fileName={lists.x.fileName}
                valueCount={lists.x.values.length}
                onFile={(f) => readListFile('x', f)}
                onClear={() => clearList('x')}
              />
              <ListFileInput
                label="Y list"
                hint="Y only → x is 0, 1, 2, … (histogram-ready)"
                fileName={lists.y.fileName}
                valueCount={lists.y.values.length}
                onFile={(f) => readListFile('y', f)}
                onClear={() => clearList('y')}
              />
              <ListFileInput
                label="Z list"
                optional
                fileName={lists.z.fileName}
                valueCount={lists.z.values.length}
                onFile={(f) => readListFile('z', f)}
                onClear={() => clearList('z')}
              />
            </div>
          )}

          {parseError && <p className="viz-error">{parseError}</p>}
          {inputMode === 'lists' && listWarning && (
            <p className="viz-warn">{listWarning}</p>
          )}

          {coordinateRows.length > 0 && (
            <p className="viz-meta">
              {previewRowsData.length.toLocaleString()} in preview
              {graphPlan.previewPointCount != null &&
              previewRowsData.length < coordinateRows.length
                ? ` of ${coordinateRows.length.toLocaleString()}`
                : ''}
              {plotRowsData.length !== previewRowsData.length
                ? ` · ${plotRowsData.length.toLocaleString()} plotted`
                : ''}
              {graphPlan.pointCount != null &&
              plotRowsData.length < coordinateRows.length
                ? ` (cap ${graphPlan.pointCount.toLocaleString()})`
                : ''}
              {hasZ ? ' · z' : ''}
              {previewTableRows.length > 0 &&
              previewTableRows.length <= PREVIEW_ROW_COUNT
                ? ` · first ${previewTableRows.length} in table`
                : ''}
            </p>
          )}

          {previewTableRows.length > 0 && (
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
                  {previewTableRows.map((row, i) => (
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
                rows={previewRowsData}
                bounds={graphPlan.bounds}
                showGrid={showGrid}
                cellFills={previewCellFills}
              />
            ) : (
              <DataChart
                points={previewPoints}
                kind={cfg.chartKind}
                showGrid={showGrid}
                strokeWidth={cfg.strokeWidth}
                pointRadius={cfg.pointRadius}
                bounds={graphPlan.bounds}
                useGraphBounds={!isPolar}
              />
            )}
          </div>

          {!showRectPixels && (
            <div className="preview-toggles">
              <label className="field">
                <span>Preview</span>
                <select
                  value={cfg.chartKind}
                  onChange={(e) => {
                    const chartKind = e.target.value as VizConfig['chartKind']
                    setCfg((c) => {
                      const next = { ...c, chartKind }
                      setGraphPlan((p) => {
                        const rows = sliceToPointLimit(
                          coordinateRows,
                          p.previewPointCount,
                        )
                        return rows.length > 0
                          ? {
                              ...p,
                              bounds: suggestPreviewBounds(
                                rows,
                                p.coordinateSystem,
                                next,
                              ),
                            }
                          : p
                      })
                      return next
                    })
                  }}
                >
                  <option value="line">Line</option>
                  <option value="scatter">Scatter</option>
                  <option value="bar">Bar</option>
                  <option value="histogram">Histogram</option>
                </select>
              </label>
              {cfg.chartKind === 'histogram' && (
                <label className="field">
                  <span>Bin data</span>
                  <select
                    value={cfg.histogramSource}
                    onChange={(e) =>
                      setCfg((c) => ({
                        ...c,
                        histogramSource: e.target.value as VizConfig['histogramSource'],
                      }))
                    }
                  >
                    <option value="x">{isPolar ? 'Radius (x)' : 'X'}</option>
                    <option value="y">{isPolar ? 'Angle θ (y)' : 'Y'}</option>
                  </select>
                </label>
              )}
              {cfg.chartKind === 'histogram' && (
                <label className="field">
                  <span>Interval</span>
                  <DeferredNumberInput
                    value={cfg.histogramInterval}
                    min={0}
                    onCommit={(n) =>
                      setCfg((c) => ({
                        ...c,
                        histogramInterval:
                          n > 0 ? n : DEFAULT_HISTOGRAM_INTERVAL,
                      }))
                    }
                  />
                </label>
              )}
              {cfg.chartKind !== 'histogram' && (
                <>
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
                </>
              )}
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
                          ? suggestPreviewBounds(
                              sliceToPointLimit(
                                coordinateRows,
                                p.previewPointCount,
                              ),
                              system,
                              cfg,
                            )
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
                <DeferredNumberInput
                  optional
                  placeholder="all at once"
                  value={graphPlan.pointsPerSecond}
                  min={0}
                  onCommit={(n) =>
                    setGraphPlan((p) => ({
                      ...p,
                      pointsPerSecond: n != null && n > 0 ? n : null,
                    }))
                  }
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
                <span>Preview n points</span>
                <DeferredNumberInput
                  optional
                  integer
                  placeholder="all"
                  value={graphPlan.previewPointCount}
                  min={1}
                  onCommit={commitPreviewPointCount}
                />
              </label>

              <label className="field">
                <span>Plot n points</span>
                <DeferredNumberInput
                  optional
                  integer
                  placeholder="all"
                  value={graphPlan.pointCount}
                  min={1}
                  onCommit={(n) =>
                    setGraphPlan((p) => ({
                      ...p,
                      pointCount: n != null && n > 0 ? Math.floor(n) : null,
                    }))
                  }
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
                    checked={threeDColorOn}
                    onChange={(e) =>
                      setGraphPlan((p) => ({
                        ...p,
                        threeD: e.target.checked ? 'yes-with-color' : 'no',
                        color: e.target.checked
                          ? withColorSourceForData(p.color, hasZ)
                          : p.color,
                      }))
                    }
                  />
                  3D (color)
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={graphPlan.multicolored === 'yes'}
                    disabled={threeDColorOn}
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

              {threeDColorOn && (
                <div className="color-settings">
                  <label className="field">
                    <span>Color from</span>
                    <select
                      value={graphPlan.color.source}
                      onChange={(e) =>
                        patchColor({
                          source: coerceColorSource(
                            e.target.value as ColorSource,
                            hasZ,
                          ),
                        })
                      }
                    >
                      <option value="x">{isPolar ? 'Radius (x)' : 'X'}</option>
                      <option value="y">{isPolar ? 'Angle θ (y)' : 'Y'}</option>
                      {hasZ && <option value="z">Z</option>}
                    </select>
                  </label>
                  <label className="metric">
                    <span className="metric-label">Value at 0</span>
                    <DeferredNumberInput
                      optional
                      value={graphPlan.color.valueMin}
                      placeholder="auto (min)"
                      onCommit={(n) => patchColor({ valueMin: n })}
                    />
                  </label>
                  <label className="metric">
                    <span className="metric-label">Value at 255</span>
                    <DeferredNumberInput
                      optional
                      value={graphPlan.color.valueMax}
                      placeholder="auto (max)"
                      onCommit={(n) => patchColor({ valueMax: n })}
                    />
                  </label>
                  <label className="field color-swatch-field">
                    <span>Low color</span>
                    <input
                      type="color"
                      value={
                        graphPlan.color.colorLow.startsWith('#')
                          ? graphPlan.color.colorLow
                          : '#0f172a'
                      }
                      onChange={(e) =>
                        patchColor({ colorLow: e.target.value })
                      }
                    />
                  </label>
                  <label className="field color-swatch-field">
                    <span>High color</span>
                    <input
                      type="color"
                      value={
                        graphPlan.color.colorHigh.startsWith('#')
                          ? graphPlan.color.colorHigh
                          : '#38bdf8'
                      }
                      onChange={(e) =>
                        patchColor({ colorHigh: e.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Mapping</span>
                    <select
                      value={graphPlan.color.mappingMode}
                      onChange={(e) =>
                        patchColor({
                          mappingMode: e.target.value as ColorMappingMode,
                        })
                      }
                    >
                      <option value="linear">Linear (0–255)</option>
                      <option value="custom">Custom (mod 256)</option>
                    </select>
                  </label>
                  {graphPlan.color.mappingMode === 'custom' && (
                    <label className="field color-expr-field">
                      <span>Custom f(v)</span>
                      <input
                        type="text"
                        className="color-expr-input"
                        value={graphPlan.color.customExpression}
                        placeholder="e.g. 255 - v, v * 2, (v + 40) % 256"
                        spellCheck={false}
                        onChange={(e) =>
                          patchColor({ customExpression: e.target.value })
                        }
                      />
                      <span className="field-hint">
                        v is 0–255 after scaling; result mod 256 picks color.
                      </span>
                    </label>
                  )}
                </div>
              )}

              <div className="bounds-row">
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'R min' : 'X min'}
                  </span>
                  <DeferredNumberInput
                    value={graphPlan.bounds.xMin}
                    onCommit={(n) => commitBound('xMin', n)}
                  />
                </label>
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'R max' : 'X max'}
                  </span>
                  <DeferredNumberInput
                    value={graphPlan.bounds.xMax}
                    onCommit={(n) => commitBound('xMax', n)}
                  />
                </label>
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'θ min' : 'Y min'}
                  </span>
                  <DeferredNumberInput
                    value={graphPlan.bounds.yMin}
                    onCommit={(n) => commitBound('yMin', n)}
                  />
                </label>
                <label className="metric">
                  <span className="metric-label">
                    {isPolar ? 'θ max' : 'Y max'}
                  </span>
                  <DeferredNumberInput
                    value={graphPlan.bounds.yMax}
                    onCommit={(n) => commitBound('yMax', n)}
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
