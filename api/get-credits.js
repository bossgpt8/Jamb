const { connectDB } = require('../lib/db');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let uid;
  try {
    uid = await verifyFirebaseToken(idToken);
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError.message);
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }

  try {
    await connectDB();
    if (req.body?.action === 'consume') {
      const updatedUser = await User.findOneAndUpdate(
        { uid, examCredits: { $gt: 0 } },
        {
          $inc: { examCredits: -1 },
          $set: { lastExamStartedAt: new Date().toISOString() }
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).json({ success: false, error: 'No exam credits available. Please purchase credits to continue.' });
      }

      const remainingCredits = Number(updatedUser.examCredits) || 0;
      return res.json({
        success: true,
        message: 'Exam credit consumed',
        data: {
          previousCredits: remainingCredits + 1,
          remainingCredits
        }
      });
    }

    const user = await User.findOne({ uid });
    const credits = user ? (Number(user.examCredits) || 0) : 0;
    return res.json({ success: true, credits });
  } catch (error) {
    console.error('Get credits error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
};
