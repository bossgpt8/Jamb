const { connectDB } = require('./utils/db');
const { transformQuestion } = require('./utils/transform');
const Question = require('../models/Question');

const ENGLISH_QUESTION_COUNT = 60;
const DEFAULT_SUBJECT_COUNT = 40;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { type = 'practice' } = req.query;

  try {
    await connectDB();

    // Daily: random sample across all subjects
    if (type === 'daily') {
      const count = Math.min(parseInt(req.query.count) || 10, 50);
      const questions = await Question.aggregate([{ $sample: { size: count } }]);
      console.log(`📅 Daily questions found: ${questions.length}`);
      return res.status(200).json({ success: true, questions: questions.map(transformQuestion), count: questions.length });
    }

    // Exam: full mock exam per subject
    if (type === 'exam') {
      const { subjects } = req.query;
      if (!subjects) {
        return res.status(400).json({ success: false, error: 'subjects is required' });
      }
      const subjectList = subjects.split(',').map(s => s.toLowerCase().trim());
      const allQuestions = [];
      for (const subject of subjectList) {
        const count = subject === 'english' ? ENGLISH_QUESTION_COUNT : DEFAULT_SUBJECT_COUNT;
        const subjectRegex = new RegExp(`^${subject}$`, 'i');
        const qs = await Question.aggregate([
          { $match: { subject: { $regex: subjectRegex } } },
          { $sample: { size: count } }
        ]);
        console.log(`📝 Exam subject "${subject}": ${qs.length} questions`);
        allQuestions.push(...qs.map(transformQuestion));
      }
      return res.status(200).json({ success: true, questions: allQuestions, count: allQuestions.length });
    }

    // Practice (default): filter by subject, year, topic, limit
    const { subject, limit = 20, year, topic } = req.query;
    if (!subject) {
      return res.status(400).json({ success: false, error: 'subject is required' });
    }

    const subjectClean = subject.toLowerCase().trim();
    const subjectRegex = new RegExp(`^${subjectClean}$`, 'i');

    const matchStage = { subject: { $regex: subjectRegex } };
    if (year) matchStage.year = parseInt(year);
    if (topic) matchStage.topic = { $regex: new RegExp(topic, 'i') };

    const questions = await Question.aggregate([
      { $match: matchStage },
      { $sample: { size: Math.min(parseInt(limit) || 20, 200) } }
    ]);

    console.log(`📚 Questions query: subject="${subjectClean}", found: ${questions.length}`);
    return res.status(200).json({ success: true, questions: questions.map(transformQuestion), count: questions.length });
  } catch (error) {
    console.error('Get questions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load questions' });
  }
};
