import katex from 'katex'

const DELIMITERS = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false }
]
const MAX_EXPRESSION_LENGTH = 1000

function findNextDelimiter(source, fromIndex) {
  let next = null

  for (const delimiter of DELIMITERS) {
    const idx = source.indexOf(delimiter.open, fromIndex)
    if (idx === -1) continue
    if (!next || idx < next.index) {
      next = { index: idx, delimiter }
    }
  }

  return next
}

function parseMathSegments(text) {
  if (!text) return []

  const source = String(text)
  const segments = []
  let cursor = 0

  while (cursor < source.length) {
    const next = findNextDelimiter(source, cursor)
    if (!next) {
      segments.push({ type: 'text', value: source.slice(cursor), start: cursor, end: source.length })
      break
    }

    if (next.index > cursor) {
      segments.push({ type: 'text', value: source.slice(cursor, next.index), start: cursor, end: next.index })
    }

    const { delimiter } = next
    const start = next.index + delimiter.open.length
    const end = source.indexOf(delimiter.close, start)

    if (end === -1) {
      segments.push({ type: 'text', value: source.slice(next.index), start: next.index, end: source.length })
      break
    }

    const expression = source.slice(start, end)
    const raw = source.slice(next.index, end + delimiter.close.length)

    if (!expression.trim()) {
      segments.push({ type: 'text', value: raw, start: next.index, end: end + delimiter.close.length })
    } else {
      segments.push({ type: 'math', value: expression, display: delimiter.display, raw, start: next.index, end: end + delimiter.close.length })
    }

    cursor = end + delimiter.close.length
  }

  return segments.length ? segments : [{ type: 'text', value: source }]
}

function renderMath(expression, displayMode) {
  const sanitized = String(expression).replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!sanitized || sanitized.length > MAX_EXPRESSION_LENGTH) return null

  try {
    return katex.renderToString(sanitized, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: false
    })
  } catch {
    return null
  }
}

export default function MathText({ text, inline = false, className = '' }) {
  const segments = parseMathSegments(text)
  const Tag = inline ? 'span' : 'div'
  const tagClass = `${inline ? 'inline' : 'block'} math-content ${className}`.trim()

  return (
    <Tag className={tagClass}>
      {segments.map((segment, index) => {
        const key = `${segment.type}-${segment.start ?? index}-${segment.end ?? index}`

        if (segment.type === 'text') {
          return (
            <span key={key} className="whitespace-pre-wrap">
              {segment.value}
            </span>
          )
        }

        const html = renderMath(segment.value, segment.display)
        if (!html) {
          return (
            <span key={key} className="whitespace-pre-wrap">
              {segment.raw}
            </span>
          )
        }

        return (
          <span
            key={key}
            className={segment.display ? 'math-display' : 'math-inline'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </Tag>
  )
}
