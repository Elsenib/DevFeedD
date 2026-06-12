const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dns = require('dns').promises;
const db = require('../db');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'devfeed-secret';

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'trashmail.com', 'tempmail.com',
  'temp-mail.org', 'dispostable.com', 'fakeinbox.com', 'yopmail.com', 'spamgourmet.com', 'maildrop.cc',
  'getnada.com', 'guerrillamail.net', 'sharklasers.com', 'mailnesia.com', 'discard.email', 'disposable.email',
  'spam4.me', 'emailondeck.com', 'trashmail.net', 'tempmail.plus', 'mintemail.com', 'tempmail.io', 'disposablemail.io'
]);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getEmailDomain(email) {
  const parts = normalizeEmail(email).split('@');
  return parts.length === 2 ? parts[1] : '';
}

function isValidEmailFormat(email) {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}

function isDisposableEmail(email) {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  const domainPieces = domain.split('.');
  if (domainPieces.length > 2) {
    const apex = domainPieces.slice(-2).join('.');
    if (DISPOSABLE_EMAIL_DOMAINS.has(apex)) return true;
  }
  return false;
}

async function hasValidMailServer(email) {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (Array.isArray(mxRecords) && mxRecords.length > 0) return true;
  } catch (err) {
    // ignore and try A/AAAA fallback
  }

  try {
    const aRecords = await dns.resolve4(domain);
    if (Array.isArray(aRecords) && aRecords.length > 0) return true;
  } catch (err) {
    // ignore
  }

  try {
    const a6Records = await dns.resolve6(domain);
    if (Array.isArray(a6Records) && a6Records.length > 0) return true;
  } catch (err) {
    // ignore
  }

  return false;
}

async function validateEmail(email) {
  if (!isValidEmailFormat(email)) {
    return { valid: false, message: 'Düzgün email daxil edin.' };
  }

  if (isDisposableEmail(email)) {
    return { valid: false, message: 'Bu email qeydiyyat üçün istifadə oluna bilməz.' };
  }

  const hasServer = await hasValidMailServer(email);
  if (!hasServer) {
    return { valid: false, message: 'Email domain mövcud deyil və ya düzgün deyil.' };
  }

  return { valid: true };
}

