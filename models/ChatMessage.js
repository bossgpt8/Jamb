const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  type:        { type: String, default: 'text' }, // 'text' | 'image' | 'voice'
  text:        String,
  imageData:   String, // base64 compressed image
  voiceData:   String, // base64 audio/webm
  imageName:   String,
  userId:      String,
  displayName: String,
  userEmail:   String,
  isAdmin:     { type: Boolean, default: false },
  createdAt:   { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

chatMessageSchema.index({ createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
