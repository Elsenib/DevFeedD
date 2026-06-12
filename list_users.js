const pool = require('./db');

(async () => {
  try {
    const result = await pool.query('SELECT id, name, email, role, avatar_url FROM users ORDER BY id ASC');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
})();
