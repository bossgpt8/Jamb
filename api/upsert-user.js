const { connectDB } = require('../lib/db');
const User = require('../models/User');
const { verifyFirebaseToken, getTokenEmail } = require('../lib/auth');

const DEFAULT_ADMIN_UIDS = ['rrn9hbDxmaNmjiu2GhxGi6yyS8v2'];
const DEFAULT_ADMIN_EMAILS = ['osanisrael2@gmail.com'];
const ENV_ADMIN_UIDS = process.env.ADMIN_UIDS
  ? process.env.ADMIN_UIDS.split(',').map(u => u.trim()).filter(Boolean)
  : [];
const ENV_ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  : [];
const LEGACY_ADMIN_UIDS = [...new Set([...DEFAULT_ADMIN_UIDS, ...ENV_ADMIN_UIDS])];
const LEGACY_ADMIN_EMAILS = [...new Set([...DEFAULT_ADMIN_EMAILS, ...ENV_ADMIN_EMAILS])];
const ADMIN_EXAM_CREDITS = 999999;

async function checkIsAdmin(uid, tokenEmail, emailArg) {
  if (LEGACY_ADMIN_UIDS.includes(uid)) return true;
  if (tokenEmail && LEGACY_ADMIN_EMAILS.includes(tokenEmail)) return true;
  if (emailArg && LEGACY_ADMIN_EMAILS.includes(emailArg.toLowerCase())) return true;
  try {
    const user = await User.findOne({ uid }, 'role email');
    if (user?.role === 'admin') return true;
    if (user?.email && LEGACY_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  } catch (err) {
    console.error('checkIsAdmin DB error:', err.message);
  }
  return false;
}

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
