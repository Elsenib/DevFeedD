const pool = require('./db');

(async () => {
  try {
    const current = await pool.query('SELECT current_database() AS db, current_schema() AS schema, inet_server_addr() AS server_addr, inet_server_port() AS server_port');
    console.log('CURRENT', JSON.stringify(current.rows, null, 2));
    const cols = await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='job_applications' ORDER BY ordinal_position");
    console.log('JOB_COLUMNS', JSON.stringify(cols.rows, null, 2));
    const sample = await pool.query("SELECT id, post_id, user_id, cover_letter, resume_url, status FROM job_applications LIMIT 1");
    console.log('SAMPLE', JSON.stringify(sample.rows, null, 2));
  } catch (error) {
    console.error('ERROR', error);
  } finally {
    await pool.end();
  }
})();
