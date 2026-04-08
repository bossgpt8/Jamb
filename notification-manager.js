// Notification Manager - Manage push notifications for the app
const MAX_TOKEN_RETRY_ATTEMPTS = 30;
const TOKEN_RETRY_INTERVAL_MS = 1000;

class NotificationManager {
  constructor() {
    this.fcmToken = null;
    this.preferences = {
      reminders: true,
      chat: true,
      exams: true,
      streaks: true
    };
    this.pendingToken = null;
    this._tokenRetryCount = 0;
    this._tokenRetryTimer = null;
    this.init();
  }

  async init() {
    console.log('📱 Initializing Notification Manager');
    
    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (savedPrefs) {
      this.preferences = JSON.parse(savedPrefs);
    }

    // Capture OneSignal player ID injected by the mobile app
    const savePlayerId = (playerId) => {
      if (!playerId) return;
      this.registerOneSignalPlayerId(playerId);
    };
    if (window.__oneSignalPlayerId) savePlayerId(window.__oneSignalPlayerId);
    window.addEventListener('oneSignalPlayerId', (e) => savePlayerId(e.detail));

    // Check if running on mobile app
    if (this.isApp()) {
      this.setupAppNotifications();
    }
  }

  // Check if running in the mobile app
  isApp() {
    return navigator.userAgent.includes('JambGeniusApp') || 
           window.location.hostname === 'localhost' && window.location.port === '8080';
  }

  // Setup notifications for the app
  async setupAppNotifications() {
    console.log('🚀 Setting up app notifications');
    // Token registration happens via the WebView bridge: the mobile app
    // injects window.__oneSignalPlayerId which triggers registerOneSignalPlayerId().
    // No fake token is sent here.
  }

  // Register OneSignal player ID received from the mobile app.
  // If the user is not yet signed in the player ID is held in pendingToken and
  // retried every second for up to 30 seconds so it is never lost.
  async registerOneSignalPlayerId(playerId) {
    this.pendingToken = playerId;
    this._tokenRetryCount = 0;
    await this._flushPendingToken();
  }

  async _flushPendingToken() {
    if (!this.pendingToken) return;
    const userId = this.getCurrentUserId();
    if (!userId) {
      if (this._tokenRetryCount < MAX_TOKEN_RETRY_ATTEMPTS) {
        this._tokenRetryCount++;
        this._tokenRetryTimer = setTimeout(() => this._flushPendingToken(), TOKEN_RETRY_INTERVAL_MS);
      }
      return;
    }
    // User is now signed in — clear any pending retry timer
    if (this._tokenRetryTimer !== null) {
      clearTimeout(this._tokenRetryTimer);
      this._tokenRetryTimer = null;
    }
    const token = this.pendingToken;
    this.pendingToken = null;
    try {
      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register-token', userId, oneSignalPlayerId: token })
      });
      if (!response.ok) {
        console.error('Failed to register OneSignal player ID:', response.status);
      }
    } catch (error) {
      console.error('Error registering OneSignal player ID:', error);
    }
  }

  // Send a notification (for testing)
  async sendTestNotification() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        alert('Please sign in first');
        return;
      }

      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: 'Test Notification',
          body: 'This is a test notification from JambGenius!',
          type: 'test'
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Test notification sent');
        this.showLocalNotification('Test Notification', 'This is a test notification!');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  // Send daily study reminder
  async sendDailyReminder() {
    if (!this.preferences.reminders) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: '📚 Daily Study Time!',
          body: 'Time to practice! Keep your streak alive 🔥',
          type: 'reminder',
          deepLink: 'https://jambgenius.app/practice'
        })
      });
    } catch (error) {
      console.error('Error sending daily reminder:', error);
    }
  }

  // Send chat notification
  async sendChatNotification(senderName, message) {
    if (!this.preferences.chat) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: `💬 ${senderName}`,
          body: message.substring(0, 100),
          type: 'chat',
          deepLink: 'https://jambgenius.app/chatroom'
        })
      });
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }

  // Send exam alert
  async sendExamAlert(title, message) {
    if (!this.preferences.exams) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: `📝 ${title}`,
          body: message,
          type: 'exam',
          deepLink: 'https://jambgenius.app/exam'
        })
      });
    } catch (error) {
      console.error('Error sending exam alert:', error);
    }
  }

  // Send streak notification
  async sendStreakNotification(currentStreak) {
    if (!this.preferences.streaks) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      let message = `You're on a ${currentStreak} day streak! 🔥`;
      if (currentStreak === 7) message = 'One week streak! 🎉 Keep going!';
      if (currentStreak === 30) message = '30 day streak! You\'re amazing! 🏆';

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: '🔥 Streak Updated',
          body: message,
          type: 'streak'
        })
      });
    } catch (error) {
      console.error('Error sending streak notification:', error);
    }
  }

  // Show local notification (fallback for web)
  showLocalNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo.png',
        tag: 'jambgenius'
      });
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Called by auth-state.js after the user signs in and sessionStorage is
  // populated with the userId.  Re-flushes any pending push token that
  // could not be registered while the user was unauthenticated.
  notifyUserSignedIn() {
    this._flushPendingToken();
  }

  // Update preferences
  setPreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
    localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    console.log('✅ Notification preferences updated');
  }

  // Get current user ID
  getCurrentUserId() {
    try {
      // auth-state.js persists auth under 'jambgenius_auth_state'
      const state = JSON.parse(sessionStorage.getItem('jambgenius_auth_state') || '{}');
      return state.uid || null;
    } catch (error) {
      return null;
    }
  }
}

// Initialize globally
const notificationManager = new NotificationManager();
