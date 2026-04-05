const mongoose = require('mongoose');

// Singleton document – always upsert on key 'global'
const appConfigSchema = new mongoose.Schema({
  key:              { type: String, default: 'global', unique: true },
  maintenanceMode:  { type: Boolean, default: false },
  featureFlags:     {
    communityChat:    { type: Boolean, default: true },
    aiTutor:          { type: Boolean, default: true },
    dailyChallenge:   { type: Boolean, default: true },
    examPayment:      { type: Boolean, default: true }
  },
  perTierFeatures:  {
    free: {
      examCredits:  { type: Number, default: 0 },
      aiMessages:   { type: Number, default: 5 }
    },
    premium: {
      examCredits:  { type: Number, default: 5 },
      aiMessages:   { type: Number, default: -1 }
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', appConfigSchema);
