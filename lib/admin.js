const User = require('../models/User');

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

const ADMIN_EXAM_CREDITS = 999999;

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

module.exports = { checkIsAdmin, ADMIN_EXAM_CREDITS };
