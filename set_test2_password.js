const pool = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const hash = await bcrypt.hash('password', 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'test2@example.com']);
    console.log('Password updated for test2@example.com');
    const user = await pool.query('SELECT id, email FROM users WHERE email = $1', ['test2@example.com']);
    console.log(JSON.stringify(user.rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
})();
