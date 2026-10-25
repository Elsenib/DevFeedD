const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const TARGET_TABLES = {
  post: 'posts',
  comment: 'comments',
  user: 'users',
  message: 'messages',
  chat_message: 'chat_messages',
};

const REASONS = ['spam', 'harassment', 'hate', 'sexual', 'violence', 'scam', 'other'];

// POST /reports { targetType, targetId, reason, details }
router.post('/', auth, async (req, res) => {
  const targetType = String(req.body.targetType || '').trim();
  const targetId = parseInt(req.body.targetId, 10);
  const reason = String(req.body.reason || 'other').trim();
  const details = String(req.body.details || '').trim().slice(0, 1000);

  const table = TARGET_TABLES[targetType];
  if (!table || !targetId) {
    return res.status(400).json({ message: 'Şikayət hədəfi düzgün deyil.' });
  }
  if (!REASONS.includes(reason)) {
    return res.status(400).json({ message: 'Şikayət səbəbi düzgün deyil.' });
  }

  try {
    const target = await db.query(`SELECT id FROM ${table} WHERE id = $1`, [targetId]);
    if (target.rows.length === 0) {
      return res.status(404).json({ message: 'Şikayət edilən məzmun tapılmadı.' });
    }

    const result = await db.query(
      `INSERT INTO content_reports (reporter_id, target_type, target_id, reason, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [req.user.id, targetType, targetId, reason, details || null]
    );

    res.status(201).json({ message: 'Şikayətiniz qəbul edildi. Komandamız tezliklə baxacaq.', report: result.rows[0] });
  } catch (error) {
    console.error('POST /reports error:', error);
    res.status(500).json({ message: 'Şikayət göndərilmədi.' });
  }
});

module.exports = router;
