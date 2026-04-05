const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  uid:        String,
  name:       { type: String, required: true },
  email:      { type: String, required: true },
  subject:    { type: String, required: true },
  message:    { type: String, required: true },
  status:     { type: String, enum: ['open', 'resolved'], default: 'open' },
  notes:      String,
  resolvedAt: String
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
