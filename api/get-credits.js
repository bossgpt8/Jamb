const { connectDB } = require('../db/mongoose');
const User = require('../models/User');

function decodeFirebaseToken(idToken) {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return decoded;
  } catch {
    return null;
  }
}

async function verifyFirebaseToken(idToken) {
  const payload = decodeFirebaseToken(idToken);
  if (!payload || !payload.sub) throw new Error('Invalid token');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');

  if (process.env.FIREBASE_WEB_API_KEY) {
    try {
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_WEB_API_KEY}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.users || !data.users[0]) throw new Error('User not found');
      }
    } catch (verifyErr) {
      console.warn('Token remote verify failed, falling back to JWT decode:', verifyErr.message);
    }
  }

  return payload.sub;
}

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
    const user = await User.findOne({ uid });
    const credits = user ? (Number(user.examCredits) || 0) : 0;
    return res.json({ success: true, credits });
  } catch (error) {
    console.error('Get credits error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
};
