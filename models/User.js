const mongoose = require('mongoose');

const paymentEntrySchema = new mongoose.Schema({
  reference: String,
  amount: Number,
  currency: { type: String, default: 'NGN' },
  credits: Number,
  paidAt: String
}, { _id: false });

const bookmarkSchema = new mongoose.Schema({
  questionId: String,
  question: String,
  subject: String,
  options: mongoose.Schema.Types.Mixed,
  correctAnswer: String,
  explanation: String,
  difficulty: String,
  bookmarkedAt: String
}, { _id: false });

const examResultSchema = new mongoose.Schema({
  totalScore: Number,
  percentage: Number,
  correctAnswers: Number,
  wrongAnswers: Number,
  subjectScores: mongoose.Schema.Types.Mixed,
  timeSpent: Number,
  completedAt: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  uid:                  { type: String, required: true, unique: true },
  email:                String,
  fullName:             String,
  displayName:          String,
  photoURL:             String,
  examCredits:          { type: Number, default: 0 },
  paymentHistory:       { type: [paymentEntrySchema], default: [] },
  lastPaymentReference: String,
  lastPaymentAt:        String,
  lastPaymentAmount:    Number,
  lastPaymentCurrency:  String,
  lastExamStartedAt:    String,
  // Streaks
  currentStreak:        { type: Number, default: 0 },
  longestStreak:        { type: Number, default: 0 },
  lastPracticeDate:     String,
  // Bookmarks
  bookmarks:            { type: [bookmarkSchema], default: [] },
  // Exam results history
  examResults:          { type: [examResultSchema], default: [] },
  // Reactions: map of messageId -> emoji
  reactions:            { type: Map, of: String, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
