# JambGenius

JambGenius is a full-stack JAMB preparation platform built with a React/Vite frontend and an Express/MongoDB backend. It includes practice questions, mock exams, AI tutoring, analytics, community features, notifications, payment handling, and authentication.

## What’s Included

- Practice mode with topic, year, and subject filtering
- Mock exam flow with exam room and payment gating
- AI tutor and answer explanation flows powered by Groq
- Daily challenge, analytics, profile, and sample questions pages
- Study tips, syllabus, help center, contact, privacy, and terms pages
- Firebase authentication with protected routes
- MongoDB-backed question, chat, and user data
- Paystack payment initiation and verification
- Turnstile captcha verification
- Notification helpers and chatroom support

## Project Structure

The repository is split into two main parts:

- `client/` - React app built with Vite
- root `server.js` - Express server and local API implementation
- `api/` - Vercel serverless functions
- `models/` and `db/` - MongoDB models and connection helpers

## Frontend Routes

The active React app includes these routes:

- `/` - Home
- `/practice` - Practice questions
- `/practice/exam` - Practice exam mode
- `/exam` - Exam entry
- `/exam/payment` - Payment step
- `/exam/room` - Exam room
- `/community` - Community area
- `/more` - More tools and shortcuts
- `/ai-tutor` - AI tutor
- `/analytics` - Performance analytics
- `/profile` - User profile
- `/daily-challenge` - Daily challenge
- `/study-tips` - Study tips
- `/syllabus` - Syllabus
- `/notifications` - Notifications
- `/sample-questions` - Sample questions
- `/help` - Help center
- `/contact` - Contact page
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## Tech Stack

- React 18
- Vite
- React Router
- Firebase Auth
- Express
- MongoDB with Mongoose
- Paystack payments
- Groq API for AI responses
- Cloudflare Turnstile captcha

## API Overview

The project uses these backend endpoints and functions:

- `GET /api/questions` - fetch practice, daily, or exam questions
- `POST /api/initiate-payment` - start Paystack checkout
- `POST /api/verify-payment` - verify payment status
- `POST /api/get-credits` - fetch user exam credits
- `POST /api/verify-captcha` - verify captcha token
- `POST /api/chat` - AI chat response
- `POST /api/gemini-chat` - alternate AI chat handler
- `POST /api/gemini-explain` - AI explanation generator
- `POST /api/save-ai-message` - store AI chat messages
- `POST /api/cleanup-chatroom` - remove old chat messages

The root `server.js` also contains debug routes used during development.

## Environment Variables

Set these values for local development and deployment:

- `MONGODB_URI`
- `GROQ_API_KEY`
- `PAYSTACK_SECRET_KEY`
- `TURNSTILE_SECRET_KEY`
- `FIREBASE_WEB_API_KEY`
- `APP_URL`
- `CLEANUP_AUTH_KEY`
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are no longer required for the current MongoDB-first setup

## Local Development

Install dependencies in both the root project and the client app:

1. `npm install`
2. `cd client && npm install`

Then run the frontend and backend as needed:

- Frontend: `cd client && npm run dev`
- Backend: `npm run dev`

The client Vite dev server runs on port `5000`.

## Build and Deploy

The Vercel config builds the client with:

- `cd client && npm install && npm run build`

The output directory is `client/dist`, and `/api/*` requests are routed to the Vercel serverless functions.

## Notes

- The app is no longer a static HTML site.
- MongoDB is now the primary data store.
- Legacy Supabase/Vercel helper functions were removed to keep the deployment under the Hobby function limit.
- The old static-page README no longer matched the codebase, so this version reflects the current React app and backend.

## License

© 2026 JambGenius. All rights reserved.
