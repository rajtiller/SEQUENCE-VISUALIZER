import { useCallback, type DragEvent } from 'react'

type Props = {
  label: string
  hint?: string
  fileName: string | null
  valueCount: number
  optional?: boolean
  onFile: (file: File) => void
  onClear?: () => void
}

export function ListFileInput({
  label,
  hint,
  fileName,
  valueCount,
  optional = false,
  onFile,
  onClear,
}: Props) {
  const readFile = useCallback(
    (file: File | null) => {
      if (!file) return
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const f = e.dataTransfer.files?.[0]
      if (f) readFile(f)
    },
    [readFile],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  return (
    <div className="list-file-input">
      <div className="list-file-input__head">
        <span className="list-file-input__label">
          {label}
          {optional ? ' (optional)' : ''}
        </span>
        {fileName && onClear ? (
          <button
            type="button"
            className="list-file-input__clear"
            onClick={onClear}
            title={`Clear ${label}`}
          >
            Clear
          </button>
        ) : null}
      </div>
      <label
        className="file-drop-compact list-file-drop"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <input
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => readFile(e.target.files?.[0] ?? null)}
        />
        <strong>{fileName ?? `Choose ${label.toLowerCase()}`}</strong>
        {fileName
          ? valueCount > 0
            ? ` · ${valueCount.toLocaleString()} values`
            : ''
          : ' — click or drop'}
      </label>
      {hint ? <p className="list-file-input__hint">{hint}</p> : null}
    </div>
  )
}
