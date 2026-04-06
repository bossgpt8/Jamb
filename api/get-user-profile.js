const { connectDB } = require('../lib/db');
const User = require('../models/User');
const { verifyFirebaseToken, getTokenEmail } = require('../lib/auth');
const { checkIsAdmin } = require('../lib/admin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idToken } = req.body || {};
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });

  try {
    await connectDB();
    const uid = await verifyFirebaseToken(idToken);
    const tokenEmail = getTokenEmail(idToken);
    const user = await User.findOne({ uid });

    if (user && user.role !== 'admin') {
      const isAdmin = await checkIsAdmin(uid, tokenEmail, user.email || null);
      if (isAdmin) {
        user.role = 'admin';
        await user.save();
      }
    }

    const profile = user ? user.toObject() : null;
    if (!profile) {
      const isAdmin = await checkIsAdmin(uid, tokenEmail, null);
      if (isAdmin) {
        return res.json({ success: true, profile: { role: 'admin' } });
      }
    }

    return res.json({ success: true, profile });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
