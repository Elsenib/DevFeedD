const http = require('http');
const https = require('https');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  try {
    const loginRes = await request({
      protocol: 'http:',
      hostname: 'localhost',
      port: 4000,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, JSON.stringify({ email: 'test2@example.com', password: 'password' }));
    console.log('LOGIN', loginRes.statusCode, loginRes.body);
    const loginBody = JSON.parse(loginRes.body);
    const token = loginBody.token;
    if (!token) return;

    const applyRes = await request({
      protocol: 'http:',
      hostname: 'localhost',
      port: 4000,
      path: '/posts/4/apply',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, JSON.stringify({ cover_letter: 'Test application from automation', resume_url: 'https://example.com/test2-cv.pdf' }));
    console.log('APPLY', applyRes.statusCode, applyRes.body);

    const statusRes = await request({
      protocol: 'http:',
      hostname: 'localhost',
      port: 4000,
      path: '/posts/4/application-status',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('STATUS', statusRes.statusCode, statusRes.body);
  } catch (error) {
    console.error(error);
  }
})();
