const jwt = require('jsonwebtoken');
const db = require('../db');

// Tokens live for 30 days, so a ban has to be checked per request. Results are
// cached briefly to keep this to one cheap query per user every 30 seconds.
const BAN_CACHE_MS = 30 * 1000;
const banCache = new Map();

async function isBanned(userId) {
  const cached = banCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.banned;
  const result = await db.query('SELECT banned_at FROM users WHERE id = $1', [userId]);
  const banned = !!result.rows[0]?.banned_at;
  banCache.set(userId, { banned, expires: Date.now() + BAN_CACHE_MS });
  return banned;
}

function forgetBan(userId) {
  banCache.delete(userId);
}

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Davam etmək üçün daxil ol.' });
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Sessiyanın vaxtı bitib. Yenidən daxil ol.' });
  }
  try {
    if (await isBanned(payload.id)) {
      return res.status(403).json({ message: 'Hesabın qaydaları pozduğu üçün bloklanıb.', banned: true });
    }
  } catch (error) {
    console.error('auth ban check error:', error);
  }
  req.user = payload;
  next();
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    req.user = null;
  }
  return next();
};

module.exports = { auth, optionalAuth, isBanned, forgetBan };

