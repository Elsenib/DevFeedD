const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../services/notifications');
const { notBlockedSql, isBlockedBetween } = require('../services/moderation');

const router = express.Router();

function normalizeSearch(value) {
  return String(value || '').trim().slice(0, 80);
}

router.get('/search', auth, async (req, res) => {
  const q = normalizeSearch(req.query.q);
  const pattern = `%${q}%`;

  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.bio, u.role, u.role_sub, u.avatar_url,
              COUNT(DISTINCT followers.follower_id)::int AS followers_count,
              COUNT(DISTINCT following.following_id)::int AS following_count,
              EXISTS (
                SELECT 1 FROM follows f
                WHERE f.follower_id = $1 AND f.following_id = u.id
              ) AS following_by_me
       FROM users u
       LEFT JOIN follows followers ON followers.following_id = u.id
       LEFT JOIN follows following ON following.follower_id = u.id
       WHERE u.id <> $1
         AND ${notBlockedSql('$1', 'u.id')}
         AND ($2 = '' OR u.name ILIKE $3 OR u.email ILIKE $3 OR COALESCE(u.role, '') ILIKE $3 OR COALESCE(u.role_sub, '') ILIKE $3)
       GROUP BY u.id
       ORDER BY followers_count DESC, u.created_at DESC
       LIMIT 30`,
      [req.user.id, q, pattern]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET /users/search error:', error);
    res.status(500).json({ message: 'İstifadəçilər axtarılmadı.' });
  }
});

router.post('/:id/follow', auth, async (req, res) => {
  const followingId = parseInt(req.params.id, 10);
  if (!followingId || followingId === req.user.id) {
    return res.status(400).json({ message: 'Bu profili izləmək mümkün deyil.' });
  }

  try {
    const userResult = await db.query('SELECT id, name FROM users WHERE id = $1', [followingId]);
    const target = userResult.rows[0];
    if (!target) {
      return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    }
    if (await isBlockedBetween(req.user.id, followingId)) {
      return res.status(403).json({ message: 'Bu profili izləmək mümkün deyil.' });
    }

    const insert = await db.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING id`,
      [req.user.id, followingId]
    );

    if (insert.rows.length > 0) {
      await createNotification({
        userId: followingId,
        actorId: req.user.id,
        type: 'follow',
        entityType: 'user',
        entityId: req.user.id,
        text: `${req.user.name || 'Bir istifadəçi'} səni izləməyə başladı.`,
      });
    }

    const counts = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers_count,
         (SELECT COUNT(*)::int FROM follows WHERE follower_id = $1) AS following_count`,
      [followingId]
    );

    res.json({
      following: true,
      followers_count: counts.rows[0].followers_count,
      following_count: counts.rows[0].following_count,
    });
  } catch (error) {
    console.error('POST /users/:id/follow error:', error);
    res.status(500).json({ message: 'İzləmə əməliyyatı alınmadı.' });
  }
});

router.delete('/:id/follow', auth, async (req, res) => {
  const followingId = parseInt(req.params.id, 10);
  if (!followingId || followingId === req.user.id) {
    return res.status(400).json({ message: 'Bu profili izləmədən çıxarmaq mümkün deyil.' });
  }

  try {
    await db.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, followingId]);

    const counts = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers_count,
         (SELECT COUNT(*)::int FROM follows WHERE follower_id = $1) AS following_count`,
      [followingId]
    );

    res.json({
      following: false,
      followers_count: counts.rows[0].followers_count,
      following_count: counts.rows[0].following_count,
    });
  } catch (error) {
    console.error('DELETE /users/:id/follow error:', error);
    res.status(500).json({ message: 'İzləmədən çıxarma alınmadı.' });
  }
});

router.get('/blocked', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.avatar_url, ub.created_at AS blocked_at
       FROM user_blocks ub
       JOIN users u ON u.id = ub.blocked_id
       WHERE ub.blocker_id = $1
       ORDER BY ub.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /users/blocked error:', error);
    res.status(500).json({ message: 'Bloklanmış istifadəçilər yüklənmədi.' });
  }
});

router.post('/:id/block', auth, async (req, res) => {
  const blockedId = parseInt(req.params.id, 10);
  if (!blockedId || blockedId === req.user.id) {
    return res.status(400).json({ message: 'Bu istifadəçini bloklamaq mümkün deyil.' });
  }

  try {
    const userResult = await db.query('SELECT id FROM users WHERE id = $1', [blockedId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    }

    await db.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, blockedId]
    );
    await db.query(
      `DELETE FROM follows
       WHERE (follower_id = $1 AND following_id = $2)
          OR (follower_id = $2 AND following_id = $1)`,
      [req.user.id, blockedId]
    );

    res.json({ blocked: true });
  } catch (error) {
    console.error('POST /users/:id/block error:', error);
    res.status(500).json({ message: 'Bloklama alınmadı.' });
  }
});

router.delete('/:id/block', auth, async (req, res) => {
  const blockedId = parseInt(req.params.id, 10);
  if (!blockedId) {
    return res.status(400).json({ message: 'İstifadəçi düzgün deyil.' });
  }

  try {
    await db.query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.user.id, blockedId]);
    res.json({ blocked: false });
  } catch (error) {
    console.error('DELETE /users/:id/block error:', error);
    res.status(500).json({ message: 'Blokdan çıxarma alınmadı.' });
  }
});

module.exports = router;
