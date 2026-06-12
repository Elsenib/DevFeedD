const pool = require('./db');

(async () => {
  try {
    console.log('Applying schema fixes to job_applications...');
    await pool.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'APPLIED'`);
    await pool.query(`ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS resume_url TEXT`);
    console.log('Schema fix applied. Current columns:');
    const result = await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='job_applications' ORDER BY ordinal_position");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Schema fix failed:', error);
  } finally {
    await pool.end();
  }
})();
