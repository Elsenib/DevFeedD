const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dns = require('dns').promises;
const crypto = require('crypto');
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

function verificationRequired() {
  return process.env.EMAIL_VERIFICATION_REQUIRED !== 'false';
}

function makeVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function makeToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '30d' });
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function getBackendBaseUrl(req) {
  return (process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

function appendQuery(url, params) {
  const nextUrl = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) nextUrl.searchParams.set(key, String(value));
  });
  return nextUrl.toString();
}

function getOAuthConfig(provider, req) {
  const normalizedProvider = String(provider || '').toLowerCase();
  const backendBaseUrl = getBackendBaseUrl(req);
  const redirectUri = `${backendBaseUrl}/auth/oauth/callback/${normalizedProvider}`;

  if (normalizedProvider === 'google') {
    return {
      provider: 'google',
      clientId: firstEnv('GOOGLE_CLIENT_ID_WEB', 'GOOGLE_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
      clientSecret: firstEnv('GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET_WEB'),
      redirectUri,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    };
  }

  if (normalizedProvider === 'github') {
    return {
      provider: 'github',
      clientId: firstEnv('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_ID_WEB', 'GIT_CLIENT_ID'),
      clientSecret: firstEnv('GITHUB_CLIENT_SECRET', 'GITHUB_CLIENT_SECRET_WEB', 'GIT_CLIENT_SECRET'),
      redirectUri,
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'read:user user:email',
    };
  }

  return null;
}

async function sendVerificationEmail(email, code) {
  const appName = process.env.APP_NAME || 'DevFeed';
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'DevFeed <onboarding@resend.dev>';

  if (resendKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `${appName} təsdiq kodu`,
        html: `<p>DevFeed qeydiyyat kodun:</p><h2>${code}</h2><p>Bu kod 15 dəqiqə etibarlıdır.</p>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Email göndərilmədi: ${body.slice(0, 160)}`);
    }

    return { sent: true };
  }

  if (process.env.NODE_ENV !== 'production' || process.env.EMAIL_VERIFICATION_DEV_MODE === 'true') {
    console.log(`[email-verification] ${email} code: ${code}`);
    return { sent: false, devCode: code };
  }

  throw new Error('Email təsdiqləmə servisi qoşulmayıb. Railway Variables bölməsinə RESEND_API_KEY və EMAIL_FROM əlavə et.');
}

async function exchangeOAuthCode(config, code) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    data = Object.fromEntries(new URLSearchParams(text));
  }

  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || text.slice(0, 160) || 'OAuth token exchange failed');
  }

  return data.access_token;
}

