function transformQuestion(q) {
  const answerMap = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };

  let options = [];
  if (Array.isArray(q.options) && q.options.length >= 4) {
    options = q.options.slice(0, 4);
  } else if (q.option_a !== undefined) {
    options = [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''];
  } else if (q.A !== undefined) {
    options = [q.A || '', q.B || '', q.C || '', q.D || ''];
  } else if (q.OptionA !== undefined) {
    options = [q.OptionA || '', q.OptionB || '', q.OptionC || '', q.OptionD || ''];
  } else if (q.optionA !== undefined) {
    options = [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''];
  } else {
    const keys = Object.keys(q);
    const optKeys = keys.filter(k => /^(opt|choice|ans)/i.test(k));
    options = optKeys.slice(0, 4).map(k => q[k] || '');
    while (options.length < 4) options.push('');
  }

  const rawAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.Answer ?? q.correct ?? 'A';
  let answer = 0;
  if (typeof rawAnswer === 'number') {
    answer = rawAnswer;
  } else {
    const letter = String(rawAnswer).trim().toUpperCase().charAt(0);
    if (letter in answerMap) {
      answer = answerMap[letter];
    } else {
      const idx = options.findIndex(o => String(o).trim() === String(rawAnswer).trim());
      answer = idx >= 0 ? idx : 0;
    }
  }

  return {
    id: (q._id || q.id || '').toString(),
    question: q.question || q.Question || q.questionText || '',
    subject: (q.subject || q.Subject || '').toLowerCase(),
    options,
    answer,
    explanation: q.explanation || q.Explanation || q.solution || '',
    year: q.year || q.Year || null,
    topic: q.topic || q.Topic || null,
  };
}

module.exports = { transformQuestion };