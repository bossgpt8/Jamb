const { connectDB } = require('../lib/db');
const { verifyFirebaseToken } = require('../lib/auth');
const User = require('../models/User');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { idToken, action = 'get', ...resultData } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Auth required' });
  }

  try {
    const uid = await verifyFirebaseToken(idToken);
    await connectDB();

    if (action === 'save') {
      const user = await User.findOneAndUpdate(
        { uid },
        { $push: { examResults: resultData } },
        { upsert: true, new: true }
      );

      const savedResult = user.examResults[user.examResults.length - 1];
      return res.json({ success: true, id: savedResult?._id?.toString() || 'saved' });
    }

    if (action === 'get') {
      const user = await User.findOne({ uid }, { examResults: 1 });
      const results = (user?.examResults || [])
        .slice()
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      return res.json({ success: true, results });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (err) {
    console.error('Exam results error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};