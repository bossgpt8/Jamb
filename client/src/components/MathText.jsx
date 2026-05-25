import katex from 'katex'

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?:\\.|[^$\n])+\$)/g

function parseMathSegments(text) {
  if (!text) return []

  const source = String(text)
  const segments = []
  let lastIndex = 0
  let match

  while ((match = MATH_PATTERN.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: source.slice(lastIndex, match.index) })
    }

    const token = match[0]
    const isDisplay = token.startsWith('$$') || token.startsWith('\\[')
    let expression = token

    if (token.startsWith('$$') && token.endsWith('$$')) expression = token.slice(2, -2)
    else if (token.startsWith('\\[') && token.endsWith('\\]')) expression = token.slice(2, -2)
    else if (token.startsWith('\\(') && token.endsWith('\\)')) expression = token.slice(2, -2)
    else if (token.startsWith('$') && token.endsWith('$')) expression = token.slice(1, -1)

    if (!expression.trim()) {
      segments.push({ type: 'text', value: token })
    } else {
      segments.push({ type: 'math', value: expression, display: isDisplay, raw: token })
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < source.length) {
    segments.push({ type: 'text', value: source.slice(lastIndex) })
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
  const tagClass = `${inline ? 'inline' : 'block'} math-content ${className}`.trim()

  return (
    <span className={tagClass}>
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
    </span>
  )
}
