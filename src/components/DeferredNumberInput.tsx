import { useEffect, useRef, useState } from 'react'

type BaseProps = {
  placeholder?: string
  className?: string
  integer?: boolean
  min?: number
  max?: number
}

type RequiredProps = BaseProps & {
  value: number
  optional?: false
  onCommit: (value: number) => void
}

type OptionalProps = BaseProps & {
  value: number | null
  optional: true
  onCommit: (value: number | null) => void
}

type Props = RequiredProps | OptionalProps

function formatDisplay(value: number | null): string {
  if (value === null) return ''
  return String(value)
}

function isIncomplete(raw: string): boolean {
  const t = raw.trim()
  return t === '' || t === '-' || t === '.' || t === '-.'
}

/**
 * Text input for numbers: free typing while focused; commit on blur or Enter.
 * Invalid or empty (when not optional) reverts to the last committed value.
 */
export function DeferredNumberInput(props: Props) {
  const { placeholder, className, integer = false, min, max } = props
  const optional = props.optional === true
  const committed = props.value

  const [draft, setDraft] = useState(() => formatDisplay(committed))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatDisplay(committed))
    }
  }, [committed])

  const revert = () => {
    setDraft(formatDisplay(committed))
  }

  const commit = () => {
    const raw = draft.trim()

    if (isIncomplete(raw)) {
      if (optional) {
        props.onCommit(null)
        setDraft('')
        return
      }
      revert()
      return
    }

    let n = integer ? Number.parseInt(raw, 10) : Number.parseFloat(raw)
    if (!Number.isFinite(n)) {
      revert()
      return
    }

    if (integer) n = Math.trunc(n)
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)

    if (optional) {
      props.onCommit(n)
    } else {
      props.onCommit(n)
    }
    setDraft(formatDisplay(n))
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      className={className}
      placeholder={placeholder}
      value={draft}
      onFocus={() => {
        focusedRef.current = true
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focusedRef.current = false
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
    />
  )
}
