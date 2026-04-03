function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripQuestionLeak(value) {
  if (!value) return '';
  let cleaned = normalizeSpaces(value);

  const leakPatterns = [
    /\bPASSAGE\s+[IVXLC]+\b/i,
    /\bQUESTION\s*\d+\b/i,
    /\b\d{1,3}\s*\.\s*[A-D]\s*[\.)]/i,
    /\bA\s+SUITABLE\s+TITLE\b/i
  ];

  for (const pattern of leakPatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index > 25) {
      cleaned = cleaned.slice(0, match.index).trim();
      break;
    }
  }

  cleaned = cleaned.replace(/^[A-D]\s*[\.)]\s*/i, '').trim();
  return cleaned;
}

function parseLabeledOptions(blob) {
  const text = normalizeSpaces(blob);
  if (!text) return null;

  const markerRegex = /(^|[\s(,:;"'])([A-D])\s*[\.)]\s*/g;
  const hits = [];
  let match;

  while ((match = markerRegex.exec(text)) !== null) {
    hits.push({ label: match[2], start: markerRegex.lastIndex });
  }

  if (hits.length < 2) return null;

  const labelMap = { A: '', B: '', C: '', D: '' };
  for (let i = 0; i < hits.length; i++) {
    const current = hits[i];
    const end = i + 1 < hits.length ? hits[i + 1].start - 3 : text.length;
    const segment = stripQuestionLeak(text.slice(current.start, end));
    if (segment && !labelMap[current.label]) {
      labelMap[current.label] = segment;
    }
  }

  const options = [labelMap.A, labelMap.B, labelMap.C, labelMap.D];
  if (options.filter(Boolean).length < 2) return null;
  return options.map(o => o || '');
}

function getRawOptionFields(q) {
  if (Array.isArray(q.options) && q.options.length) return q.options.slice(0, 4);
  if (q.option_a !== undefined) return [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''];
  if (q.A !== undefined) return [q.A || '', q.B || '', q.C || '', q.D || ''];
  if (q.OptionA !== undefined) return [q.OptionA || '', q.OptionB || '', q.OptionC || '', q.OptionD || ''];
  if (q.optionA !== undefined) return [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''];

  const keys = Object.keys(q);
  const optKeys = keys.filter(k => /^(opt|choice|ans)/i.test(k));
  return optKeys.slice(0, 4).map(k => q[k] || '');
}

function transformQuestion(q) {
  const answerMap = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };

  let question = normalizeSpaces(q.question || q.Question || q.questionText || '');
  const passage = normalizeSpaces(q.passage || q.Passage || q.comprehension || q.summary || q.Summary || '');

  // Some imports store A/B/C/D inside question text. Extract if present.
  let questionEmbeddedOptions = '';
  const firstOptionMatch = question.match(/(^|\s)A\s*[\.)]\s+/i);
  if (firstOptionMatch && firstOptionMatch.index > 20) {
    questionEmbeddedOptions = question.slice(firstOptionMatch.index).trim();
    question = question.slice(0, firstOptionMatch.index).trim();
  }

  const rawOptions = getRawOptionFields(q);
  const rawBlob = normalizeSpaces([
    ...rawOptions,
    questionEmbeddedOptions,
    q.optionsText,
    q.option_text,
    q.answers,
    q.Answers
  ].filter(Boolean).join(' '));

  let options = rawOptions.map(stripQuestionLeak).slice(0, 4);
  while (options.length < 4) options.push('');

  const parsedFromBlob = parseLabeledOptions(rawBlob);
  const hasDirtyOption = options.some(opt => /\b([B-D])\s*[\.)]\s+/i.test(opt));
  if (parsedFromBlob && (hasDirtyOption || options.filter(Boolean).length < 4)) {
    options = parsedFromBlob;
  }

  options = options.map(stripQuestionLeak);

  const rawAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.Answer ?? q.correct ?? 'A';
  let answer = 0;
  if (typeof rawAnswer === 'number') {
    answer = rawAnswer;
  } else {
    const letter = String(rawAnswer).trim().toUpperCase().charAt(0);
    if (letter in answerMap) {
      answer = answerMap[letter];
    } else {
      const idx = options.findIndex(o => normalizeSpaces(o).toLowerCase() === normalizeSpaces(rawAnswer).toLowerCase());
      answer = idx >= 0 ? idx : 0;
    }
  }

  return {
    id: (q._id || q.id || '').toString(),
    question,
    passage,
    subject: (q.subject || q.Subject || '').toLowerCase(),
    options,
    answer,
    explanation: normalizeSpaces(q.explanation || q.Explanation || q.solution || ''),
    year: q.year || q.Year || null,
    topic: q.topic || q.Topic || null,
  };
}

module.exports = { transformQuestion };