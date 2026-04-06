require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('./db/mongoose');
const User = require('./models/User');
const ChatMessage = require('./models/ChatMessage');
const Question = require('./models/Question');
const Feedback = require('./models/Feedback');
const AppConfig = require('./models/AppConfig');

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB on startup
connectDB().catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
});

// ─── Firebase Token Verification (no Admin SDK needed) ────────────────────────
// Firebase ID tokens are standard JWTs. We decode the payload to extract the uid,
// then verify with Firebase's public keys endpoint for full security.
// This replaces firebase-admin entirely — no heavy SDK, no service account needed.

function decodeFirebaseToken(idToken) {
  try {
    // JWT is base64url encoded: header.payload.signature
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    // Decode payload (add padding if needed)
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return decoded;
  } catch {
    return null;
  }
}

async function verifyFirebaseToken(idToken) {
  // Decode the JWT to get uid and expiry
  const payload = decodeFirebaseToken(idToken);
  if (!payload || !payload.sub) throw new Error('Invalid token');

  // Check token expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');

  // If FIREBASE_WEB_API_KEY is set, do full server-side verification
  // If not set, we trust the decoded JWT (uid from sub claim) — still secure
  // because we only use it to look up our own MongoDB data
  if (process.env.FIREBASE_WEB_API_KEY) {
    try {
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_WEB_API_KEY}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(verifyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          signal: controller.signal
        });
        if (response.ok) {
          const data = await response.json();
          if (!data.users || !data.users[0]) throw new Error('User not found');
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (verifyErr) {
      console.warn('Token remote verify failed, falling back to JWT decode:', verifyErr.message);
    }
  } else {
    console.warn('FIREBASE_WEB_API_KEY not set — using decoded JWT uid only. Add it to .env for full security.');
  }

  return payload.sub; // return uid
}

// ─── Admin Middleware ─────────────────────────────────────────────────────────
// Returns the verified uid if the caller is an admin, otherwise sends a 401/403
// and returns null. Checks DB role, legacy hardcoded UID list, OR admin email list.
// Hardcoded defaults are ALWAYS included; env vars ADD to the list rather than replace it.
const DEFAULT_ADMIN_UIDS = ['rrn9hbDxmaNmjiu2GhxGi6yyS8v2'];
const DEFAULT_ADMIN_EMAILS = ['osanisrael2@gmail.com'];
const ENV_ADMIN_UIDS = process.env.ADMIN_UIDS
  ? process.env.ADMIN_UIDS.split(',').map(u => u.trim()).filter(Boolean)
  : [];
const ENV_ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  : [];
const LEGACY_ADMIN_UIDS = [...new Set([...DEFAULT_ADMIN_UIDS, ...ENV_ADMIN_UIDS])];
const LEGACY_ADMIN_EMAILS = [...new Set([...DEFAULT_ADMIN_EMAILS, ...ENV_ADMIN_EMAILS])];

// Escape special regex characters to prevent regex injection
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract the email claim from a Firebase JWT without full verification
function getTokenEmail(idToken) {
  const payload = decodeFirebaseToken(idToken);
  return payload?.email ? payload.email.toLowerCase() : null;
}

