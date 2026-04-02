const { connectDB } = require('../utils/db');
const { transformQuestion } = require('../utils/transform');
const Question = require('../../models/Question');

const ENGLISH_QUESTION_COUNT = 60;
const DEFAULT_SUBJECT_COUNT = 40;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { subjects } = req.query;

  if (!subjects) {
    return res.status(400).json({ success: false, error: 'subjects is required' });
  }

  try {
    await connectDB();

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
  } catch (error) {
    console.error('Get exam questions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load exam questions' });
  }
};
