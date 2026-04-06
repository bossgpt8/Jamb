const https = require('https');
const { connectDB } = require('../lib/db');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../lib/auth');

async function handleInitiatePayment(req, res) {
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
}

async function handleVerifyPayment(req, res) {
  const { reference, email, fullName, expectedCredits } = req.body;

  console.log('Verifying payment:', { reference, email, fullName, expectedCredits });

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

  const credits = expectedCredits || 1;
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

  return new Promise((resolve) => {
    const paystackRequest = https.request(options, (paystackRes) => {
      let data = '';
      paystackRes.on('data', (chunk) => { data += chunk; });
      paystackRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('=== FULL PAYSTACK RESPONSE ===');
          console.log('Status:', result.status);
          console.log('Message:', result.message);
          console.log('Data:', JSON.stringify(result.data, null, 2));
          console.log('==============================');

          if (!result.status) {
            console.error('Paystack request failed:', result.message);
            return resolve(res.status(400).json({ success: false, error: result.message || 'Verification failed' }));
          }

          if (result.data.status !== 'success') {
            return resolve(res.status(400).json({ success: false, error: `Payment not successful: ${result.data.status}` }));
          }

          const amountDifference = Math.abs(result.data.amount - expectedAmount);
          const allowedVariance = Math.max(expectedAmount * 0.05, 50000);

          if (amountDifference > allowedVariance) {
            const percentDifference = (amountDifference / expectedAmount) * 100;
            console.error('Amount mismatch:', { expected: expectedAmount, received: result.data.amount, difference: amountDifference, percentDifference, credits });
            return resolve(res.status(400).json({
              success: false,
              error: `Amount variance too high. Expected ₦${(expectedAmount / 100).toFixed(2)}, got ₦${(result.data.amount / 100).toFixed(2)}. This may be due to payment processing fees. Contact support with reference: ${result.data.reference}`
            }));
          }

          return resolve(res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: {
              reference: result.data.reference,
              amount: result.data.amount,
              currency: result.data.currency || 'NGN',
              email: result.data.customer.email,
              paidAt: result.data.paid_at,
              status: result.data.status,
              credits
            }
          }));
        } catch (error) {
          console.error('Error parsing Paystack response:', error);
          return resolve(res.status(500).json({ success: false, error: 'Failed to process payment verification' }));
        }
      });
    });

    paystackRequest.on('error', (error) => {
      console.error('Paystack request error:', error);
      return resolve(res.status(500).json({ success: false, error: 'Payment verification failed' }));
    });

    paystackRequest.end();
  });
}

async function handlePaymentCallback(req, res) {
  const { reference, trxref } = req.query;
  const ref = reference || trxref;

  if (!ref) {
    return res.redirect('/exam/payment?error=no_reference');
  }

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return res.redirect('/exam/payment?error=payment_not_configured');
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/transaction/verify/${ref}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${paystackSecretKey}` }
    };

    const result = await new Promise((resolve, reject) => {
      const req2 = https.request(options, (r) => {
        let data = '';
        r.on('data', chunk => data += chunk);
        r.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (error) { reject(new Error('Bad Paystack response')); }
        });
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

        await connectDB();
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
      }

      return res.redirect('/exam?payment=success');
    }

    return res.redirect('/exam/payment?error=payment_failed');
  } catch (error) {
    console.error('Callback error:', error);
    return res.redirect('/exam/payment?error=server_error');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  if (action === 'callback') return handlePaymentCallback(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (action === 'initiate') return handleInitiatePayment(req, res);
  if (action === 'verify') return handleVerifyPayment(req, res);

  return res.status(404).json({ error: 'Unknown payment action' });
};