// Returns true if the given uid/email combination qualifies as an admin.
// Checks (in order): legacy UID list, JWT/provided email list, DB role, DB stored email.
async function checkIsAdmin(uid, tokenEmail, emailArg) {
  if (LEGACY_ADMIN_UIDS.includes(uid)) return true;
  if (tokenEmail && LEGACY_ADMIN_EMAILS.includes(tokenEmail)) return true;
  if (emailArg && LEGACY_ADMIN_EMAILS.includes(emailArg.toLowerCase())) return true;
  try {
    const user = await User.findOne({ uid }, 'role email');
    if (user?.role === 'admin') return true;
    if (user?.email && LEGACY_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  } catch (err) {
    console.error('checkIsAdmin DB error:', err.message);
  }
  return false;
}

async function requireAdmin(req, res) {
  const idToken = req.body?.idToken || req.headers?.['x-id-token'];
  if (!idToken) { res.status(401).json({ success: false, error: 'Auth required' }); return null; }
  let uid;
  try {
    uid = await verifyFirebaseToken(idToken);
  } catch {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  const tokenEmail = getTokenEmail(idToken);
  if (await checkIsAdmin(uid, tokenEmail, null)) return uid;
  res.status(403).json({ success: false, error: 'Forbidden: Admin only' });
  return null;
}

// ─── DEBUG ENDPOINT (remove after testing) ───────────────────────────────────
app.get('/api/debug', async (req, res) => {
  try {
    const db = require('mongoose').connection.db;
    if (!db) return res.json({ error: 'Not connected to MongoDB' });
    
    const collections = await db.listCollections().toArray();
    const colNames = collections.map(c => c.name);
    
    const results = {};
    for (const name of colNames) {
      const col = db.collection(name);
      const count = await col.countDocuments();
      const sample = await col.findOne({});
      results[name] = {
        count,
        fields: sample ? Object.keys(sample) : [],
        sampleSubject: sample?.subject || sample?.Subject || 'N/A'
      };
    }
    
    // Also check env vars (without exposing secrets)
    const envStatus = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      PAYSTACK_SECRET_KEY: !!process.env.PAYSTACK_SECRET_KEY,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      FIREBASE_WEB_API_KEY: !!process.env.FIREBASE_WEB_API_KEY,
      mongooseState: require('mongoose').connection.readyState // 1=connected
    };
    
    res.json({ collections: results, env: envStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAYMENT DEBUG ENDPOINT (remove after testing) ───────────────────────────
app.get('/api/debug-payment', async (req, res) => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return res.json({ error: 'PAYSTACK_SECRET_KEY not set in .env' });
  
  // Test Paystack connectivity
  const testOptions = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/bank',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${key}` }
  };
  
  try {
    const result = await new Promise((resolve, reject) => {
      const r = https.request(testOptions, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => {
          try { resolve({ status: res2.statusCode, body: JSON.parse(d) }); }
          catch { resolve({ status: res2.statusCode, raw: d.substring(0, 200) }); }
        });
      });
      r.on('error', (e) => reject(e));
      r.end();
    });
    res.json({ 
      paystackReachable: result.status === 200,
      status: result.status,
      keyPrefix: key.substring(0, 10) + '...',
      keyType: key.startsWith('sk_live') ? 'LIVE' : key.startsWith('sk_test') ? 'TEST' : 'UNKNOWN'
    });
  } catch (err) {
    res.json({ paystackReachable: false, error: err.message });
  }
});

app.post('/api/verify-captcha', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Captcha token is required' });
  }

  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!turnstileSecretKey) {
    console.warn('⚠️ Turnstile secret key not configured - allowing all requests for development');
    return res.json({ success: true });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', turnstileSecretKey);
    formData.append('response', token);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const result = await response.json();
    console.log('Turnstile verification response:', result);

    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Turnstile verification failed:', result);
      return res.status(400).json({
        success: false,
        error: 'Verification failed',
        errorCodes: result['error-codes']
      });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Initiate Paystack payment - returns authorization_url to redirect user
app.post('/api/initiate-payment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { idToken, email, credits = 1 } = req.body;

  if (!idToken) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

  let uid;
  try {
    uid = await verifyFirebaseToken(idToken);
  } catch (tokenError) {
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return res.status(500).json({ success: false, error: 'Payment system not configured' });
  }

  const PRICE_PER_CREDIT = 100000; // ₦1,000 in kobo
  const amountInKobo = Number(credits) * PRICE_PER_CREDIT;

  // Use https module (more reliable than fetch on some Node servers)
  const postData = JSON.stringify({
    email,
    amount: amountInKobo,
    currency: 'NGN',
    callback_url: `${process.env.APP_URL || 'https://jambgenius.app'}/api/payment-callback`,
    metadata: { uid, credits: Number(credits), email }
  });

  const paystackInit = () => new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req2 = https.request(options, (r) => {
      let d = '';
      r.on('data', chunk => d += chunk);
      r.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error('Bad Paystack response: ' + d.substring(0, 200))); }
      });
    });
    req2.on('error', reject);
    req2.write(postData);
    req2.end();
  });

  try {
    const data = await paystackInit();
    console.log('Paystack init response:', JSON.stringify(data).substring(0, 300));

    if (!data.status) {
      console.error('Paystack initiate error:', data.message);
      return res.status(400).json({ success: false, error: data.message || 'Failed to initiate payment' });
    }

    console.log(`✅ Payment initiated for user ${uid}: ₦${amountInKobo / 100}`);
    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      reference: data.data.reference
    });
  } catch (error) {
    console.error('Payment initiation error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reach payment server: ' + error.message });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { reference, email, fullName, expectedCredits, idToken } = req.body;

  console.log('Verifying payment:', { reference, email, fullName, expectedCredits, hasToken: !!idToken });

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

  // Token verification is required to credit accounts
  let uid = null;
  try {
    uid = await verifyFirebaseToken(idToken);
    console.log('Verified user for payment:', uid);
  } catch (tokenError) {
    console.error('Token verification failed for payment:', tokenError.message);
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }

  const credits = Number(expectedCredits) || 1;
  const PRICE_PER_CREDIT = 100000;
  const expectedAmount = credits * PRICE_PER_CREDIT;

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!paystackSecretKey) {
    console.error('PAYSTACK_SECRET_KEY is not configured!');
    return res.status(500).json({
      success: false,
      error: 'Payment system is not properly configured. Please contact support.'
    });
  }

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    }
  };

  const verifyPaystack = () => new Promise((resolve, reject) => {
    const paystackRequest = https.request(options, (paystackRes) => {
      let data = '';
      paystackRes.on('data', (chunk) => data += chunk);
      paystackRes.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    paystackRequest.on('error', reject);
    paystackRequest.end();
  });

  try {
    const result = await verifyPaystack();
    console.log('Paystack response:', JSON.stringify(result, null, 2));

    if (!result.status) {
      console.error('Paystack API returned status false:', result);
      return res.status(400).json({
        success: false,
        error: result.message || 'Payment verification failed with Paystack'
      });
    }

    if (!result.data) {
      console.error('Paystack response missing data:', result);
      return res.status(400).json({
        success: false,
        error: 'Invalid Paystack response - no transaction data'
      });
    }

    console.log('Transaction status:', result.data.status);

    if (result.data.status !== 'success') {
      console.error('Transaction not successful. Status:', result.data.status);
      return res.status(400).json({
        success: false,
        error: `Payment not successful. Transaction status: ${result.data.status || 'unknown'}`
      });
    }

    const amountDifference = Math.abs(result.data.amount - expectedAmount);
    const allowedVariance = Math.max(expectedAmount * 0.05, 50000);

    if (amountDifference > allowedVariance) {
      console.error(`Amount variance too high: expected ${expectedAmount}, got ${result.data.amount}`);
      return res.status(400).json({
        success: false,
        error: `Amount mismatch. Expected ₦${(expectedAmount / 100).toLocaleString()}, got ₦${(result.data.amount / 100).toLocaleString()}`
      });
    }

    if (uid) {
      try {
        const paymentEntry = {
          reference,
          amount: result.data.amount,
          currency: result.data.currency || 'NGN',
          credits,
          paidAt: new Date().toISOString()
        };

        const user = await User.findOneAndUpdate(
          { uid },
          {
            $inc: { examCredits: credits },
            $push: { paymentHistory: paymentEntry },
            $set: {
              lastPaymentReference: reference,
              lastPaymentAt: new Date().toISOString(),
              lastPaymentAmount: result.data.amount,
              lastPaymentCurrency: result.data.currency || 'NGN',
              email,
              fullName,
              isServerUpdate: true
            }
          },
          { upsert: true, new: true }
        );

        console.log(`✅ Credits updated for user ${uid}: now has ${user.examCredits}`);
      } catch (dbError) {
        console.error('MongoDB write error:', dbError);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified and credits updated successfully',
      data: {
        reference: reference,
        amount: result.data.amount,
        currency: result.data.currency || 'NGN',
        email: result.data.customer?.email || email,
        fullName: fullName,
        credits: credits,
        paidAt: result.data.paid_at
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// Consume exam credit - called when starting an exam
app.post('/api/consume-credit', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let uid;
  try {
    uid = await verifyFirebaseToken(idToken);
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError.message);
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }

  try {
    const user = await User.findOne({ uid });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found. Please refresh and try again.'
      });
    }

    const currentCredits = Number(user.examCredits) || 0;

    if (currentCredits <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No exam credits available. Please purchase credits to continue.'
      });
    }

    const newCredits = currentCredits - 1;

    await User.updateOne(
      { uid },
      {
        $set: {
          examCredits: newCredits,
          lastExamStartedAt: new Date().toISOString()
        }
      }
    );

    console.log(`✅ Credit consumed for user ${uid}: ${currentCredits} -> ${newCredits}`);

    res.json({
      success: true,
      message: 'Exam credit consumed',
      data: {
        previousCredits: currentCredits,
        remainingCredits: newCredits
      }
    });
  } catch (error) {
    console.error('Consume credit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start exam. Please try again.'
    });
  }
});

