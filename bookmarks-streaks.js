// Bookmarks & Streaks - thin wrapper that delegates to bookmarks.js and streak-tracker.js
// Kept for backward compatibility with any pages that import BookmarksAndStreaks
import { auth } from './firebase-init.js';
import { bookmarkManager } from './bookmarks.js';
import { streakTracker } from './streak-tracker.js';

export class BookmarksAndStreaks {
  constructor() {
    this.currentUser = null;
    this.currentStreak = 0;
    this.totalBookmarks = 0;
  }

  setUser(user) {
    this.currentUser = user;
    bookmarkManager.loadFromFirestore();   // method name kept for compat, now hits MongoDB
    streakTracker.loadFromFirestore();     // same
  }

  async toggleBookmark(questionId, questionData) {
    return bookmarkManager.toggleBookmark(questionData);
  }

  async isBookmarked(questionId) {
    return bookmarkManager.bookmarkedQuestions.has(questionId);
  }

  async getBookmarks() {
    return bookmarkManager.getBookmarkedQuestions();
  }

  async updateStreak() {
    this.currentStreak = streakTracker.recordPractice();
    return this.currentStreak;
  }

  async getStreak() {
    return streakTracker.getCurrentStreak();
  }
}

export const bookmarksAndStreaks = new BookmarksAndStreaks();
