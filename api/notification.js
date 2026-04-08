// Notification API - OneSignal push notifications via MongoDB player-id store
const mongoose = require('mongoose');
const { verifyFirebaseToken, getTokenEmail } = require('../lib/auth');
const { checkIsAdmin } = require('../lib/admin');

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
  oneSignalPlayerId: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const PushToken = mongoose.models.PushToken || mongoose.model('PushToken', pushTokenSchema);

async function sendOneSignalPush(playerIds, title, body, data = {}) {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) throw new Error('ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY must be set');

  const results = [];
  // Send in batches of 2000 (OneSignal limit per request)
  for (let i = 0; i < playerIds.length; i += 2000) {
    const batch = playerIds.slice(i, i + 2000);
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: batch,
        headings: { en: title },
        contents: { en: body },
        data
      })
    });
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OneSignal API error ${response.status}: ${errBody}`);
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
      const { userId, oneSignalPlayerId } = req.body;
      if (!userId || !oneSignalPlayerId) {
        return res.status(400).json({ error: 'userId and oneSignalPlayerId are required' });
      }
      const safeUserId = String(userId).trim();

      await PushToken.findOneAndUpdate(
        { userId: safeUserId },
        { oneSignalPlayerId: String(oneSignalPlayerId), updatedAt: new Date() },
        { upsert: true, new: true }
      );

      console.log(`✅ OneSignal player ID registered for user ${safeUserId}`);
      return res.status(200).json({ success: true, message: 'Player ID registered' });
    }

    // ── admin-only actions ────────────────────────────────────────────────────
    if (action === 'send' || action === 'broadcast') {
      const idToken = req.body?.idToken || req.headers?.['x-id-token'];
      if (!idToken) {
        return res.status(401).json({ error: 'Auth required' });
      }
      let uid;
      try {
        uid = await verifyFirebaseToken(idToken);
      } catch {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const tokenEmail = getTokenEmail(idToken);
      if (!(await checkIsAdmin(uid, tokenEmail, null))) {
        return res.status(403).json({ error: 'Forbidden: Admin only' });
      }
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
      const results = await sendOneSignalPush([record.oneSignalPlayerId], title, body, notifData);
      console.log(`✅ Push notification sent to user ${safeUserId}`);
      return res.status(200).json({ success: true, results });
    }

    // ── broadcast ─────────────────────────────────────────────────────────────
    if (action === 'broadcast') {
      const { title, body, data } = req.body;
      if (!title || !body) {
        return res.status(400).json({ error: 'title and body are required' });
      }

      const records = await PushToken.find({}, 'oneSignalPlayerId');
      const tokens = records.map((r) => r.oneSignalPlayerId);

      if (tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No tokens registered', sent: 0 });
      }

      const results = await sendOneSignalPush(tokens, title, body, data || {});
      console.log(`✅ Broadcast sent to ${tokens.length} devices`);
      return res.status(200).json({ success: true, sent: tokens.length, results });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
