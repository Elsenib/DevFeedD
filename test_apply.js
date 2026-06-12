const fetch = require('node:fetch');

const BASE = 'http://localhost:4000';
const email = 'test2@example.com';
const password = 'password';

(async () => {
  try {
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();
    console.log('LOGIN STATUS', loginRes.status, loginData);
    if (!loginRes.ok) return;

    const token = loginData.token;
    const applyRes = await fetch(`${BASE}/posts/4/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cover_letter: 'Test application from automation', resume_url: 'https://example.com/test2-cv.pdf' }),
    });
    console.log('APPLY STATUS', applyRes.status, await applyRes.json());

    const statusRes = await fetch(`${BASE}/posts/4/application-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('STATUS CHECK', statusRes.status, await statusRes.json());
  } catch (error) {
    console.error('TEST ERROR', error);
  }
})();
