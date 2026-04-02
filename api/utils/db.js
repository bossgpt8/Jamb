const mongoose = require('mongoose');

// Track whether the disconnected listener has been registered
let listenerRegistered = false;
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

  isConnected = true;

  if (!listenerRegistered) {
    listenerRegistered = true;
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
    });
  }
}

module.exports = { connectDB };
