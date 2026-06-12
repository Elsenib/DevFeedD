const pool = require('./db');

(async () => {
  try {
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('job_applications','conversations','messages','users','posts') ORDER BY tablename");
    console.log('TABLES', tables.rows.map((r) => r.tablename).join(', '));

    const job = await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='job_applications' ORDER BY ordinal_position");
    console.log('JOB_COLUMNS', JSON.stringify(job.rows, null, 2));

    const conv = await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='conversations' ORDER BY ordinal_position");
    console.log('CONV_COLUMNS', JSON.stringify(conv.rows, null, 2));

    const msg = await pool.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='messages' ORDER BY ordinal_position");
    console.log('MSG_COLUMNS', JSON.stringify(msg.rows, null, 2));

    const posts = await pool.query("SELECT id, title, post_type, user_id FROM posts ORDER BY id DESC LIMIT 5");
    console.log('RECENT JOB POSTS', JSON.stringify(posts.rows, null, 2));

    const users = await pool.query("SELECT id, name, email FROM users ORDER BY id DESC LIMIT 10");
    console.log('USERS', JSON.stringify(users.rows, null, 2));
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await pool.end();
  }
})();