async function fetchOAuthProfile(provider, accessToken) {
  if (provider === 'google') {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Google profili oxunmadı.');
    const profile = await response.json();
    return {
      provider: 'google',
      providerId: profile.sub || profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      avatarUrl: profile.picture || null,
    };
  }

  if (provider === 'github') {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DevFeed',
    };
    const profileResponse = await fetch('https://api.github.com/user', { headers });
    if (!profileResponse.ok) throw new Error('GitHub profili oxunmadı.');
    const profile = await profileResponse.json();

    let email = profile.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', { headers });
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primary = Array.isArray(emails)
          ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified)
          : null;
        email = primary?.email;
      }
    }

    if (!email) {
      throw new Error('GitHub hesabında təsdiqlənmiş email tapılmadı.');
    }

    return {
      provider: 'github',
      providerId: String(profile.id),
      email,
      name: profile.name || profile.login || email,
      avatarUrl: profile.avatar_url || null,
    };
  }

  throw new Error('Unsupported provider');
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

    if (verificationRequired()) {
      const code = makeVerificationCode();
      const codeHash = await bcrypt.hash(code, 10);
      await db.query(
        `INSERT INTO email_verification_codes (email, name, password_hash, role, skills, languages, code_hash, attempts, expires_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, 0, NOW() + INTERVAL '15 minutes')
         ON CONFLICT (email)
         DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           skills = EXCLUDED.skills,
           languages = EXCLUDED.languages,
           code_hash = EXCLUDED.code_hash,
           attempts = 0,
           expires_at = EXCLUDED.expires_at,
           created_at = NOW()`,
        [normalizedEmail, trimmedName, hashed, role || null, JSON.stringify(skillsJson), JSON.stringify(langsJson), codeHash]
      );

      const delivery = await sendVerificationEmail(normalizedEmail, code);
      return res.json({
        verificationRequired: true,
        email: normalizedEmail,
        message: 'Təsdiq kodu email ünvanına göndərildi.',
        devCode: delivery.devCode,
      });
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, skills, languages, email_verified)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, true)
       RETURNING id, name, email, role, skills, languages, email_verified`,
      [trimmedName, normalizedEmail, hashed, role || null, JSON.stringify(skillsJson), JSON.stringify(langsJson)]
    );

    const user = result.rows[0];
    const token = makeToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
});

router.post('/verify-email', async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();

  if (!normalizedEmail || !code) {
    return res.status(400).json({ message: 'Email və təsdiq kodu lazımdır.' });
  }

  try {
    const pendingResult = await db.query('SELECT * FROM email_verification_codes WHERE email = $1', [normalizedEmail]);
    const pending = pendingResult.rows[0];
    if (!pending) {
      return res.status(404).json({ message: 'Təsdiq kodu tapılmadı. Yenidən qeydiyyatdan keç.' });
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await db.query('DELETE FROM email_verification_codes WHERE email = $1', [normalizedEmail]);
      return res.status(400).json({ message: 'Təsdiq kodunun vaxtı bitib. Yenidən qeydiyyatdan keç.' });
    }
    if (Number(pending.attempts || 0) >= 5) {
      return res.status(429).json({ message: 'Çox cəhd edildi. Yeni kod istə.' });
    }

    const validCode = await bcrypt.compare(code, pending.code_hash);
    if (!validCode) {
      await db.query('UPDATE email_verification_codes SET attempts = attempts + 1 WHERE email = $1', [normalizedEmail]);
      return res.status(400).json({ message: 'Təsdiq kodu yanlışdır.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM email_verification_codes WHERE email = $1', [normalizedEmail]);
      return res.status(400).json({ message: 'Bu email artıq qeydiyyatdan keçib.' });
    }

    const skillsJson = Array.isArray(pending.skills) ? pending.skills : [];
    const langsJson = Array.isArray(pending.languages) ? pending.languages : [];
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role, skills, languages, email_verified)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, true)
       RETURNING id, name, email, role, skills, languages, email_verified`,
      [pending.name, normalizedEmail, pending.password_hash, pending.role || null, JSON.stringify(skillsJson), JSON.stringify(langsJson)]
    );
    await db.query('DELETE FROM email_verification_codes WHERE email = $1', [normalizedEmail]);

    const user = result.rows[0];
    const token = makeToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error('POST /auth/verify-email error:', error);
    res.status(500).json({ message: error.message || 'Email təsdiqlənmədi.' });
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
      'SELECT id, name, email, role, role_sub, skills, languages, bio, website, avatar_url, activity_visible, email_verified, password_hash FROM users WHERE email = $1',
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

    const token = makeToken(user);
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
    const result = await performOAuthLogin({ provider, providerId, email: normalizedEmail, name, avatarUrl });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Social login failed.' });
  }
});

