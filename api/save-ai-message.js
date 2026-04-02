// Save AI message to MongoDB
const mongoose = require('mongoose');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  isConnected = true;
}

const chatMessageSchema = new mongoose.Schema({
  type: { type: String, default: 'text' },
  text: String,
  userId: String,
  displayName: String,
  userEmail: String,
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

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

  const { aiMessage } = req.body;

  if (!aiMessage) {
    return res.status(400).json({ error: 'aiMessage is required' });
  }

  try {
    await connectDB();

    const msg = await ChatMessage.create({
      type: 'text',
      text: aiMessage,
      userId: 'ai-boss-system',
      displayName: 'JambGenius Boss',
      userEmail: 'boss@jambgenius.com',
      isAdmin: true,
      createdAt: new Date().toISOString()
    });

    console.log('✅ AI message saved:', msg._id);
    return res.status(200).json({
      success: true,
      messageId: msg._id.toString(),
      message: 'AI message saved successfully'
    });
  } catch (error) {
    console.error('Error saving AI message:', error);
    return res.status(500).json({ error: 'Failed to save AI message' });
  }
};