router.post('/register', async (req, res) => {
  const { name, email, password, role, skills, languages } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = String(name || '').trim();

  if (!trimmedName || !normalizedEmail || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  try {
    if (password.length < 7) {
      return res.status(400).json({ message: 'Şifrə ən az 7 simvol olmalıdır.' });
    }

    const emailValidation = await validateEmail(normalizedEmail);
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.message });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Normalize JSON fields
    const skillsJson = Array.isArray(skills) ? skills : (skills ? [skills] : []);
    const langsJson = Array.isArray(languages) ? languages : (languages ? [languages] : []);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, skills, languages)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING id, name, email, role, skills, languages`,
      [trimmedName, normalizedEmail, hashed, role || null, JSON.stringify(skillsJson), JSON.stringify(langsJson)]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const result = await db.query(
      'SELECT id, name, email, role, skills, languages, bio, website, avatar_url, password_hash FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = result.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '30d' });
    delete user.password_hash;
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/social-login', async (req, res) => {
  const { provider, providerId, email, name, avatarUrl } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!provider || !providerId || !normalizedEmail || !name) {
    return res.status(400).json({ message: 'provider, providerId, email and name are required.' });
  }

  try {
    let user = null;
    const existingByProvider = await db.query(
      'SELECT id, name, email, provider, provider_id, avatar_url, role, skills, languages, bio, website FROM users WHERE provider = $1 AND provider_id = $2',
      [provider, providerId]
    );
    if (existingByProvider.rows.length > 0) {
      user = existingByProvider.rows[0];
    } else {
      const existingByEmail = await db.query(
        'SELECT id, name, email, provider, provider_id, avatar_url, role, skills, languages, bio, website FROM users WHERE email = $1',
        [normalizedEmail]
      );
      if (existingByEmail.rows.length > 0) {
        user = existingByEmail.rows[0];
        await db.query(
          'UPDATE users SET provider = $1, provider_id = $2, avatar_url = $3 WHERE id = $4',
          [provider, providerId, avatarUrl || user.avatar_url, user.id]
        );
      } else {
        const result = await db.query(
          `INSERT INTO users (name, email, password_hash, provider, provider_id, avatar_url)
           VALUES ($1, $2, NULL, $3, $4, $5)
           RETURNING id, name, email, provider, provider_id, avatar_url, role, skills, languages, bio, website`,
          [name, normalizedEmail, provider, providerId, avatarUrl || null]
        );
        user = result.rows[0];
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Social login failed.' });
  }
});

router.post('/oauth-callback', async (req, res) => {
  const { code, provider, redirectUri } = req.body;
  console.log('[oauth-callback] Received:', { provider, codeLen: code?.length, redirectUri });

  if (!code || !provider) {
    return res.status(400).json({ message: 'code and provider required' });
  }

  try {
    let accessToken;
    let profile;

    if (provider === 'google') {
      // Exchange code for access token via Google API
      console.log('[oauth-callback] Exchanging code for token...');
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID_WEB,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        }).toString()
      });

      console.log('[oauth-callback] Google token response status:', tokenResp.status);
      const tokenText = await tokenResp.text();
      console.log('[oauth-callback] Google token response:', tokenText.slice(0, 200));

      if (!tokenResp.ok) {
        console.error('[oauth-callback] Google token error:', tokenText);
        return res.status(400).json({ message: 'Failed to exchange code for token', error: tokenText });
      }

      const tokenData = JSON.parse(tokenText);
      accessToken = tokenData.access_token;
      console.log('[oauth-callback] Got access token:', accessToken.slice(0, 20) + '...');

      // Fetch Google profile
      const profileResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!profileResp.ok) {
        console.error('[oauth-callback] Google profile fetch failed:', profileResp.status);
        return res.status(400).json({ message: 'Failed to fetch Google profile' });
      }

      profile = await profileResp.json();
      console.log('[oauth-callback] Google profile fetched:', { email: profile.email, name: profile.name });

      // Prepare social login payload
      const payload = {
        provider: 'google',
        providerId: profile.sub || profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture
      };

      console.log('[oauth-callback] Calling performSocialLogin...');
      // Use existing social-login logic
      const result = await performSocialLogin(payload);
      console.log('[oauth-callback] Success, returning token + user');
      return res.json(result);

    } else {
      return res.status(400).json({ message: 'Unsupported provider: ' + provider });
    }

  } catch (error) {
    console.error('[oauth-callback] Error:', error);
    res.status(500).json({ message: 'OAuth callback failed', error: error.message });
  }
});

// Helper function to handle social login (reuse logic from /auth/social-login)
async function performSocialLogin(payload) {
  const { provider, providerId, email, name, avatarUrl } = payload;

  if (!email) {
    throw new Error('Email not provided by OAuth provider');
  }

  // Check if user exists
  const existingUser = await db.query(
    'SELECT id, role FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    // User exists - update provider ID if needed
    const user = existingUser.rows[0];
    await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl || null, user.id]
    );

    const token = jwt.sign(
      { id: user.id, email, role: user.role || null },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email,
        name,
        avatarUrl,
        provider,
        providerId,
        role: user.role || null,
        onboardingPending: !user.role
      }
    };
  }

  // Create new user
  const newUser = await db.query(
    'INSERT INTO users (email, password_hash, name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id',
    [email, null, name || email, avatarUrl || null]
  );

  const userId = newUser.rows[0].id;
  const token = jwt.sign(
    { id: userId, email, role: null },
    process.env.JWT_SECRET || 'dev-secret-change-in-production',
    { expiresIn: '7d' }
  );

  return {
    token,
    user: {
      id: userId,
      email,
      name,
      avatarUrl,
      provider,
      providerId,
      role: null,
      onboardingPending: true
    }
  };
}

module.exports = router;
