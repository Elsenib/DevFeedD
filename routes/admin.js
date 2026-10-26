const express = require('express');
const path = require('path');
const db = require('../db');
const { auth, forgetBan } = require('../middleware/auth');

const router = express.Router();

// Admins are listed by email in ADMIN_EMAILS (comma separated) on Railway.
function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  return adminEmails().includes(String(email || '').toLowerCase());
}

function requireAdmin(req, res, next) {
  if (!isAdminEmail(req.user?.email)) {
    return res.status(403).json({ message: 'Bu bölmə yalnız adminlər üçündür.' });
  }
  next();
}

// The panel page itself is public; every API call below needs an admin token.
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

const api = express.Router();
api.use(auth, requireAdmin);

api.get('/me', (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, name: req.user.name });
});

api.get('/stats', async (req, res) => {
  try {
    const totals = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '7 days') AS users_7d,
        (SELECT COUNT(*)::int FROM users WHERE banned_at IS NOT NULL) AS banned,
        (SELECT COUNT(*)::int FROM posts) AS posts,
        (SELECT COUNT(*)::int FROM posts WHERE created_at > NOW() - INTERVAL '7 days') AS posts_7d,
        (SELECT COUNT(*)::int FROM comments) AS comments,
        (SELECT COUNT(*)::int FROM content_reports WHERE status = 'OPEN') AS open_reports
    `);
    const signups = await db.query(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day, COUNT(u.id)::int AS count
      FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN users u ON u.created_at::date = d::date
      GROUP BY d ORDER BY d
    `);
    res.json({ ...totals.rows[0], signups: signups.rows });
  } catch (error) {
    console.error('GET /admin/api/stats error:', error);
    res.status(500).json({ message: 'Statistika yüklənmədi.' });
  }
});

