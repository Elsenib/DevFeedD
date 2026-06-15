const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.id, n.type, n.entity_type, n.entity_id, n.text, n.read_at, n.created_at,
              u.id AS actor_id, u.name AS actor_name, u.avatar_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 80`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET /notifications error:', error);
    res.status(500).json({ message: 'Bildirişlər yüklənmədi.' });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [req.user.id]);
    res.json({ message: 'Bildirişlər oxundu.' });
  } catch (error) {
    console.error('PATCH /notifications/read-all error:', error);
    res.status(500).json({ message: 'Bildirişlər yenilənmədi.' });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2
       RETURNING id, read_at`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bildiriş tapılmadı.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('PATCH /notifications/:id/read error:', error);
    res.status(500).json({ message: 'Bildiriş yenilənmədi.' });
  }
});

module.exports = router;
