import katex from 'katex'

const DELIMITERS = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false }
]
const MAX_EXPRESSION_LENGTH = 1000

// Unicode superscript/subscript digit maps
const SUPERSCRIPT_MAP = { '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n' }
const SUBSCRIPT_MAP = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }

// Allow only safe characters inside captured LaTeX expressions to prevent injection
function sanitizeMathExpr(expr) {
  return String(expr).replace(/[^a-zA-Z0-9+\-*/^_.() ]/g, '')
}

// Ordered list of [regex, LaTeX command] replacements for standalone Unicode math symbols
const SYMBOL_REPLACEMENTS = [
  // Plain-text exponent notation: 10^4, 2^8, x^2, x^(1/3) → $10^{4}$, $2^{8}$, $x^{2}$, $x^{(1/3)}$
  [/([a-zA-Z0-9]+)\^(\{[^}]*\})/g, (_, base, exp) => `$${sanitizeMathExpr(base)}^{${sanitizeMathExpr(exp.slice(1, -1))}}$`],
  [/([a-zA-Z0-9]+)\^\(([^)]+)\)/g, (_, base, exp) => `$${sanitizeMathExpr(base)}^{(${sanitizeMathExpr(exp)})}$`],
  [/([a-zA-Z0-9]+)\^(-?\d+)/g, (_, base, exp) => `$${sanitizeMathExpr(base)}^{${sanitizeMathExpr(exp)}}$`],
  [/√\(([^)]+)\)/g, (_, e) => `$\\sqrt{${sanitizeMathExpr(e)}}$`],
  [/√(\d+(?:\.\d+)?)/g, (_, n) => `$\\sqrt{${sanitizeMathExpr(n)}}$`],
  [/√(\w)/g, (_, c) => `$\\sqrt{${sanitizeMathExpr(c)}}$`],
  [/π/g, '$\\pi$'],
  [/θ/g, '$\\theta$'],
  [/α/g, '$\\alpha$'],
  [/β/g, '$\\beta$'],
  [/γ/g, '$\\gamma$'],
  [/Δ/g, '$\\Delta$'],
  [/δ/g, '$\\delta$'],
  [/λ/g, '$\\lambda$'],
  [/μ/g, '$\\mu$'],
  [/σ/g, '$\\sigma$'],
  [/Σ/g, '$\\Sigma$'],
  [/∞/g, '$\\infty$'],
  [/≤/g, '$\\leq$'],
  [/≥/g, '$\\geq$'],
  [/×/g, '$\\times$'],
  [/÷/g, '$\\div$'],
  [/±/g, '$\\pm$'],
  [/≠/g, '$\\neq$'],
  [/∴/g, '$\\therefore$'],
  [/∈/g, '$\\in$'],
  [/∉/g, '$\\notin$'],
  [/∑/g, '$\\sum$'],
  [/∏/g, '$\\prod$'],
  [/∫/g, '$\\int$'],
]

function normalizeUnicodeMath(text) {
  if (!text) return text
  let s = String(text)
  // x² → $x^{2}$, x³ → $x^{3}$, etc.
  s = s.replace(/(\w)([²³⁴⁵⁶⁷⁸⁹ⁿ])/g, (_, base, sup) => `$${base}^{${SUPERSCRIPT_MAP[sup]}}$`)
  // x₁ → $x_{1}$, etc.
  s = s.replace(/(\w)([₀₁₂₃₄₅₆₇₈₉])/g, (_, base, sub) => `$${base}_{${SUBSCRIPT_MAP[sub]}}$`)
  // √ and other math symbols
  for (const [re, replacement] of SYMBOL_REPLACEMENTS) {
    s = s.replace(re, replacement)
  }
  return s
}

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
  // Expand each plain-text segment by converting Unicode math to $...$ delimiters,
  // then re-parse to pick up the new inline math nodes.
  const segments = parseMathSegments(text).flatMap((segment) => {
    if (segment.type !== 'text') return [segment]
    const normalized = normalizeUnicodeMath(segment.value)
    if (normalized === segment.value) return [segment]
    return parseMathSegments(normalized)
  })

  const Tag = inline ? 'span' : 'div'
  const tagClass = `${inline ? 'inline' : 'block'} math-content ${className}`.trim()

  return (
    <Tag className={tagClass}>
      {segments.map((segment, index) => {
        const key = `${segment.type}-${index}`

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