// A short description of the reported thing, so the admin can judge it
// without opening the app.
async function describeTarget(type, id) {
  const queries = {
    post: `SELECT p.id, COALESCE(NULLIF(p.caption, ''), p.title, p.body) AS text, p.post_type AS kind, p.metadata, u.id AS user_id, u.name AS user_name
           FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
    comment: `SELECT c.id, c.text, c.post_id, u.id AS user_id, u.name AS user_name
              FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
    user: `SELECT u.id, u.bio AS text, u.id AS user_id, u.name AS user_name, u.email, u.banned_at FROM users u WHERE u.id = $1`,
    message: `SELECT m.id, m.text, u.id AS user_id, u.name AS user_name
              FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
    chat_message: `SELECT m.id, m.text, r.name AS room, u.id AS user_id, u.name AS user_name
                   FROM chat_messages m JOIN users u ON u.id = m.user_id JOIN chat_rooms r ON r.id = m.room_id WHERE m.id = $1`,
  };
  if (!queries[type]) return null;
  const result = await db.query(queries[type], [id]);
  return result.rows[0] || null;
}

const DELETE_TARGET = {
  post: 'DELETE FROM posts WHERE id = $1',
  comment: 'DELETE FROM comments WHERE id = $1',
  message: 'DELETE FROM messages WHERE id = $1',
  chat_message: 'DELETE FROM chat_messages WHERE id = $1',
};

api.get('/reports', async (req, res) => {
  const status = req.query.status === 'closed' ? 'closed' : 'open';
  try {
    const result = await db.query(
      `SELECT r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.resolution, r.created_at, r.resolved_at,
              rep.id AS reporter_id, rep.name AS reporter_name,
              (SELECT COUNT(*)::int FROM content_reports x WHERE x.target_type = r.target_type AND x.target_id = r.target_id) AS report_count
       FROM content_reports r
       LEFT JOIN users rep ON rep.id = r.reporter_id
       WHERE ${status === 'open' ? "r.status = 'OPEN'" : "r.status <> 'OPEN'"}
       ORDER BY r.created_at DESC
       LIMIT 100`
    );
    const rows = await Promise.all(result.rows.map(async (row) => ({ ...row, target: await describeTarget(row.target_type, row.target_id) })));
    res.json(rows);
  } catch (error) {
    console.error('GET /admin/api/reports error:', error);
    res.status(500).json({ message: 'Şikayətlər yüklənmədi.' });
  }
});

async function setBan(userId, banned) {
  await db.query(`UPDATE users SET banned_at = ${banned ? 'NOW()' : 'NULL'} WHERE id = $1`, [userId]);
  forgetBan(Number(userId));
}

// POST /admin/api/reports/:id/resolve { action: 'dismiss' | 'delete' | 'ban' }
// Closes every open report on the same target, not just this one.
api.post('/reports/:id/resolve', async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const action = String(req.body.action || '');
  if (!['dismiss', 'delete', 'ban'].includes(action)) {
    return res.status(400).json({ message: 'Əməliyyat düzgün deyil.' });
  }
  try {
    const found = await db.query('SELECT target_type, target_id FROM content_reports WHERE id = $1', [reportId]);
    const report = found.rows[0];
    if (!report) return res.status(404).json({ message: 'Şikayət tapılmadı.' });
    const target = await describeTarget(report.target_type, report.target_id);

    if (action === 'delete' && DELETE_TARGET[report.target_type]) {
      await db.query(DELETE_TARGET[report.target_type], [report.target_id]);
    }
    if (action === 'ban') {
      const userId = target?.user_id;
      if (!userId) return res.status(404).json({ message: 'Məzmunun sahibi tapılmadı.' });
      const owner = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (isAdminEmail(owner.rows[0]?.email)) return res.status(400).json({ message: 'Admin bloklana bilməz.' });
      await setBan(userId, true);
      if (DELETE_TARGET[report.target_type]) await db.query(DELETE_TARGET[report.target_type], [report.target_id]);
    }

    await db.query(
      `UPDATE content_reports SET status = $3, resolution = $4, resolved_at = NOW(), resolved_by = $5
       WHERE target_type = $1 AND target_id = $2 AND status = 'OPEN'`,
      [report.target_type, report.target_id, action === 'dismiss' ? 'DISMISSED' : 'RESOLVED', action, req.user.id]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('POST /admin/api/reports/:id/resolve error:', error);
    res.status(500).json({ message: 'Əməliyyat alınmadı.' });
  }
});

api.get('/users', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.role_sub, u.avatar_url, u.created_at, u.banned_at, u.provider,
              (SELECT COUNT(*)::int FROM posts p WHERE p.user_id = u.id) AS posts,
              (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS followers
       FROM users u
       WHERE $1 = '' OR u.name ILIKE $2 OR u.email ILIKE $2
       ORDER BY u.created_at DESC
       LIMIT 100`,
      [q, `%${q}%`]
    );
    res.json(result.rows.map((row) => ({ ...row, is_admin: isAdminEmail(row.email) })));
  } catch (error) {
    console.error('GET /admin/api/users error:', error);
    res.status(500).json({ message: 'İstifadəçilər yüklənmədi.' });
  }
});

api.post('/users/:id/ban', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const banned = req.body.banned !== false;
  try {
    const found = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (!found.rows[0]) return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    if (banned && isAdminEmail(found.rows[0].email)) return res.status(400).json({ message: 'Admin bloklana bilməz.' });
    await setBan(userId, banned);
    res.json({ ok: true, banned });
  } catch (error) {
    console.error('POST /admin/api/users/:id/ban error:', error);
    res.status(500).json({ message: 'Əməliyyat alınmadı.' });
  }
});

api.get('/posts', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  try {
    const result = await db.query(
      `SELECT p.id, p.post_type, COALESCE(NULLIF(p.caption, ''), p.title, p.body) AS text, p.metadata, p.created_at,
              u.id AS user_id, u.name AS user_name,
              (SELECT COUNT(*)::int FROM post_likes l WHERE l.post_id = p.id) AS likes,
              (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comments
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE $1 = '' OR p.caption ILIKE $2 OR p.body ILIKE $2 OR u.name ILIKE $2
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [q, `%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /admin/api/posts error:', error);
    res.status(500).json({ message: 'Paylaşımlar yüklənmədi.' });
  }
});

api.delete('/posts/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM posts WHERE id = $1', [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /admin/api/posts/:id error:', error);
    res.status(500).json({ message: 'Paylaşım silinmədi.' });
  }
});

router.use('/api', api);

module.exports = router;