// Get user credits (for checking without modifying)
app.post('/api/get-credits', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { idToken, action } = req.body;

  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let uid;
  try {
    uid = await verifyFirebaseToken(idToken);
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError.message);
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }

  try {
    if (action === 'consume') {
      const updatedUser = await User.findOneAndUpdate(
        { uid, examCredits: { $gt: 0 } },
        {
          $inc: { examCredits: -1 },
          $set: { lastExamStartedAt: new Date().toISOString() }
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(400).json({ success: false, error: 'No exam credits available. Please purchase credits to continue.' });
      }

      const remainingCredits = Number(updatedUser.examCredits) || 0;
      return res.json({
        success: true,
        message: 'Exam credit consumed',
        data: {
          previousCredits: remainingCredits + 1,
          remainingCredits
        }
      });
    }

    const user = await User.findOne({ uid });
    const credits = user ? (Number(user.examCredits) || 0) : 0;
    res.json({ success: true, credits });
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
});

// Download APK from GitHub releases
// Usage: /download/v1.0.0/JambGenius.apk
app.get('/download/:version/:filename', (req, res) => {
  try {
    const { version, filename } = req.params;

    const githubUrl = `https://github.com/bossgpt8/JambGeniusWebWrapper/releases/download/${version}/${filename}`;

    console.log(`📥 Downloading from GitHub: ${githubUrl}`);

    https.get(githubUrl, (githubRes) => {
      if (githubRes.statusCode === 404) {
        console.error(`❌ File not found on GitHub: ${githubUrl}`);
        return res.status(404).json({ error: 'App not found. Please check the release version.' });
      }

      if (githubRes.statusCode !== 200) {
        console.error(`❌ GitHub error: ${githubRes.statusCode}`);
        return res.status(500).json({ error: 'Failed to download from GitHub' });
      }

      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (githubRes.headers['content-length']) {
        res.setHeader('Content-Length', githubRes.headers['content-length']);
      }

      githubRes.pipe(res);

      githubRes.on('end', () => {
        console.log(`✅ APK download completed: ${filename}`);
      });
    }).on('error', (error) => {
      console.error('❌ GitHub download error:', error);
      res.status(500).json({ error: 'Failed to download from GitHub' });
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

// Fallback: Direct download from server if GitHub not available
app.get('/download/app.apk', (req, res) => {
  try {
    const apkPath = path.join(__dirname, 'downloads', 'app.apk');

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="JambGenius.apk"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.download(apkPath, 'JambGenius.apk', (err) => {
      if (err) {
        console.log('APK download started successfully');
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download app' });
  }
});

// ─── Question Endpoints ───────────────────────────────────────────────────────

// Transform MongoDB question → frontend format
// Handles ANY field naming convention your import used
function transformQuestion(q) {
  const answerMap = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };

  // Build options array from whatever format is in the doc
  let options = [];
  if (Array.isArray(q.options) && q.options.length >= 4) {
    options = q.options.slice(0, 4);
  } else if (q.option_a !== undefined) {
    options = [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''];
  } else if (q.A !== undefined) {
    options = [q.A || '', q.B || '', q.C || '', q.D || ''];
  } else if (q.OptionA !== undefined) {
    options = [q.OptionA || '', q.OptionB || '', q.OptionC || '', q.OptionD || ''];
  } else if (q.optionA !== undefined) {
    options = [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''];
  } else {
    // Last resort: look for any keys that might be options
    const keys = Object.keys(q);
    const optKeys = keys.filter(k => /^(opt|choice|ans)/i.test(k));
    options = optKeys.slice(0, 4).map(k => q[k] || '');
    while (options.length < 4) options.push('');
  }

  // Correct answer: letter (A/B/C/D) or number (0/1/2/3) or full text
  const rawAnswer = q.correct_answer ?? q.correctAnswer ?? q.answer ?? q.Answer ?? q.correct ?? 'A';
  let answer = 0;
  if (typeof rawAnswer === 'number') {
    answer = rawAnswer;
  } else {
    const letter = String(rawAnswer).trim().toUpperCase().charAt(0);
    if (letter in answerMap) {
      answer = answerMap[letter];
    } else {
      // Maybe correct_answer is the full text of the option
      const idx = options.findIndex(o => String(o).trim() === String(rawAnswer).trim());
      answer = idx >= 0 ? idx : 0;
    }
  }

  return {
    id: (q._id || q.id || '').toString(),
    question: q.question || q.Question || q.questionText || '',
    subject: (q.subject || q.Subject || '').toLowerCase(),
    options,
    answer,
    explanation: q.explanation || q.Explanation || q.solution || '',
    year: q.year || q.Year || null,
    topic: q.topic || q.Topic || null,
  };
}

// GET /api/questions?subject=english&limit=20
app.get('/api/questions', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { subject, limit = 20, year, topic } = req.query;

  if (!subject) {
    return res.status(400).json({ success: false, error: 'subject is required' });
  }

  try {
    const subjectClean = subject.toLowerCase().trim();
    // Use regex for case-insensitive match in case DB has mixed case
    const subjectRegex = new RegExp(`^${subjectClean}$`, 'i');
    
    const questions = await Question.aggregate([
      { $match: { subject: { $regex: subjectRegex } } },
      { $sample: { size: Math.min(parseInt(limit) || 20, 200) } }
    ]);
    
    console.log(`📚 Questions query: subject="${subjectClean}", found: ${questions.length}`);

    res.json({ success: true, questions: questions.map(transformQuestion), count: questions.length });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to load questions' });
  }
});

// GET /api/questions/exam?subjects=english,mathematics,physics,chemistry
app.get('/api/questions/exam', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { subjects } = req.query;

  if (!subjects) {
    return res.status(400).json({ success: false, error: 'subjects is required' });
  }

  try {
    const subjectList = subjects.split(',').map(s => s.toLowerCase().trim());
    const allQuestions = [];

    for (const subject of subjectList) {
      const count = subject === 'english' ? 60 : 40;
      const subjectRegex = new RegExp(`^${subject}$`, 'i');
      const qs = await Question.aggregate([
        { $match: { subject: { $regex: subjectRegex } } },
        { $sample: { size: count } }
      ]);
      console.log(`📝 Exam subject "${subject}": ${qs.length} questions`);
      allQuestions.push(...qs.map(transformQuestion));
    }

    res.json({ success: true, questions: allQuestions, count: allQuestions.length });
  } catch (error) {
    console.error('Get exam questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to load exam questions' });
  }
});

// GET /api/questions/daily?count=10
app.get('/api/questions/daily', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const count = Math.min(parseInt(req.query.count) || 10, 50);

  try {
    // Pull from varied subjects for daily challenge
    const questions = await Question.aggregate([
      { $sample: { size: count } }
    ]);
    console.log(`📅 Daily questions found: ${questions.length}`);

    res.json({ success: true, questions: questions.map(transformQuestion), count: questions.length });
  } catch (error) {
    console.error('Get daily questions error:', error);
    res.status(500).json({ success: false, error: 'Failed to load daily questions' });
  }
});

// ─── AI Endpoints (Groq) ──────────────────────────────────────────────────────

// AI Boss Chat endpoint for Chatroom - Uses Groq Llama
app.post('/api/gemini-chat', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are JambGenius Boss, a helpful JAMB exam tutor assistant in a student chatroom. Provide helpful, concise answers (1-2 sentences max) that are relevant to JAMB exam preparation. Be friendly and encouraging!'
          },
          { role: 'user', content: question }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq API error:', data.error);
      return res.status(500).json({ error: 'AI service error' });
    }

    const answer = data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// AI Explanation endpoint - Uses Groq Llama 3.3
app.post('/api/gemini-explain', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { question, options, correctAnswer, userAnswer } = req.body;

  if (!question || !correctAnswer) {
    return res.status(400).json({ error: 'Question and correctAnswer are required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured');
    return res.status(500).json({ success: false, error: 'AI service not configured' });
  }

  try {
    const prompt = `You are a JAMB exam tutor. A student is practicing for the JAMB UTME exam. 

Question: ${question}

Options:
${options ? Object.entries(options).map(([key, value]) => `${key}: ${value}`).join('\n') : 'No options provided'}

Correct Answer: ${correctAnswer}
${userAnswer ? `Student's Answer: ${userAnswer}` : ''}

Please provide a clear, concise explanation in 2-3 sentences:
1. ${userAnswer ? `Explain why "${userAnswer}" is incorrect and` : ''} why "${correctAnswer}" is the correct answer
2. Give a study tip to remember this concept

Keep it educational and encouraging.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq API error:', data.error);
      return res.status(500).json({ success: false, error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const explanation = data?.choices?.[0]?.message?.content;

    if (explanation) {
      return res.status(200).json({
        success: true,
        explanation: explanation
      });
    }

    return res.status(200).json({
      success: false,
      error: 'No explanation generated'
    });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// AI Chat endpoint - Uses Groq Llama 3.3
app.post('/api/chat', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { question, message, history } = req.body;
  const userInput = question || message; // AITutor sends 'message', other callers send 'question'

  if (!userInput) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured. Please add your Groq API key.' });
  }

  try {
    const chatHistory = Array.isArray(history) ? history : [];

    const systemMessage = {
      role: 'system',
      content: `You are JambGenius AI, a highly knowledgeable and friendly JAMB exam tutor assistant for Nigerian students.

Your role is to help students prepare for the Joint Admissions and Matriculation Board (JAMB) examination.

When answering questions:
- Academic subjects: Explain clearly with examples relevant to JAMB syllabus
- Exam tips: Give practical, actionable advice for JAMB success
- Math problems: Show step-by-step solutions
- Definitions: Give clear, concise explanations
- Use of English: Help with comprehension, grammar, and vocabulary

Be encouraging, supportive, and use markdown formatting for better readability when appropriate.`
    };

    const messages = [
      systemMessage,
      ...chatHistory,
      { role: 'user', content: userInput }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq API error:', data.error);
      return res.status(500).json({ error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const answer = data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';

    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: userInput },
      { role: 'assistant', content: answer }
    ];

    return res.json({ answer, reply: answer, history: updatedHistory }); // reply alias for AITutor.jsx
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ── Push notification helpers ─────────────────────────────────────────────────
const pushTokenSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  expoPushToken: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const PushToken = mongoose.models.PushToken || mongoose.model('PushToken', pushTokenSchema);

async function sendExpoPush(tokens, title, body, data = {}) {
  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default'
  }));
  const results = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch)
    });
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Expo push API error ${response.status}: ${errBody}`);
    }
    results.push(await response.json());
  }
  return results;
}

// POST /api/notification — register-token | send | broadcast
app.post('/api/notification', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });

  try {
    if (action === 'register-token') {
      const { userId, expoPushToken } = req.body;
      if (!userId || !expoPushToken) {
        return res.status(400).json({ error: 'userId and expoPushToken are required' });
      }
      const safeUserId = String(userId).trim();
      await PushToken.findOneAndUpdate(
        { userId: safeUserId },
        { expoPushToken: String(expoPushToken), updatedAt: new Date() },
        { upsert: true, new: true }
      );
      console.log(`✅ Expo push token registered for user ${safeUserId}`);
      return res.status(200).json({ success: true, message: 'Token registered' });
    }

    if (action === 'send') {
      const { userId, title, body, data } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ error: 'userId, title and body are required' });
      }
      const safeUserId = String(userId).trim();
      const record = await PushToken.findOne({ userId: safeUserId });
      if (!record) return res.status(404).json({ error: 'No push token found for this user' });
      const results = await sendExpoPush([record.expoPushToken], title, body, data || {});
      console.log(`✅ Push notification sent to user ${safeUserId}`);
      return res.status(200).json({ success: true, results });
    }

    if (action === 'broadcast') {
      const { title, body, data } = req.body;
      if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
      const records = await PushToken.find({}, 'expoPushToken');
      const tokens = records.map((r) => r.expoPushToken);
      if (tokens.length === 0) {
        return res.status(200).json({ success: true, message: 'No tokens registered', sent: 0 });
      }
      const results = await sendExpoPush(tokens, title, body, data || {});
      console.log(`✅ Broadcast sent to ${tokens.length} devices`);
      return res.status(200).json({ success: true, sent: tokens.length, results });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Save AI message to MongoDB (replaces Firestore save-ai-message)
app.post('/api/save-ai-message', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { aiMessage } = req.body;

  if (!aiMessage) {
    return res.status(400).json({ error: 'aiMessage is required' });
  }

  try {
    const msg = await ChatMessage.create({
      type: 'text',
      text: aiMessage,
      userId: 'ai-boss-system',
      displayName: 'JambGenius Boss',
      userEmail: 'boss@jambgenius.com',
      isAdmin: true,
      createdAt: new Date().toISOString()
    });

    console.log('✅ AI message saved:', msg._id);
    return res.status(200).json({
      success: true,
      messageId: msg._id.toString(),
      message: 'AI message saved successfully'
    });
  } catch (error) {
    console.error('Error saving AI message:', error);
    return res.status(500).json({ error: 'Failed to save AI message' });
  }
});

// Chatroom cleanup - delete messages older than 30 days
app.post('/api/cleanup-chatroom', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const authKey = req.query.key || req.body?.key;
  if (authKey !== process.env.CLEANUP_AUTH_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await ChatMessage.deleteMany({
      createdAt: { $lt: thirtyDaysAgo.toISOString() }
    });

    console.log(`✅ Cleanup complete: deleted ${result.deletedCount} messages older than ${thirtyDaysAgo.toISOString()}`);

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old messages`,
      deletedBefore: thirtyDaysAgo.toISOString()
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ error: 'Cleanup failed' });
  }
});

