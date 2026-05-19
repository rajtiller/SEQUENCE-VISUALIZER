import type { CoordinateRow } from './parseCsv'
import type { GraphPlanConfig } from './graphPlanConfig'
import { normalizeVizConfig, type VizConfig } from './vizConfig'
import { yieldToMain } from './yieldToMain'

export type GraphExportPayload = {
  coordinateRows: CoordinateRow[]
  graphPlan: GraphPlanConfig
  vizConfig: VizConfig
  fileName?: string | null
}

function normalizePayload(payload: GraphExportPayload): GraphExportPayload {
  return {
    ...payload,
    vizConfig: normalizeVizConfig(payload.vizConfig),
  }
}

const STORAGE_KEY = 'sequence-viz-graph-export'
const META_KEY = 'sequence-viz-graph-export-meta'
const CHUNK_COUNT_KEY = 'sequence-viz-graph-export-chunk-count'
const CHUNK_PREFIX = 'sequence-viz-graph-export-rows-'

const SAVE_CHUNK_SIZE = 5000

/** Show progress UI when row count is at or above this threshold. */
export const GRAPH_PROGRESS_ROW_THRESHOLD = 2000

export type GraphExportProgress = (fraction: number, message: string) => void

export type SaveGraphExportResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * localStorage is shared across tabs from the same origin.
 * sessionStorage is per-tab, so a graph opened in a new tab would not see it.
 */
function store(): Storage {
  return localStorage
}

export function shouldShowGraphProgress(rowCount: number): boolean {
  return rowCount >= GRAPH_PROGRESS_ROW_THRESHOLD
}

export function clearGraphExport(): void {
  const s = store()
  s.removeItem(STORAGE_KEY)
  s.removeItem(META_KEY)
  const countRaw = s.getItem(CHUNK_COUNT_KEY)
  s.removeItem(CHUNK_COUNT_KEY)
  if (countRaw) {
    const count = Number.parseInt(countRaw, 10)
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i += 1) {
        s.removeItem(CHUNK_PREFIX + i)
      }
    }
  }
}

export function saveGraphExport(payload: GraphExportPayload): void {
  clearGraphExport()
  store().setItem(STORAGE_KEY, JSON.stringify(payload))
}

export async function saveGraphExportAsync(
  payload: GraphExportPayload,
  onProgress: GraphExportProgress,
): Promise<SaveGraphExportResult> {
  clearGraphExport()
  const { coordinateRows, graphPlan, vizConfig, fileName } = payload
  const n = coordinateRows.length
  const s = store()

  if (!shouldShowGraphProgress(n)) {
    try {
      onProgress(0.5, 'Saving graph…')
      await yieldToMain()
      s.setItem(STORAGE_KEY, JSON.stringify(payload))
      onProgress(1, 'Opening graph…')
      return { ok: true }
    } catch (e) {
      return storageErrorResult(e)
    }
  }

  try {
    const meta = {
      graphPlan,
      vizConfig,
      fileName: fileName ?? null,
      rowCount: n,
    }
    s.setItem(META_KEY, JSON.stringify(meta))
    onProgress(0.05, 'Saving graph settings…')
    await yieldToMain()

    const chunkCount = Math.ceil(n / SAVE_CHUNK_SIZE)
    for (let i = 0; i < chunkCount; i += 1) {
      const slice = coordinateRows.slice(
        i * SAVE_CHUNK_SIZE,
        (i + 1) * SAVE_CHUNK_SIZE,
      )
      s.setItem(CHUNK_PREFIX + i, JSON.stringify(slice))
      const done = Math.min((i + 1) * SAVE_CHUNK_SIZE, n)
      onProgress(
        0.05 + (0.9 * (i + 1)) / chunkCount,
        `Saving points ${done.toLocaleString()} / ${n.toLocaleString()}…`,
      )
      await yieldToMain()
    }
    s.setItem(CHUNK_COUNT_KEY, String(chunkCount))
    onProgress(1, 'Opening graph…')
    return { ok: true }
  } catch (e) {
    clearGraphExport()
    return storageErrorResult(e)
  }
}

function storageErrorResult(e: unknown): SaveGraphExportResult {
  if (e instanceof DOMException && e.name === 'QuotaExceededError') {
    return {
      ok: false,
      error:
        'Graph is too large for browser storage. Try fewer points or a smaller CSV.',
    }
  }
  return { ok: false, error: 'Could not save graph for the new tab.' }
}

