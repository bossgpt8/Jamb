const https = require('https');
const { connectDB } = require('../lib/db');
const User = require('../models/User');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

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
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Bad Paystack response'));
          }
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
};