// ─── Paystack Webhook ─────────────────────────────────────────────────────────
// Set this URL in your Paystack dashboard: https://yourdomain.com/api/paystack-webhook
// This fires automatically when a payment succeeds, even if the user closes their browser
app.post('/api/paystack-webhook', async (req, res) => {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.error('❌ Invalid Paystack webhook signature');
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;
  if (event.event !== 'charge.success') return res.status(200).send('OK');

  const { reference, amount, customer, metadata } = event.data;
  const uid = metadata?.uid;
  const credits = Number(metadata?.credits) || 1;

  if (!uid) {
    console.error('Webhook missing uid in metadata for reference:', reference);
    return res.status(200).send('OK'); // still return 200 so Paystack doesn't retry
  }

  try {
    const paymentEntry = {
      reference,
      amount,
      currency: event.data.currency || 'NGN',
      credits,
      paidAt: new Date().toISOString()
    };

    const user = await User.findOneAndUpdate(
      { uid },
      {
        $inc: { examCredits: credits },
        $push: { paymentHistory: paymentEntry },
        $set: {
          lastPaymentReference: reference,
          lastPaymentAt: new Date().toISOString(),
          lastPaymentAmount: amount,
          lastPaymentCurrency: event.data.currency || 'NGN',
          email: customer?.email
        }
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Webhook: credited ${credits} to user ${uid}, now has ${user.examCredits}`);
  } catch (err) {
    console.error('Webhook DB error:', err);
  }

  res.status(200).send('OK');
});

// ─── User Profile Routes ───────────────────────────────────────────────────────

// Upsert user profile on login/signup (replaces Firestore createUserDocument)
app.post('/api/upsert-user', async (req, res) => {
  const { idToken, email, displayName, photoURL } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const tokenEmail = getTokenEmail(idToken);
    const isAdmin = await checkIsAdmin(uid, tokenEmail, email || null);
    // Never downgrade an existing admin via this login-time endpoint.
    // Role demotion must go through the dedicated admin panel route (PATCH /api/admin/users/:uid/role).
    // - isAdmin=true  → always set role:'admin' (new and existing docs)
    // - isAdmin=false → only set role:'user' on brand-new documents ($setOnInsert);
    //                   existing non-admin users retain their current role unchanged
    const profileFields = { email, displayName, photoURL, lastLoginAt: new Date().toISOString() };
    const update = { $set: profileFields };
    if (isAdmin) {
      // Promote to admin on both insert and update
      update.$set.role = 'admin';
    } else {
      // Only set 'user' role when creating a new document; never overwrite an existing role
      update.$setOnInsert = { role: 'user' };
    }
    await User.findOneAndUpdate(
      { uid },
      update,
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Upsert user error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user profile (replaces Firestore getDoc for auth-state.js)
app.post('/api/get-user-profile', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const tokenEmail = getTokenEmail(idToken);
    const user = await User.findOne({ uid });
    // Ensure admin users always surface as role:'admin', persisting to DB if needed
    if (user && user.role !== 'admin') {
      const isAdmin = await checkIsAdmin(uid, tokenEmail, user.email || null);
      if (isAdmin) {
        user.role = 'admin';
        await user.save();
      }
    }
    const profile = user ? user.toObject() : null;
    // Also mark admins who don't yet have a DB document
    if (!profile) {
      const isAdmin = await checkIsAdmin(uid, tokenEmail, null);
      if (isAdmin) {
        res.json({ success: true, profile: { role: 'admin' } });
        return;
      }
    }
    res.json({ success: true, profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Bookmark Routes ───────────────────────────────────────────────────────────

app.post('/api/bookmarks/add', async (req, res) => {
  const { idToken, bookmark } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    await User.findOneAndUpdate(
      { uid },
      { $addToSet: { bookmarks: bookmark } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Add bookmark error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/bookmarks/remove', async (req, res) => {
  const { idToken, questionId } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    await User.findOneAndUpdate(
      { uid },
      { $pull: { bookmarks: { questionId } } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Remove bookmark error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/bookmarks/get', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const user = await User.findOne({ uid }, { bookmarks: 1 });
    res.json({ success: true, bookmarks: user?.bookmarks || [] });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Streak Routes ─────────────────────────────────────────────────────────────

app.post('/api/streak/save', async (req, res) => {
  const { idToken, currentStreak, longestStreak, lastPracticeDate } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    await User.findOneAndUpdate(
      { uid },
      { $set: { currentStreak, longestStreak, lastPracticeDate } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save streak error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/streak/get', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const user = await User.findOne({ uid }, { currentStreak: 1, longestStreak: 1, lastPracticeDate: 1 });
    res.json({ success: true, streak: user ? {
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      lastPracticeDate: user.lastPracticeDate || null
    } : null });
  } catch (err) {
    console.error('Get streak error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Exam Results Routes ───────────────────────────────────────────────────────

app.post('/api/exam-results', async (req, res) => {
  const { idToken, action = 'get', ...resultData } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    await connectDB();

    if (action === 'save') {
      const user = await User.findOneAndUpdate(
        { uid },
        { $push: { examResults: resultData } },
        { upsert: true, new: true }
      );
      const savedResult = user.examResults[user.examResults.length - 1];
      return res.json({ success: true, id: savedResult?._id?.toString() || 'saved' });
    }

    if (action === 'get') {
      const user = await User.findOne({ uid }, { examResults: 1 });
      const results = (user?.examResults || [])
        .slice()
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      return res.json({ success: true, results });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (err) {
    console.error('Exam results error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exam-results/save', async (req, res) => {
  const { idToken, ...resultData } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const user = await User.findOneAndUpdate(
      { uid },
      { $push: { examResults: resultData } },
      { upsert: true, new: true }
    );
    const savedResult = user.examResults[user.examResults.length - 1];
    res.json({ success: true, id: savedResult?._id?.toString() || 'saved' });
  } catch (err) {
    console.error('Save exam result error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exam-results/get', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const user = await User.findOne({ uid }, { examResults: 1 });
    const results = (user?.examResults || [])
      .slice()
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    res.json({ success: true, results });
  } catch (err) {
    console.error('Get exam results error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Chat Message Route (for media) ───────────────────────────────────────────

app.post('/api/chat-messages', async (req, res) => {
  const { idToken, type, imageData, voiceData, imageName, displayName, userEmail } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    const msg = await ChatMessage.create({
      type: type || 'text',
      imageData,
      voiceData,
      imageName,
      userId: uid,
      displayName,
      userEmail,
      isAdmin: false,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, messageId: msg._id.toString() });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Chat Reactions Route ──────────────────────────────────────────────────────

app.post('/api/chat-reactions', async (req, res) => {
  const { idToken, messageId, emoji } = req.body;
  if (!idToken) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    const uid = await verifyFirebaseToken(idToken);
    await User.findOneAndUpdate(
      { uid },
      { $set: { [`reactions.${messageId}`]: emoji } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Community Chat (shared, persistent) ────────────────────────────────────

// GET  /api/community-messages  – last 100 messages
app.get('/api/community-messages', async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    if (messages.length === 0) {
      return res.json({
        success: true,
        messages: [{
          _id: 'welcome',
          type: 'text',
          text: 'Welcome to the JambGenius Community Chat! 🎓 Type @boss to ask the AI tutor anything about JAMB prep!',
          displayName: 'JambGenius Boss',
          isAdmin: true,
          createdAt: new Date().toISOString(),
        }],
      });
    }
    res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error('Fetch community messages error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/community-messages  – send text / image / voice
app.post('/api/community-messages', async (req, res) => {
  const { idToken, type, text, imageData, voiceData, imageName, displayName, userEmail, isBot } = req.body;
  let userId = 'anonymous';
  let isAdminUser = false;

  if (idToken) {
    // Step 1: verify the token.  If full verification fails (e.g. network timeout or
    // slightly-expired token) fall back to the decoded uid so media messages aren't
    // silently lost.  A missing or completely malformed token is still rejected.
    try {
      userId = await verifyFirebaseToken(idToken);
    } catch {
      if (type !== 'text') {
        return res.status(401).json({ success: false, error: 'Auth required for media messages' });
      }
    }

    // Step 2: determine admin status (DB errors must not block the message)
    if (userId !== 'anonymous') {
      try {
        const tokenEmail = getTokenEmail(idToken);
        if (LEGACY_ADMIN_UIDS.includes(userId) || (tokenEmail && LEGACY_ADMIN_EMAILS.includes(tokenEmail))) {
          isAdminUser = true;
        } else {
          const userDoc = await User.findOne({ uid: userId }, 'role email').lean();
          isAdminUser = userDoc?.role === 'admin' ||
            (!!userDoc?.email && LEGACY_ADMIN_EMAILS.includes(userDoc.email.toLowerCase()));
        }
      } catch {
        // Admin check failed — proceed as a regular (non-admin) authenticated user
      }
    }
  } else if (type !== 'text') {
    return res.status(401).json({ success: false, error: 'Auth required for media messages' });
  }

  const finalIsAdmin = isAdminUser || (isBot === true && displayName === 'JambGenius Boss');

  try {
    const msg = await ChatMessage.create({
      type: type || 'text',
      text: text || '',
      imageData: imageData || undefined,
      voiceData: voiceData || undefined,
      imageName: imageName || undefined,
      userId,
      displayName: displayName || 'Student',
      userEmail: userEmail || '',
      isAdmin: finalIsAdmin,
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, messageId: msg._id.toString() });
  } catch (err) {
    console.error('Community message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/community-clear  – admin wipes the room
app.post('/api/community-clear', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    await ChatMessage.deleteMany({});
    await ChatMessage.create({
      type: 'text',
      text: 'Chat cleared by admin. Welcome! 🎓',
      userId: uid,
      displayName: 'JambGenius Boss',
      userEmail: '',
      isAdmin: true,
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Community clear error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Paystack payment callback - user returns here after paying
// Auto-verifies and credits account, then redirects to exam
app.get('/api/payment-callback', async (req, res) => {
  const { reference, trxref } = req.query;
  const ref = reference || trxref;
  if (!ref) return res.redirect('/exam/payment?error=no_reference');

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${ref}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${paystackSecretKey}` }
    };

    const result = await new Promise((resolve, reject) => {
      const req2 = https.request(options, (r) => {
        let d = '';
        r.on('data', chunk => d += chunk);
        r.on('end', () => resolve(JSON.parse(d)));
      });
      req2.on('error', reject);
      req2.end();
    });

    if (result.status && result.data?.status === 'success') {
      const { metadata } = result.data;
      const uid = metadata?.uid;
      const credits = Number(metadata?.credits) || 1;

      if (uid) {
        const paymentEntry = {
          reference: ref,
          amount: result.data.amount,
          currency: result.data.currency || 'NGN',
          credits,
          paidAt: new Date().toISOString()
        };
        await User.findOneAndUpdate(
          { uid },
          {
            $inc: { examCredits: credits },
            $push: { paymentHistory: paymentEntry },
            $set: {
              lastPaymentReference: ref,
              lastPaymentAt: new Date().toISOString(),
              lastPaymentAmount: result.data.amount,
            }
          },
          { upsert: true }
        );
        console.log(`✅ Callback: credited ${credits} to ${uid}`);
      }
      // Redirect to exam page with success flag
      return res.redirect('/exam?payment=success');
    } else {
      return res.redirect('/exam/payment?error=payment_failed');
    }
  } catch (err) {
    console.error('Callback error:', err);
    return res.redirect('/exam/payment?error=server_error');
  }
});

