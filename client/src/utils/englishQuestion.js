const ENGLISH_SORT_RULES = [
  /\b(nearest|closest|same|similar|synonym)\b[\s\S]{0,40}\bmeaning\b/i,
  /\b(opposite|antonym)\b[\s\S]{0,40}\bmeaning\b/i,
  /\b(opposite|antonym)\b/i,
  /\b(fill|choose|select)\b[\s\S]{0,30}\b(blank|gap)\b/i,
  /\b(passage|comprehension|according to the passage|refers to)\b/i
]

const FOCUS_CUE = /\b(nearest|closest|same|similar|synonym|opposite|antonym|meaning|replace|substitute)\b/i
const MAX_TARGET_TEXT_LENGTH = 80
const MAX_PATTERN_INPUT_LENGTH = 2000
const MIN_UPPERCASE_TARGET_LENGTH = 3
const EXPLICIT_HIGHLIGHT_PATTERN = /<\s*(?:b|strong|u)\s*>([\s\S]*?)<\s*\/\s*(?:b|strong|u)\s*>|\*\*([^*]+)\*\*|__([^_]+)__/gi
const QUOTED_TARGET_PATTERN = /["“']([^"”']{2,80})["”']/

function isEnglishSubject(subject) {
  const value = String(subject || '').toLowerCase().trim()
  return value === 'english' || value === 'use of english'
}

function rankEnglishQuestion(questionText) {
  const text = String(questionText || '')
  for (let i = 0; i < ENGLISH_SORT_RULES.length; i += 1) {
    if (ENGLISH_SORT_RULES[i].test(text)) return i
  }
  return ENGLISH_SORT_RULES.length
}

export function sortEnglishQuestionsForDisplay(questions, subject) {
  if (!isEnglishSubject(subject) || !Array.isArray(questions)) return Array.isArray(questions) ? [...questions] : []
  return questions
    .map((question, index) => ({ question, index }))
    .sort((a, b) => {
      const rankDiff = rankEnglishQuestion(a.question?.question) - rankEnglishQuestion(b.question?.question)
      if (rankDiff !== 0) return rankDiff
      return a.index - b.index
    })
    .map(item => item.question)
}

function parseExplicitHighlights(text) {
  const source = String(text || '').slice(0, MAX_PATTERN_INPUT_LENGTH)
  const pattern = EXPLICIT_HIGHLIGHT_PATTERN
  pattern.lastIndex = 0
  const segments = []
  let cursor = 0
  let hasHighlight = false
  let match = pattern.exec(source)

  while (match) {
    if (match.index > cursor) {
      segments.push({ text: source.slice(cursor, match.index), highlight: false })
    }
    const highlightedText = String(match[1] || match[2] || match[3] || '').trim()
    if (highlightedText) {
      hasHighlight = true
      segments.push({ text: highlightedText, highlight: true })
    }
    cursor = match.index + match[0].length
    match = pattern.exec(source)
  }

  if (!hasHighlight) return null
  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor), highlight: false })
  }
  return segments
}

function inferFocusSpan(text) {
  const source = String(text || '').slice(0, MAX_PATTERN_INPUT_LENGTH)
  if (!source) return null
  if (!FOCUS_CUE.test(source)) return null

  const quoted = source.match(QUOTED_TARGET_PATTERN)
  if (quoted) {
    const focused = quoted[1].trim()
    if (focused && focused.length <= MAX_TARGET_TEXT_LENGTH) {
      const start = source.indexOf(quoted[0]) + quoted[0].indexOf(focused)
      return { start, end: start + focused.length }
    }
  }

  const cueIndex = source.search(FOCUS_CUE)
  const searchFrom = cueIndex >= 0 ? cueIndex : 0
  const upperMatch = source
    .slice(searchFrom)
    .match(new RegExp(`\\b[A-Z][A-Z-]{${MIN_UPPERCASE_TARGET_LENGTH - 1},}\\b`))
  if (upperMatch) {
    const start = searchFrom + upperMatch.index
    return { start, end: start + upperMatch[0].length }
  }

  return null
}

export function splitQuestionTextForDisplay(text, subject) {
  const source = String(text || '')
  if (!source) return [{ text: '', highlight: false }]

  const explicitSegments = parseExplicitHighlights(source)
  if (explicitSegments) return explicitSegments

  if (!isEnglishSubject(subject)) {
    return [{ text: source, highlight: false }]
  }

  const focus = inferFocusSpan(source)
  if (!focus || focus.start < 0 || focus.end <= focus.start) {
    return [{ text: source, highlight: false }]
  }

  const parts = []
  if (focus.start > 0) parts.push({ text: source.slice(0, focus.start), highlight: false })
  parts.push({ text: source.slice(focus.start, focus.end), highlight: true })
  if (focus.end < source.length) parts.push({ text: source.slice(focus.end), highlight: false })
  return parts
}
