// Public origin of this backend. PUBLIC_BACKEND_URL may hold a full callback
// URL, so only its origin is used.
function publicBaseUrl(req) {
  const raw = (process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get('host')}`).trim();
  try {
    return new URL(raw).origin;
  } catch (error) {
    return raw.replace(/\/auth\/.*$/i, '').replace(/\/$/, '');
  }
}

module.exports = { publicBaseUrl };
