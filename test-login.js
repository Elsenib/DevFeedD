const http = require('http');

const data = JSON.stringify({
  email: 'test@example.com',
  password: 'test123'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('\n✅ Login Response:');
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (e) => console.error('❌ Error:', e.message));
req.write(data);
req.end();