export function loadGraphExport(): GraphExportPayload | null {
  const s = store()
  const legacy = s.getItem(STORAGE_KEY)
  if (legacy) {
    try {
      return normalizePayload(JSON.parse(legacy) as GraphExportPayload)
    } catch {
      return null
    }
  }

  const metaRaw = s.getItem(META_KEY)
  const chunkCountRaw = s.getItem(CHUNK_COUNT_KEY)
  if (!metaRaw || !chunkCountRaw) return null

  try {
    const meta = JSON.parse(metaRaw) as {
      graphPlan: GraphPlanConfig
      vizConfig: VizConfig
      fileName: string | null
      rowCount: number
    }
    const chunkCount = Number.parseInt(chunkCountRaw, 10)
    if (!Number.isFinite(chunkCount) || chunkCount < 1) return null

    const coordinateRows: CoordinateRow[] = []
    for (let i = 0; i < chunkCount; i += 1) {
      const chunkRaw = s.getItem(CHUNK_PREFIX + i)
      if (!chunkRaw) return null
      coordinateRows.push(...(JSON.parse(chunkRaw) as CoordinateRow[]))
    }

    return normalizePayload({
      coordinateRows,
      graphPlan: meta.graphPlan,
      vizConfig: meta.vizConfig,
      fileName: meta.fileName,
    })
  } catch {
    return null
  }
}

export async function loadGraphExportAsync(
  onProgress?: GraphExportProgress,
): Promise<GraphExportPayload | null> {
  const s = store()
  const legacy = s.getItem(STORAGE_KEY)
  if (legacy) {
    onProgress?.(0.2, 'Loading graph data…')
    await yieldToMain()
    try {
      const payload = normalizePayload(JSON.parse(legacy) as GraphExportPayload)
      onProgress?.(1, 'Loaded')
      return payload
    } catch {
      return null
    }
  }

  const metaRaw = s.getItem(META_KEY)
  const chunkCountRaw = s.getItem(CHUNK_COUNT_KEY)
  if (!metaRaw || !chunkCountRaw) return null

  try {
    const meta = JSON.parse(metaRaw) as {
      graphPlan: GraphPlanConfig
      vizConfig: VizConfig
      fileName: string | null
      rowCount: number
    }
    const chunkCount = Number.parseInt(chunkCountRaw, 10)
    if (!Number.isFinite(chunkCount) || chunkCount < 1) return null

    const coordinateRows: CoordinateRow[] = []
    for (let i = 0; i < chunkCount; i += 1) {
      const chunkRaw = s.getItem(CHUNK_PREFIX + i)
      if (!chunkRaw) return null
      coordinateRows.push(...(JSON.parse(chunkRaw) as CoordinateRow[]))
      const done = coordinateRows.length
      onProgress?.(
        ((i + 1) / chunkCount) * 0.45,
        `Loading points ${done.toLocaleString()} / ${meta.rowCount.toLocaleString()}…`,
      )
      await yieldToMain()
    }

    onProgress?.(0.5, 'Loaded')
    return normalizePayload({
      coordinateRows,
      graphPlan: meta.graphPlan,
      vizConfig: meta.vizConfig,
      fileName: meta.fileName,
    })
  } catch {
    return null
  }
}

export function openGraphInNewTab(): void {
  const url = new URL(window.location.href)
  url.hash = '#/graph'
  window.open(url.toString(), '_blank', 'noopener,noreferrer')
}

export function isGraphViewRoute(): boolean {
  const hash = window.location.hash.replace(/^#/, '')
  return hash === '/graph' || hash === 'graph'
}

export function estimateGraphExportRowCount(): number | null {
  const s = store()
  const metaRaw = s.getItem(META_KEY)
  if (metaRaw) {
    try {
      const meta = JSON.parse(metaRaw) as { rowCount: number }
      if (Number.isFinite(meta.rowCount)) return meta.rowCount
    } catch {
      return null
    }
  }
  const legacy = s.getItem(STORAGE_KEY)
  if (!legacy) return null
  try {
    const payload = JSON.parse(legacy) as GraphExportPayload
    return payload.coordinateRows.length
  } catch {
    return null
  }
}

export function hasGraphExportData(): boolean {
  const s = store()
  return s.getItem(STORAGE_KEY) != null || s.getItem(META_KEY) != null
}
