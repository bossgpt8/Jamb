// Notification API - Expo push notifications via MongoDB token store
const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  isConnected = true;
}

const pushTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  expoPushToken: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const PushToken = mongoose.models.PushToken || mongoose.model('PushToken', pushTokenSchema);

async function sendExpoPush(tokens, title, body, data = {}) {
  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default'
  }));

  const results = [];
  // Send in batches of 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(batch)
    });
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Expo push API error ${response.status}: ${errBody}`);
    }
    const result = await response.json();
    results.push(result);
  }
  return results;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'action is required' });
  }

  try {
    await connectDB();

    // ── register-token ────────────────────────────────────────────────────────
    if (action === 'register-token') {
      const { userId, expoPushToken } = req.body;
      if (!userId || !expoPushToken) {
        return res.status(400).json({ error: 'userId and expoPushToken are required' });
      }
      const safeUserId = String(userId).trim();

      await PushToken.findOneAndUpdate(
        { userId: safeUserId },
        { expoPushToken: String(expoPushToken), updatedAt: new Date() },
        { upsert: true, new: true }
      );

      console.log(`✅ Expo push token registered for user ${safeUserId}`);
      return res.status(200).json({ success: true, message: 'Token registered' });
    }

    // ── send ──────────────────────────────────────────────────────────────────
    if (action === 'send') {
      const { userId, title, body, data, deepLink, type } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ error: 'userId, title and body are required' });
      }
      const safeUserId = String(userId).trim();

      const record = await PushToken.findOne({ userId: safeUserId });
      if (!record) {
        return res.status(404).json({ error: 'No push token found for this user' });
      }

      const notifData = { ...(data || {}), ...(deepLink && { url: deepLink }), ...(type && { type }) };
      const results = await sendExpoPush([record.expoPushToken], title, body, notifData);
      console.log(`✅ Push notification sent to user ${safeUserId}`);
      return res.status(200).json({ success: true, results });
    }

    // ── broadcast ─────────────────────────────────────────────────────────────
    if (action === 'broadcast') {
      const { title, body, data } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: 'title and body are required' });
      }

      const records = await PushToken.find({}, 'expoPushToken');
      const tokens = records.map((r) => r.expoPushToken);

      if (tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No tokens registered', sent: 0 });
      }

      const results = await sendExpoPush(tokens, title, body, data || {});
      console.log(`✅ Broadcast sent to ${tokens.length} devices`);
      return res.status(200).json({ success: true, sent: tokens.length, results });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
