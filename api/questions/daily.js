const { connectDB } = require('../utils/db');
const { transformQuestion } = require('../utils/transform');
const Question = require('../../models/Question');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const count = Math.min(parseInt(req.query.count) || 10, 50);

  try {
    await connectDB();

    const questions = await Question.aggregate([
      { $sample: { size: count } }
    ]);

    console.log(`📅 Daily questions found: ${questions.length}`);

    return res.status(200).json({ success: true, questions: questions.map(transformQuestion), count: questions.length });
  } catch (error) {
    console.error('Get daily questions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load daily questions' });
  }
};
