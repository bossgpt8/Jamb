const { connectDB } = require('../lib/db');
const User = require('../models/User');
const { verifyFirebaseToken, getTokenEmail } = require('../lib/auth');
const { checkIsAdmin, ADMIN_EXAM_CREDITS } = require('../lib/admin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idToken, email, displayName, photoURL } = req.body || {};
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });

  try {
    await connectDB();
    const uid = await verifyFirebaseToken(idToken);
    const tokenEmail = getTokenEmail(idToken);
    const isAdmin = await checkIsAdmin(uid, tokenEmail, email || null);

    const profileFields = { email, displayName, photoURL, lastLoginAt: new Date().toISOString() };
    const update = { $set: profileFields };
    if (isAdmin) {
      update.$set.role = 'admin';
      update.$set.examCredits = ADMIN_EXAM_CREDITS;
    } else {
      update.$setOnInsert = { role: 'user' };
    }

    await User.findOneAndUpdate({ uid }, update, { upsert: true, new: true });
    return res.json({ success: true });
  } catch (err) {
    console.error('Upsert user error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
