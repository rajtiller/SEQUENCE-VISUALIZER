import type { CoordinateRow } from './parseCsv'
import { parseCoordinateCsv } from './parseCsv'
import type { GraphExportPayload } from './graphExport'
import {
  defaultGraphPlanConfig,
  normalizeGraphBounds,
  type CoordinateSystem,
  type GraphPlanConfig,
  type GridLinesChoice,
  type InputScaleTypeChoice,
  type MulticoloredChoice,
  type ThreeDChoice,
} from './graphPlanConfig'
import { normalizeVizConfig, type VizConfig } from './vizConfig'

export const PRESET_MARKER = '# sequence-viz-preset v1'

export type SequenceVizPreset = {
  version: 1
  graphPlan: GraphPlanConfig
  vizConfig: VizConfig
}

export type ParsedCsvWithPreset = {
  rows: CoordinateRow[]
  hasZ: boolean
  preset: SequenceVizPreset | null
}

const COORD_SYSTEMS: CoordinateSystem[] = ['rectangular', 'polar']
const GRID_LINES: GridLinesChoice[] = ['yes', 'no']
const THREE_D: ThreeDChoice[] = ['yes-with-color', 'no']
const MULTI: MulticoloredChoice[] = ['yes', 'no']
const SCALE_TYPES: InputScaleTypeChoice[] = ['linear', 'logarithmic', 'polynomial']

export function normalizeGraphPlan(
  value: Partial<GraphPlanConfig> | null | undefined,
): GraphPlanConfig {
  const d = defaultGraphPlanConfig()
  if (!value) return d

  const coordinateSystem = COORD_SYSTEMS.includes(
    value.coordinateSystem as CoordinateSystem,
  )
    ? (value.coordinateSystem as CoordinateSystem)
    : d.coordinateSystem

  const gridLines = GRID_LINES.includes(value.gridLines as GridLinesChoice)
    ? (value.gridLines as GridLinesChoice)
    : d.gridLines

  const threeD = THREE_D.includes(value.threeD as ThreeDChoice)
    ? (value.threeD as ThreeDChoice)
    : d.threeD

  const multicolored = MULTI.includes(value.multicolored as MulticoloredChoice)
    ? (value.multicolored as MulticoloredChoice)
    : d.multicolored

  const inputScaleType = SCALE_TYPES.includes(
    value.inputScaleType as InputScaleTypeChoice,
  )
    ? (value.inputScaleType as InputScaleTypeChoice)
    : d.inputScaleType

  let pointsPerSecond: number | null = d.pointsPerSecond
  if (value.pointsPerSecond === null) {
    pointsPerSecond = null
  } else if (Number.isFinite(value.pointsPerSecond) && value.pointsPerSecond! > 0) {
    pointsPerSecond = value.pointsPerSecond!
  }

  let pointCount: number | null = d.pointCount
  if (value.pointCount === null) {
    pointCount = null
  } else if (Number.isFinite(value.pointCount) && value.pointCount! > 0) {
    pointCount = Math.floor(value.pointCount!)
  }

  let previewPointCount: number | null = d.previewPointCount
  if (value.previewPointCount === null) {
    previewPointCount = null
  } else if (
    Number.isFinite(value.previewPointCount) &&
    value.previewPointCount! > 0
  ) {
    previewPointCount = Math.floor(value.previewPointCount!)
  }

  return {
    coordinateSystem,
    usePixels: Boolean(value.usePixels),
    gridLines,
    pointsPerSecond,
    threeD,
    multicolored,
    bounds: normalizeGraphBounds(
      value.bounds ?? d.bounds,
      coordinateSystem,
    ),
    inputScaleType,
    pointCount,
    previewPointCount,
    pointsLayout: 'rows-xy',
  }
}

function parsePresetJson(raw: string): SequenceVizPreset | null {
  try {
    const data = JSON.parse(raw) as {
      version?: number
      graphPlan?: Partial<GraphPlanConfig>
      vizConfig?: Partial<VizConfig>
    }
    if (!data.graphPlan && !data.vizConfig) return null
    return {
      version: 1,
      graphPlan: normalizeGraphPlan(data.graphPlan),
      vizConfig: normalizeVizConfig(data.vizConfig),
    }
  } catch {
    return null
  }
}

function stripPresetHeaderLines(text: string): {
  preset: SequenceVizPreset | null
  body: string
} {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  let preset: SequenceVizPreset | null = null
  const bodyLines: string[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith(PRESET_MARKER)) {
      const rest = trimmed.slice(PRESET_MARKER.length).trim()
      if (rest.startsWith('{')) {
        preset = parsePresetJson(rest)
      } else if (i + 1 < lines.length && lines[i + 1].trim().startsWith('{')) {
        preset = parsePresetJson(lines[i + 1].trim())
        i += 2
        continue
      }
      i += 1
      continue
    }

    if (!preset && trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const maybe = parsePresetJson(trimmed)
      if (maybe) {
        preset = maybe
        i += 1
        continue
      }
    }

    if (trimmed.startsWith('#')) {
      i += 1
      continue
    }

    break
  }

  for (; i < lines.length; i += 1) {
    bodyLines.push(lines[i])
  }

  return { preset, body: bodyLines.join('\n') }
}

export function parseCsvWithPreset(text: string): ParsedCsvWithPreset {
  const { preset, body } = stripPresetHeaderLines(text)
  const parsed = parseCoordinateCsv(body)
  return { ...parsed, preset }
}

export function buildPresetCsvText(payload: GraphExportPayload): string {
  const preset: SequenceVizPreset = {
    version: 1,
    graphPlan: normalizeGraphPlan(payload.graphPlan),
    vizConfig: normalizeVizConfig(payload.vizConfig),
  }

  const lines: string[] = [
    PRESET_MARKER,
    JSON.stringify(preset),
    '# x y (optional z)',
  ]

  for (const row of payload.coordinateRows) {
    if (row.z !== undefined && !Number.isNaN(row.z)) {
      lines.push(`${row.x} ${row.y} ${row.z}`)
    } else {
      lines.push(`${row.x} ${row.y}`)
    }
  }

  return `${lines.join('\n')}\n`
}

export function presetCsvDownloadName(fileName: string | null | undefined): string {
  const base = fileName?.replace(/\.csv$/i, '') || 'graph'
  return `${base}-with-preset.csv`
}

export function graphPngDownloadName(fileName: string | null | undefined): string {
  const base = fileName?.replace(/\.csv$/i, '') || 'graph'
  return `${base}.png`
}
