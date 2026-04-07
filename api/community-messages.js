const { connectDB } = require('../lib/db');
const ChatMessage = require('../models/ChatMessage');
const { verifyFirebaseToken, getTokenEmail } = require('../lib/auth');
const { checkIsAdmin } = require('../lib/admin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection error:', err);
    return res.status(500).json({ success: false, error: 'Database connection failed' });
  }

  // ── GET: fetch last 100 messages ─────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const messages = await ChatMessage.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      if (messages.length === 0) {
        return res.json({
          success: true,
          messages: [{
            _id: 'welcome',
            type: 'text',
            text: 'Welcome to the JambGenius Community Chat! 🎓 Ask questions, share tips, and help each other ace JAMB!',
            displayName: 'JambGenius Boss',
            isAdmin: true,
            createdAt: new Date().toISOString(),
          }],
        });
      }
      return res.json({ success: true, messages: messages.reverse() });
    } catch (err) {
      console.error('Fetch community messages error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── POST: send a message ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { idToken, type, text, imageData, voiceData, imageName, displayName, userEmail } = req.body || {};
    let userId = 'anonymous';
    let isAdminUser = false;

    // Input validation
    const MAX_TEXT_LENGTH = 2000;
    const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB base64 ≈ 3.75 MB binary

    if (text && text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ success: false, error: 'Message text too long' });
    }
    if (imageData && imageData.length > MAX_MEDIA_BYTES) {
      return res.status(400).json({ success: false, error: 'Image data too large' });
    }
    if (voiceData && voiceData.length > MAX_MEDIA_BYTES) {
      return res.status(400).json({ success: false, error: 'Voice data too large' });
    }

    if (idToken) {
      try {
        userId = await verifyFirebaseToken(idToken);
      } catch {
        if (type !== 'text') {
          return res.status(401).json({ success: false, error: 'Auth required for media messages' });
        }
      }

      if (userId !== 'anonymous') {
        try {
          const tokenEmail = getTokenEmail(idToken);
          isAdminUser = await checkIsAdmin(userId, tokenEmail, userEmail || null);
        } catch {
          // Admin check failed — proceed as regular authenticated user
        }
      }
    } else if (type !== 'text') {
      return res.status(401).json({ success: false, error: 'Auth required for media messages' });
    }

    const VALID_TYPES = ['text', 'image', 'voice'];
    const msgType = VALID_TYPES.includes(type) ? type : 'text';

    try {
      const msg = await ChatMessage.create({
        type: msgType,
        text: text || '',
        imageData: imageData || undefined,
        voiceData: voiceData || undefined,
        imageName: imageName || undefined,
        userId,
        displayName: displayName || 'Student',
        userEmail: userEmail || '',
        isAdmin: isAdminUser,
        createdAt: new Date().toISOString(),
      });
      return res.json({ success: true, messageId: msg._id.toString() });
    } catch (err) {
      console.error('Community message error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
