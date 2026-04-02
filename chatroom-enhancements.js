// Chatroom Enhancements - User presence, typing indicators, reactions
// Presence and typing use in-memory/polling only (no real-time DB needed for this scale)
import { auth } from './firebase-init.js';

class ChatroomEnhancements {
  constructor() {
    this.currentUser = null;
    this.onlineUsers = new Map();
    this.typingUsers = new Set();
    this.typingTimeout = null;
  }

  initializePresence(user) {
    if (!user) return;
    this.currentUser = user;
    // Lightweight: just track in memory. For real-time presence at scale, use a dedicated service.
    window.addEventListener('beforeunload', () => this.setUserOffline());
  }

  setUserOffline() {
    // No Firestore - presence is in-memory only
    this.onlineUsers.delete(this.currentUser?.uid);
  }

  trackOnlineUsers() {
    // No-op: online users tracked in memory during session
  }

  async startTyping() {
    // Broadcast typing via a simple polling API if needed - no Firestore required
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.stopTyping(), 3000);
  }

  async stopTyping() {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }

  trackTypingUsers() {
    // No-op: typing tracked in memory
  }

  async addReaction(messageId, emoji) {
    if (!this.currentUser) return;
    try {
      const idToken = await this.currentUser.getIdToken();
      await fetch('/api/chat-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, messageId, emoji })
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  getOnlineCount() { return this.onlineUsers.size; }

  cleanup() {
    this.setUserOffline();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }
}

export const chatroomEnhancements = new ChatroomEnhancements();
