const crypto = require('crypto');
const path = require('path');
const { publicBaseUrl } = require('./publicUrl');

const resumesDir = path.join(__dirname, '../uploads/resumes');
const RESUME_FILE = /^[A-Za-z0-9._-]+$/;

// Accepts a stored resume URL (old full URLs or "/uploads/resumes/<file>")
// and returns just the file name, or null when it is not one of our uploads.
function resumeFileFromUrl(value) {
  const clean = String(value || '').split(/[?#]/)[0];
  const match = clean.match(/\/uploads\/resumes\/([^/]+)$/);
  if (!match || !RESUME_FILE.test(match[1])) return null;
  return match[1];
}

function signature(file, exp) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${file}.${exp}`).digest('base64url');
}

// CVs are private: only short-lived signed links are handed out.
function signResumeUrl(req, value, ttlSeconds = 3600) {
  const file = resumeFileFromUrl(value);
  if (!file) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${publicBaseUrl(req)}/resumes/${encodeURIComponent(file)}?exp=${exp}&sig=${signature(file, exp)}`;
}

function verifyResumeSignature(file, exp, sig) {
  if (!RESUME_FILE.test(String(file)) || !/^\d+$/.test(String(exp)) || Number(exp) < Date.now() / 1000) return false;
  const expected = Buffer.from(signature(file, exp));
  const given = Buffer.from(String(sig || ''));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = { resumesDir, resumeFileFromUrl, signResumeUrl, verifyResumeSignature };
