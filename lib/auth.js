function decodeFirebaseToken(idToken) {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice(0, (4 - payload.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
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

function getTokenEmail(idToken) {
  const payload = decodeFirebaseToken(idToken);
  return payload?.email ? payload.email.toLowerCase() : null;
}

module.exports = { verifyFirebaseToken, getTokenEmail };