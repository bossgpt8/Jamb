// Study Streak Tracker - localStorage + MongoDB backend
import { auth } from './firebase-init.js';

class StreakTracker {
  constructor() {
    this.currentStreak = 0;
    this.longestStreak = 0;
    this.lastPracticeDate = null;
    this.today = this.getToday();
    this.loadLocal();
  }

  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  getYesterday() {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split('T')[0];
  }

  loadLocal() {
    try {
      const stored = localStorage.getItem('jambgenius_streak');
      if (stored) {
        const data = JSON.parse(stored);
        this.currentStreak = data.currentStreak || 0;
        this.longestStreak = data.longestStreak || 0;
        this.lastPracticeDate = data.lastPracticeDate;
      }
    } catch (e) {
      console.error('Error loading streak:', e);
    }
  }

  saveLocal() {
    localStorage.setItem('jambgenius_streak', JSON.stringify({
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      lastPracticeDate: this.lastPracticeDate,
      savedAt: new Date().toISOString()
    }));
  }

  recordPractice() {
    const today = this.getToday();
    if (this.lastPracticeDate === today) return this.currentStreak;

    this.currentStreak = this.lastPracticeDate === this.getYesterday()
      ? this.currentStreak + 1
      : 1;

    if (this.currentStreak > this.longestStreak) this.longestStreak = this.currentStreak;
    this.lastPracticeDate = today;
    this.saveLocal();
    this.saveToFirestore(); // method name kept for compatibility
    return this.currentStreak;
  }

  async saveToFirestore() {
    // Now saves to MongoDB, method name kept for compatibility
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/streak/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          currentStreak: this.currentStreak,
          longestStreak: this.longestStreak,
          lastPracticeDate: this.lastPracticeDate
        })
      });
    } catch (error) {
      console.error('Error saving streak to MongoDB:', error);
    }
  }

  async loadFromFirestore() {
    // Now loads from MongoDB, method name kept for compatibility
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/streak/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (data.success && data.streak) {
        this.currentStreak = data.streak.currentStreak || 0;
        this.longestStreak = data.streak.longestStreak || 0;
        this.lastPracticeDate = data.streak.lastPracticeDate;
        this.saveLocal();
      }
    } catch (error) {
      console.error('Error loading streak from MongoDB:', error);
    }
  }

  getCurrentStreak() { return this.currentStreak; }
  getLongestStreak() { return this.longestStreak; }

  getStreakStatus() {
    if (this.currentStreak === 0) return 'Start your streak today! 🔥';
    if (this.currentStreak === 1) return 'Day 1 of your streak! 🎯';
    if (this.currentStreak < 7) return `${this.currentStreak} day streak! Keep going! 🔥`;
    if (this.currentStreak < 30) return `${this.currentStreak} day streak! Amazing! 🚀`;
    return `${this.currentStreak} day streak! Legend status! 👑`;
  }

  getStreakBadge() {
    if (this.currentStreak >= 100) return '👑';
    if (this.currentStreak >= 30) return '🚀';
    if (this.currentStreak >= 7) return '🔥';
    if (this.currentStreak >= 1) return '🎯';
    return '';
  }
}

export const streakTracker = new StreakTracker();
