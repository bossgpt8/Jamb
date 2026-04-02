const https = require('https');
const { connectDB } = require('../db/mongoose');

function decodeFirebaseToken(idToken) {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
    const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return decoded;
  } catch {
    return null;
  }
}

async function verifyFirebaseToken(idToken) {
  const payload = decodeFirebaseToken(idToken);
  if (!payload || !payload.sub) throw new Error('Invalid token');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');

  if (process.env.FIREBASE_WEB_API_KEY) {
    try {
      const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_WEB_API_KEY}`;
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (response.ok) {
        const data = await response.json();
        if (!data.users || !data.users[0]) throw new Error('User not found');
      }
    } catch (verifyErr) {
      console.warn('Token remote verify failed, falling back to JWT decode:', verifyErr.message);
    }
  }

  return payload.sub;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    await connectDB();
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
};
