// Question Bookmarking System - localStorage + MongoDB backend
import { auth } from './firebase-init.js';

class BookmarkManager {
  constructor() {
    this.bookmarkedQuestions = new Set();
    this.bookmarkedData = {};
    this.loadLocal();
  }

  generateQuestionId(question) {
    return btoa(`${question.subject}_${question.question}`).replace(/=/g, '').substring(0, 20);
  }

  loadLocal() {
    try {
      const stored = localStorage.getItem('jambgenius_bookmarks');
      if (stored) this.bookmarkedQuestions = new Set(JSON.parse(stored));
      const data = localStorage.getItem('jambgenius_bookmarks_data');
      if (data) this.bookmarkedData = JSON.parse(data);
    } catch (e) {
      console.error('Error loading bookmarks:', e);
    }
  }

  saveLocal() {
    localStorage.setItem('jambgenius_bookmarks', JSON.stringify(Array.from(this.bookmarkedQuestions)));
    localStorage.setItem('jambgenius_bookmarks_data', JSON.stringify(this.bookmarkedData));
  }

  async toggleBookmark(question) {
    const questionId = this.generateQuestionId(question);
    const isBookmarked = this.bookmarkedQuestions.has(questionId);
    if (isBookmarked) {
      await this.removeBookmark(question);
    } else {
      await this.addBookmark(question);
    }
    return !isBookmarked;
  }

  async addBookmark(question) {
    const questionId = this.generateQuestionId(question);
    if (this.bookmarkedQuestions.has(questionId)) return;

    const entry = {
      questionId,
      question: question.question,
      subject: question.subject,
      options: question.options || {},
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      difficulty: question.difficulty || 'medium',
      bookmarkedAt: new Date().toISOString()
    };

    this.bookmarkedQuestions.add(questionId);
    this.bookmarkedData[questionId] = entry;
    this.saveLocal();

    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        await fetch('/api/bookmarks/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, bookmark: entry })
        });
      } catch (error) {
        console.error('Error saving bookmark to MongoDB:', error);
      }
    }
  }

  async removeBookmark(question) {
    const questionId = this.generateQuestionId(question);
    this.bookmarkedQuestions.delete(questionId);
    delete this.bookmarkedData[questionId];
    this.saveLocal();

    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        await fetch('/api/bookmarks/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, questionId })
        });
      } catch (error) {
        console.error('Error removing bookmark from MongoDB:', error);
      }
    }
  }

  isBookmarked(question) {
    return this.bookmarkedQuestions.has(this.generateQuestionId(question));
  }

  async getBookmarkedQuestions() {
    return Object.values(this.bookmarkedData);
  }

  async loadFromFirestore() {
    // Renamed for compatibility - now loads from MongoDB
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/bookmarks/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (data.success && data.bookmarks) {
        data.bookmarks.forEach(b => {
          this.bookmarkedQuestions.add(b.questionId);
          this.bookmarkedData[b.questionId] = b;
        });
        this.saveLocal();
      }
    } catch (error) {
      console.error('Error loading bookmarks from MongoDB:', error);
    }
  }

  getBookmarkCount() {
    return this.bookmarkedQuestions.size;
  }
}

export const bookmarkManager = new BookmarkManager();
