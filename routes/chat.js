const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { containsIllegalWords, checkBadWords } = require('../middleware/contentFilter');
const { createNotification } = require('../services/notifications');

const router = express.Router();

function invalidText(value) {
  return containsIllegalWords(value || '') || checkBadWords(value || '');
}

function extractMentionTokens(text) {
  const matches = String(text || '').match(/@([a-zA-Z0-9_.-]{2,40})/g) || [];
  return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
}

async function requireRoomAccess(roomId, userId) {
  const result = await db.query(
    `SELECT r.id, r.name, r.created_by,
            EXISTS (
              SELECT 1 FROM room_members rm
              WHERE rm.room_id = r.id AND rm.user_id = $2
            ) AS joined
     FROM chat_rooms r
     WHERE r.id = $1 AND r.is_public = true`,
    [roomId, userId]
  );
  const room = result.rows[0];
  if (!room) return null;
  if (!room.joined && String(room.created_by || '') !== String(userId)) return null;
  return room;
}

async function notifyRoomMentions({ roomId, roomName, text, actorId, actorName }) {
  const tokens = extractMentionTokens(text);
  if (tokens.length === 0) return;

  const result = await db.query(
    `SELECT u.id, u.name
     FROM room_members rm
     JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1
       AND (
         LOWER(REPLACE(u.name, ' ', '')) = ANY($2)
         OR LOWER(split_part(u.email, '@', 1)) = ANY($2)
       )
     LIMIT 20`,
    [roomId, tokens]
  );

  await Promise.all(result.rows.map((mentioned) =>
    createNotification({
      userId: mentioned.id,
      actorId,
      type: 'chat_mention',
      entityType: 'chat_room',
      entityId: roomId,
      text: `${actorName || 'Bir istifadəçi'} səni ${roomName || 'chat'} otağında tag etdi.`,
    })
  ));
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
      `INSERT INTO room_members (room_id, user_id, role)
       VALUES ($1, $2, 'owner')
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

router.get('/rooms/:id/members', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await requireRoomAccess(id, req.user.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.role_sub, u.avatar_url,
              rm.role AS room_role, rm.invited_by, rm.joined_at
       FROM room_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = $1
       ORDER BY rm.joined_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /chat/rooms/:id/members error:', error);
    res.status(500).json({ message: 'Could not load room members' });
  }
});

router.post('/rooms/:id/invite', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const room = await requireRoomAccess(id, req.user.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const userId = req.body.userId ? parseInt(req.body.userId, 10) : null;
    if (!email && !userId) {
      return res.status(400).json({ message: 'Email və ya userId lazımdır.' });
    }

    const userResult = userId
      ? await db.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [userId])
      : await db.query('SELECT id, name, email, avatar_url FROM users WHERE email = $1', [email]);
    const invitedUser = userResult.rows[0];
    if (!invitedUser) {
      return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    }

    await db.query(
      `INSERT INTO room_members (room_id, user_id, invited_by, role)
       VALUES ($1, $2, $3, 'member')
       ON CONFLICT (room_id, user_id) DO UPDATE SET invited_by = COALESCE(room_members.invited_by, EXCLUDED.invited_by)`,
      [id, invitedUser.id, req.user.id]
    );

    await createNotification({
      userId: invitedUser.id,
      actorId: req.user.id,
      type: 'chat_invite',
      entityType: 'chat_room',
      entityId: id,
      text: `${req.user.name || 'Bir istifadəçi'} səni "${room.name}" chat otağına dəvət etdi.`,
    });

    res.json({ message: 'Dəvət göndərildi.', roomId: Number(id), user: invitedUser });
  } catch (error) {
    console.error('POST /chat/rooms/:id/invite error:', error);
    res.status(500).json({ message: 'Dəvət göndərilmədi.' });
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
    const room = await db.query('SELECT id, name FROM chat_rooms WHERE id = $1 AND is_public = true', [id]);
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

    await notifyRoomMentions({
      roomId: id,
      roomName: room.rows[0].name,
      text,
      actorId: req.user.id,
      actorName: req.user.name,
    });

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