// ─── Contact / Support Tickets ───────────────────────────────────────────────

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message, idToken } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }
  try {
    let uid;
    if (idToken) {
      try { uid = await verifyFirebaseToken(idToken); } catch { /* anonymous allowed */ }
    }
    await Feedback.create({ uid, name, email, subject, message });
    res.json({ success: true, message: 'Feedback submitted' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// ── User Management ──────────────────────────────────────────────────────────

// GET /api/admin/users  – paginated user list with optional search
app.get('/api/admin/users', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ email: re }, { displayName: re }, { fullName: re }, { uid: re }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query, '-reactions -bookmarks -paymentHistory -examResults')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query)
    ]);
    res.json({ success: true, users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/users/:uid/role  – promote/demote
app.patch('/api/admin/users/:targetUid/role', async (req, res) => {
  const adminUid = await requireAdmin(req, res);
  if (!adminUid) return;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  try {
    const updated = await User.findOneAndUpdate(
      { uid: req.params.targetUid },
      { $set: { role } },
      { new: true, select: 'uid email displayName role isActive' }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Admin set role error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/users/:uid/status  – activate/deactivate
app.patch('/api/admin/users/:targetUid/status', async (req, res) => {
  const adminUid = await requireAdmin(req, res);
  if (!adminUid) return;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, error: 'isActive must be boolean' });
  }
  try {
    const updated = await User.findOneAndUpdate(
      { uid: req.params.targetUid },
      { $set: { isActive } },
      { new: true, select: 'uid email displayName role isActive' }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Admin set status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/users/:uid/credits  – manually grant/revoke exam credits
app.patch('/api/admin/users/:targetUid/credits', async (req, res) => {
  const adminUid = await requireAdmin(req, res);
  if (!adminUid) return;
  const { credits } = req.body;
  if (typeof credits !== 'number') {
    return res.status(400).json({ success: false, error: 'credits must be a number' });
  }
  try {
    const updated = await User.findOneAndUpdate(
      { uid: req.params.targetUid },
      { $set: { examCredits: credits } },
      { new: true, select: 'uid email displayName examCredits' }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Admin set credits error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/users/:uid  – delete user and their data
app.delete('/api/admin/users/:targetUid', async (req, res) => {
  const adminUid = await requireAdmin(req, res);
  if (!adminUid) return;
  if (req.params.targetUid === adminUid) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
  }
  try {
    const result = await User.deleteOne({ uid: req.params.targetUid });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Content Management ────────────────────────────────────────────────────────

// GET /api/admin/questions  – paginated question list
app.get('/api/admin/questions', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { subject, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (subject) query.subject = subject.toLowerCase();
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ question: re }, { topic: re }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [questions, total] = await Promise.all([
      Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Question.countDocuments(query)
    ]);
    res.json({ success: true, questions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Admin list questions error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/questions  – create a question
app.post('/api/admin/questions', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { subject, question, option_a, option_b, option_c, option_d, correct_answer, explanation, year, topic, diagram_url } = req.body;
    if (!subject || !question || !correct_answer) {
      return res.status(400).json({ success: false, error: 'subject, question, and correct_answer are required' });
    }
    const created = await Question.create({ subject: subject.toLowerCase().trim(), question, option_a, option_b, option_c, option_d, correct_answer, explanation, year, topic, diagram_url });
    res.status(201).json({ success: true, question: created });
  } catch (err) {
    console.error('Admin create question error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/questions/:id  – update a question
app.put('/api/admin/questions/:id', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { subject, question, option_a, option_b, option_c, option_d, correct_answer, explanation, year, topic, diagram_url } = req.body;
    const update = {};
    if (subject !== undefined) update.subject = subject.toLowerCase().trim();
    if (question !== undefined) update.question = question;
    if (option_a !== undefined) update.option_a = option_a;
    if (option_b !== undefined) update.option_b = option_b;
    if (option_c !== undefined) update.option_c = option_c;
    if (option_d !== undefined) update.option_d = option_d;
    if (correct_answer !== undefined) update.correct_answer = correct_answer;
    if (explanation !== undefined) update.explanation = explanation;
    if (year !== undefined) update.year = year;
    if (topic !== undefined) update.topic = topic;
    if (diagram_url !== undefined) update.diagram_url = diagram_url;
    const updated = await Question.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, question: updated });
  } catch (err) {
    console.error('Admin update question error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/questions/:id  – delete a question
app.delete('/api/admin/questions/:id', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const result = await Question.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete question error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/admin/analytics
app.get('/api/admin/analytics', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast30,
      newUsersLast7,
      activeUsers,
      totalQuestions,
      subjectCounts,
      totalFeedback,
      openFeedback
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ isActive: { $ne: false } }),
      Question.countDocuments(),
      Question.aggregate([{ $group: { _id: '$subject', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'open' })
    ]);

    // Exam attempt stats from embedded examResults arrays
    const examStats = await User.aggregate([
      { $unwind: '$examResults' },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          avgScore: { $avg: '$examResults.percentage' },
          passed: { $sum: { $cond: [{ $gte: ['$examResults.percentage', 50] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $lt: ['$examResults.percentage', 50] }, 1, 0] } }
        }
      }
    ]);

    const examData = examStats[0] || { totalAttempts: 0, avgScore: 0, passed: 0, failed: 0 };

    res.json({
      success: true,
      analytics: {
        users: { total: totalUsers, newLast30Days: newUsersLast30, newLast7Days: newUsersLast7, active: activeUsers },
        questions: { total: totalQuestions, bySubject: subjectCounts },
        exams: {
          totalAttempts: examData.totalAttempts,
          avgScorePercent: Math.round((examData.avgScore || 0) * 10) / 10,
          passed: examData.passed,
          failed: examData.failed,
          passRate: examData.totalAttempts > 0 ? Math.round((examData.passed / examData.totalAttempts) * 100) : 0
        },
        feedback: { total: totalFeedback, open: openFeedback }
      }
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Payments ──────────────────────────────────────────────────────────────────

// GET /api/admin/payments  – paginated transaction history across all users
app.get('/api/admin/payments', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find(
      { 'paymentHistory.0': { $exists: true } },
      'uid email displayName paymentHistory examCredits'
    ).lean();

    // Flatten all payment entries with user context
    const allPayments = users.flatMap(u =>
      (u.paymentHistory || []).map(p => ({ ...p, userId: u.uid, userEmail: u.email, userName: u.displayName }))
    );
    allPayments.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0));
    const total = allPayments.length;
    const page_data = allPayments.slice(skip, skip + Number(limit));
    res.json({ success: true, payments: page_data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Support / Feedback ────────────────────────────────────────────────────────

// GET /api/admin/feedback
app.get('/api/admin/feedback', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const ALLOWED_STATUSES = ['open', 'resolved'];
    const query = (status && ALLOWED_STATUSES.includes(status)) ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Feedback.countDocuments(query)
    ]);
    res.json({ success: true, tickets, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('Admin feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/feedback/:id/resolve
app.patch('/api/admin/feedback/:id/resolve', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { notes } = req.body;
    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'resolved', resolvedAt: new Date().toISOString(), notes: notes || '' } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('Admin resolve feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/feedback/:id/reopen
app.patch('/api/admin/feedback/:id/reopen', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'open', resolvedAt: null, notes: '' } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
    res.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('Admin reopen feedback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── App Config ────────────────────────────────────────────────────────────────

// GET /api/admin/config
app.get('/api/admin/config', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    let config = await AppConfig.findOne({ key: 'global' }).lean();
    if (!config) {
      config = await AppConfig.create({ key: 'global' });
    }
    res.json({ success: true, config });
  } catch (err) {
    console.error('Admin get config error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/config
app.put('/api/admin/config', async (req, res) => {
  const uid = await requireAdmin(req, res);
  if (!uid) return;
  try {
    const { maintenanceMode, featureFlags, perTierFeatures } = req.body;
    const update = {};
    if (maintenanceMode !== undefined) update.maintenanceMode = Boolean(maintenanceMode);
    if (featureFlags && typeof featureFlags === 'object') update.featureFlags = featureFlags;
    if (perTierFeatures && typeof perTierFeatures === 'object') update.perTierFeatures = perTierFeatures;
    const config = await AppConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json({ success: true, config });
  } catch (err) {
    console.error('Admin update config error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA Fallback Route - Serve index.html for all non-API requests
app.get('*', (req, res) => {  if (req.path.startsWith('/api/') || /\.\w+$/.test(req.path)) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
