const { connectDB } = require('../lib/db');
const User = require('../models/User');
const { verifyFirebaseToken, getTokenEmail } = require('../lib/auth');
const { checkIsAdmin, ADMIN_EXAM_CREDITS } = require('../lib/admin');

async function handleUpsertUser(req, res) {
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
}

async function handleGetUserProfile(req, res) {
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
}

async function handleGetCredits(req, res) {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(401).json({ success: false, error: 'Authentication required' });

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
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.query;

  if (action === 'upsert-user') return handleUpsertUser(req, res);
  if (action === 'get-user-profile') return handleGetUserProfile(req, res);
  return handleGetCredits(req, res);
};
