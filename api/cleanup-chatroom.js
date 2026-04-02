// Chatroom Cleanup - Delete messages older than 30 days from MongoDB
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
  res.setHeader('Content-Type', 'application/json');

  const authKey = req.query.key || req.body?.key;
  if (authKey !== process.env.CLEANUP_AUTH_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await connectDB();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await ChatMessage.deleteMany({
      createdAt: { $lt: thirtyDaysAgo.toISOString() }
    });

    console.log(`✅ Cleanup complete: deleted ${result.deletedCount} old messages`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old messages`,
      deletedBefore: thirtyDaysAgo.toISOString()
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ error: 'Cleanup failed' });
  }
};
