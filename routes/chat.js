const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { containsIllegalWords, checkBadWords } = require('../middleware/contentFilter');

const router = express.Router();

function invalidText(value) {
  return containsIllegalWords(value || '') || checkBadWords(value || '');
}

router.get('/rooms', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.name, r.description, r.created_by, r.is_public, r.created_at,
              COUNT(DISTINCT rm.user_id)::int AS member_count,
              (
                SELECT cm.text
                FROM chat_messages cm
                WHERE cm.room_id = r.id
                ORDER BY cm.created_at DESC
                LIMIT 1
              ) AS last_message,
              EXISTS (
                SELECT 1
                FROM room_members my_rm
                WHERE my_rm.room_id = r.id AND my_rm.user_id = $1
              ) AS joined
       FROM chat_rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.id
       WHERE r.is_public = true
       GROUP BY r.id
       ORDER BY r.created_at ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /chat/rooms error:', error);
    res.status(500).json({ message: 'Could not load chat rooms' });
  }
});

router.post('/rooms', auth, async (req, res) => {
  const { name, description = '' } = req.body;
  const cleanName = String(name || '').trim();
  const cleanDescription = String(description || '').trim();

  if (!cleanName) {
    return res.status(400).json({ message: 'Room name is required' });
  }
  if (invalidText(cleanName) || invalidText(cleanDescription)) {
    return res.status(400).json({ message: 'Otaq melumati qaydalara uygun deyil.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO chat_rooms (name, description, created_by, is_public)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, description, created_by, is_public, created_at`,
      [cleanName, cleanDescription, req.user.id]
    );

    await db.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json({ ...result.rows[0], member_count: 1, joined: true, last_message: null });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Bu adda chat otaqi var.' });
    }
    console.error('POST /chat/rooms error:', error);
    res.status(500).json({ message: 'Could not create chat room' });
  }
});

router.post('/rooms/:id/join', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await db.query('SELECT id FROM chat_rooms WHERE id = $1 AND is_public = true', [id]);
    if (room.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await db.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [id, req.user.id]
    );
    res.json({ message: 'Joined' });
  } catch (error) {
    console.error('POST /chat/rooms/:id/join error:', error);
    res.status(500).json({ message: 'Could not join room' });
  }
});

router.post('/rooms/:id/leave', auth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ message: 'Left' });
  } catch (error) {
    console.error('POST /chat/rooms/:id/leave error:', error);
    res.status(500).json({ message: 'Could not leave room' });
  }
});

router.get('/rooms/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 80 } = req.query;
    const room = await db.query('SELECT id FROM chat_rooms WHERE id = $1 AND is_public = true', [id]);
    if (room.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const result = await db.query(
      `SELECT cm.id, cm.room_id, cm.user_id, cm.text, cm.created_at,
              u.name, u.role, u.role_sub, u.avatar_url
       FROM chat_messages cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.room_id = $1
       ORDER BY cm.created_at DESC
       LIMIT $2`,
      [id, Number(limit)]
    );

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('GET /chat/rooms/:id/messages error:', error);
    res.status(500).json({ message: 'Could not load room messages' });
  }
});

router.post('/rooms/:id/messages', auth, async (req, res) => {
  const { id } = req.params;
  const text = String(req.body.text || '').trim();

  if (!text) {
    return res.status(400).json({ message: 'Message text is required' });
  }
  if (invalidText(text)) {
    return res.status(400).json({ message: 'Mesaj qaydalara uygun deyil.' });
  }

  try {
    const room = await db.query('SELECT id FROM chat_rooms WHERE id = $1 AND is_public = true', [id]);
    if (room.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await db.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING`,
      [id, req.user.id]
    );

    const result = await db.query(
      `INSERT INTO chat_messages (room_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, user_id, text, created_at`,
      [id, req.user.id, text]
    );

    res.status(201).json({
      ...result.rows[0],
      name: req.user.name,
      role: req.user.role,
      role_sub: req.user.role_sub,
    });
  } catch (error) {
    console.error('POST /chat/rooms/:id/messages error:', error);
    res.status(500).json({ message: 'Could not send room message' });
  }
});

module.exports = router;
