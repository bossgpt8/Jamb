# JambGenius

A comprehensive JAMB UTME exam preparation platform for Nigerian students.

## Architecture

### Frontend
- **Legacy static site**: Root-level HTML files (index.html, practice.html, chatroom.html, etc.) — plain HTML + Tailwind CSS via CDN + vanilla JS
- **React app**: `client/` directory — React 18, Vite, Tailwind CSS

### Backend
- **Express server**: `server.js` — main backend serving API routes on port 3001
- **Serverless functions**: `api/` directory — Vercel-compatible handlers

### Databases
- **MongoDB (Mongoose)**: Primary database for user data and chat messages
  - `models/User.js` — user credits, payment history
  - `models/ChatMessage.js` — AI chatroom messages
  - `db/mongoose.js` — connection utility
- **Supabase (PostgreSQL)**: Question bank
- **Firebase Auth**: User authentication (token verification only — no Firestore)

### Key Services
- **Paystack**: Payment processing for exam credits
- **OpenRouter (Meta Llama 3.3)**: AI tutoring and explanations
- **Cloudflare Turnstile**: CAPTCHA verification

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/verify-captcha | Cloudflare Turnstile CAPTCHA check |
| POST | /api/verify-payment | Paystack payment verification + credit update |
| POST | /api/consume-credit | Atomically deduct one exam credit |
| POST | /api/get-credits | Fetch user's current credit balance |
| POST | /api/chat | AI tutor chat (OpenRouter) |
| POST | /api/gemini-chat | AI Boss chatroom responses |
| POST | /api/gemini-explain | AI question explanations |
| POST | /api/save-ai-message | Save AI message to MongoDB |
| POST | /api/cleanup-chatroom | Delete messages older than 30 days |
| GET  | /download/:version/:filename | APK download proxy from GitHub releases |

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB connection string (required for DB) |
| FIREBASE_PROJECT_ID | Firebase project ID (for Auth) |
| FIREBASE_PRIVATE_KEY | Firebase service account private key |
| FIREBASE_CLIENT_EMAIL | Firebase service account email |
| PAYSTACK_SECRET_KEY | Paystack secret key for payment verification |
| OPENROUTER_API_KEY | OpenRouter API key for AI features |
| TURNSTILE_SECRET_KEY | Cloudflare Turnstile secret (optional in dev) |
| CLEANUP_AUTH_KEY | Auth key for chatroom cleanup endpoint |

## Workflows
- **Start application**: Runs `node server.js` (port 3001) + Vite dev server (port 5000)
