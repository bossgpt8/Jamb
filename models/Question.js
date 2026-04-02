const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  subject: { type: String, required: true, lowercase: true, trim: true },
  question: { type: String, required: true },
  option_a: String,
  option_b: String,
  option_c: String,
  option_d: String,
  correct_answer: String,
  explanation: String,
  year: Number,
  diagram_url: String,
  topic: String
}, { timestamps: true, strict: false }); // strict: false allows any extra fields your docs may have

questionSchema.index({ subject: 1 });

// Explicitly use 'questions' collection
// IMPORTANT: Your MONGODB_URI must point to the 'jambquestion' database, e.g.:
// mongodb+srv://user:pass@cluster.mongodb.net/jambquestion
module.exports = mongoose.model('Question', questionSchema, 'questions');
