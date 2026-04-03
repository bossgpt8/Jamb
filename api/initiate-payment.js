const https = require('https');
const { connectDB } = require('../lib/db');
const { verifyFirebaseToken } = require('../lib/auth');

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
    const paystackRequest = https.request(options, (r) => {
      let responseData = '';
      r.on('data', chunk => responseData += chunk);
      r.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch (e) { reject(new Error('Bad Paystack response: ' + responseData.substring(0, 200))); }
      });
    });
    paystackRequest.on('error', reject);
    paystackRequest.write(postData);
    paystackRequest.end();
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
