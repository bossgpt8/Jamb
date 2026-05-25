import katex from 'katex'

const DELIMITERS = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false }
]

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
      segments.push({ type: 'text', value: source.slice(cursor) })
      break
    }

    if (next.index > cursor) {
      segments.push({ type: 'text', value: source.slice(cursor, next.index) })
    }

    const { delimiter } = next
    const start = next.index + delimiter.open.length
    const end = source.indexOf(delimiter.close, start)

    if (end === -1) {
      segments.push({ type: 'text', value: source.slice(next.index) })
      break
    }

    const expression = source.slice(start, end)
    const raw = source.slice(next.index, end + delimiter.close.length)

    if (!expression.trim()) {
      segments.push({ type: 'text', value: raw })
    } else {
      segments.push({ type: 'math', value: expression, display: delimiter.display, raw })
    }

    cursor = end + delimiter.close.length
  }

  return segments.length ? segments : [{ type: 'text', value: source }]
}

function renderMath(expression, displayMode) {
  try {
    return katex.renderToString(expression, {
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
        if (segment.type === 'text') {
          return (
            <span key={`txt-${index}`} className="whitespace-pre-wrap">
              {segment.value}
            </span>
          )
        }

        const html = renderMath(segment.value, segment.display)
        if (!html) {
          return (
            <span key={`raw-${index}`} className="whitespace-pre-wrap">
              {segment.raw}
            </span>
          )
        }

        return (
          <span
            key={`math-${index}`}
            className={segment.display ? 'math-display' : 'math-inline'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </Tag>
  )
}