router.get('/oauth/start/:provider', async (req, res) => {
  const config = getOAuthConfig(req.params.provider, req);
  const appRedirectUri = String(req.query.redirectUri || '').trim();

  if (!config) {
    return res.status(400).json({ message: 'Provider dəstəklənmir.' });
  }
  if (!config.clientId || !config.clientSecret) {
    return res.status(500).json({ message: `${config.provider} OAuth üçün client id/secret Railway Variables-da yoxdur.` });
  }
  if (!appRedirectUri) {
    return res.status(400).json({ message: 'redirectUri lazımdır.' });
  }

  try {
    const state = randomToken(24);
    await db.query('DELETE FROM oauth_states WHERE expires_at < NOW()');
    await db.query(
      `INSERT INTO oauth_states (state, provider, app_redirect_uri, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [state, config.provider, appRedirectUri]
    );

    const params = {
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
    };
    if (config.provider === 'google') {
      params.prompt = 'select_account';
      params.access_type = 'offline';
    }

    res.json({
      provider: config.provider,
      authUrl: appendQuery(config.authUrl, params),
      callbackUrl: config.redirectUri,
    });
  } catch (error) {
    console.error('GET /auth/oauth/start/:provider error:', error);
    res.status(500).json({ message: 'OAuth başlanmadı.' });
  }
});

router.get('/oauth/callback/:provider', async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const state = String(req.query.state || '');
  const code = String(req.query.code || '');
  const providerError = req.query.error || req.query.error_description;

  let oauthState;
  try {
    const stateResult = await db.query(
      'SELECT state, provider, app_redirect_uri FROM oauth_states WHERE state = $1 AND provider = $2 AND expires_at > NOW()',
      [state, provider]
    );
    oauthState = stateResult.rows[0];
  } catch (error) {
    console.error('OAuth state lookup error:', error);
  }

  const redirectError = (message) => {
    if (oauthState?.app_redirect_uri) {
      return res.redirect(appendQuery(oauthState.app_redirect_uri, { error: message }));
    }
    return res.status(400).send(message);
  };

  if (!oauthState) {
    return redirectError('OAuth sessiyası tapılmadı və ya vaxtı bitib.');
  }
  if (providerError) {
    await db.query('DELETE FROM oauth_states WHERE state = $1', [state]).catch(() => {});
    return redirectError(String(providerError));
  }
  if (!code) {
    return redirectError('OAuth code gəlmədi.');
  }

  try {
    const config = getOAuthConfig(provider, req);
    if (!config || !config.clientId || !config.clientSecret) {
      return redirectError(`${provider} OAuth konfiqurasiyası tamamlanmayıb.`);
    }

    const accessToken = await exchangeOAuthCode(config, code);
    const profile = await fetchOAuthProfile(provider, accessToken);
    const loginResult = await performOAuthLogin(profile);
    const sessionId = randomToken(32);

    await db.query(
      `INSERT INTO oauth_login_sessions (id, token, user_payload, expires_at)
       VALUES ($1, $2, $3::jsonb, NOW() + INTERVAL '5 minutes')`,
      [sessionId, loginResult.token, JSON.stringify(loginResult.user)]
    );
    await db.query('DELETE FROM oauth_states WHERE state = $1', [state]);

    res.redirect(appendQuery(oauthState.app_redirect_uri, { sessionId }));
  } catch (error) {
    console.error('GET /auth/oauth/callback/:provider error:', error);
    await db.query('DELETE FROM oauth_states WHERE state = $1', [state]).catch(() => {});
    return redirectError(error.message || 'OAuth tamamlanmadı.');
  }
});

router.post('/oauth/complete', async (req, res) => {
  const sessionId = String(req.body.sessionId || '').trim();
  if (!sessionId) {
    return res.status(400).json({ message: 'sessionId lazımdır.' });
  }

  try {
    await db.query('DELETE FROM oauth_login_sessions WHERE expires_at < NOW()');
    const result = await db.query(
      `DELETE FROM oauth_login_sessions
       WHERE id = $1 AND expires_at > NOW()
       RETURNING token, user_payload`,
      [sessionId]
    );
    const session = result.rows[0];
    if (!session) {
      return res.status(404).json({ message: 'OAuth sessiyası tapılmadı və ya vaxtı bitib.' });
    }
    res.json({ token: session.token, user: session.user_payload });
  } catch (error) {
    console.error('POST /auth/oauth/complete error:', error);
    res.status(500).json({ message: 'OAuth sessiyası tamamlanmadı.' });
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
          client_id: firstEnv('GOOGLE_CLIENT_ID_WEB', 'GOOGLE_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
          client_secret: firstEnv('GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET_WEB'),
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

      console.log('[oauth-callback] Calling performOAuthLogin...');
      // Use existing social-login logic
      const result = await performOAuthLogin(payload);
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

async function performOAuthLogin(payload) {
  const { provider, providerId, email, name, avatarUrl } = payload;
  const normalizedEmail = normalizeEmail(email);
  const normalizedProvider = String(provider || '').toLowerCase();
  const normalizedProviderId = String(providerId || '').trim();
  const displayName = String(name || normalizedEmail).trim();

  if (!normalizedProvider || !normalizedProviderId || !normalizedEmail || !displayName) {
    throw new Error('OAuth profile melumatlari tamam deyil.');
  }

  const fields = `
    id, name, email, provider, provider_id, avatar_url, role, role_sub,
    skills, languages, bio, website, activity_visible, email_verified
  `;

  const attachAliases = (user) => ({
    ...user,
    providerId: user.provider_id,
    avatarUrl: user.avatar_url,
    onboardingPending: !user.role,
  });

  const existingByProvider = await db.query(
    `SELECT ${fields}
     FROM users
     WHERE provider = $1 AND provider_id = $2`,
    [normalizedProvider, normalizedProviderId]
  );

  let user = existingByProvider.rows[0];

  if (!user) {
    const existingByEmail = await db.query(
      `SELECT ${fields}
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );
    user = existingByEmail.rows[0];
  }

  if (user) {
    const updated = await db.query(
      `UPDATE users
       SET provider = $1,
           provider_id = $2,
           avatar_url = COALESCE($3, avatar_url),
           email_verified = true
       WHERE id = $4
       RETURNING ${fields}`,
      [normalizedProvider, normalizedProviderId, avatarUrl || null, user.id]
    );
    user = updated.rows[0];

    return { token: makeToken(user), user: attachAliases(user) };
  }

  const newUser = await db.query(
    `INSERT INTO users (email, password_hash, name, provider, provider_id, avatar_url, email_verified)
     VALUES ($1, NULL, $2, $3, $4, $5, true)
     RETURNING ${fields}`,
    [normalizedEmail, displayName, normalizedProvider, normalizedProviderId, avatarUrl || null]
  );

  user = newUser.rows[0];
  return { token: makeToken(user), user: attachAliases(user) };
}

module.exports = router;
