const { connectDB } = require('./utils/db');
const { transformQuestion } = require('./utils/transform');
const Question = require('../models/Question');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { subject, limit = 20, year, topic } = req.query;

  if (!subject) {
    return res.status(400).json({ success: false, error: 'subject is required' });
  }

  try {
    await connectDB();

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
