const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { containsIllegalWords } = require('../middleware/contentFilter');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.updated_at, c.last_message, c.user_a_id, c.user_b_id,
              ua.name AS user_a_name, ub.name AS user_b_name
       FROM conversations c
       JOIN users ua ON ua.id = c.user_a_id
       JOIN users ub ON ub.id = c.user_b_id
       WHERE c.user_a_id = $1 OR c.user_b_id = $1
       ORDER BY c.updated_at DESC`,
      [req.user.id]
    );

    const conversations = result.rows.map((row) => {
      const otherUser = row.user_a_id === req.user.id
        ? { id: row.user_b_id, name: row.user_b_name }
        : { id: row.user_a_id, name: row.user_a_name };
      return {
        id: row.id,
        title: otherUser.name,
        lastMessage: row.last_message,
        time: row.updated_at,
      };
    });

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load conversations' });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT c.id, c.user_a_id, c.user_b_id, c.last_message, c.updated_at,
              ua.name AS user_a_name, ub.name AS user_b_name
       FROM conversations c
       JOIN users ua ON ua.id = c.user_a_id
       JOIN users ub ON ub.id = c.user_b_id
       WHERE c.id = $1
         AND ($2 = c.user_a_id OR $2 = c.user_b_id)`,
      [id, req.user.id]
    );

    const conversation = result.rows[0];
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const otherUser = conversation.user_a_id === req.user.id
      ? { id: conversation.user_b_id, name: conversation.user_b_name }
      : { id: conversation.user_a_id, name: conversation.user_a_name };

    const messagesResult = await db.query(
      `SELECT m.id, m.text, m.created_at, m.sender_id, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    res.json({
      id: conversation.id,
      title: otherUser.name,
      participants: {
        me: { id: req.user.id, name: req.user.name },
        other: otherUser,
      },
      lastMessage: conversation.last_message,
      updatedAt: conversation.updated_at,
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        text: row.text,
        createdAt: row.created_at,
        sender: { id: row.sender_id, name: row.sender_name },
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load conversation' });
  }
});

router.post('/', auth, async (req, res) => {
  const { email, userId } = req.body;

  if (!email && !userId) {
    return res.status(400).json({ message: 'Email or userId is required' });
  }

  let otherUser;
  try {
    if (userId) {
      if (parseInt(userId, 10) === req.user.id) {
        return res.status(400).json({ message: 'Cannot create conversation with yourself' });
      }
      const userResult = await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
      otherUser = userResult.rows[0];
    } else {
      if (email === req.user.email) {
        return res.status(400).json({ message: 'Cannot create conversation with yourself' });
      }
      const userResult = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
      otherUser = userResult.rows[0];
    }

    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await db.query(
      `SELECT id FROM conversations
       WHERE (user_a_id = $1 AND user_b_id = $2)
          OR (user_a_id = $2 AND user_b_id = $1)`,
      [req.user.id, otherUser.id]
    );

    if (existing.rows.length > 0) {
      const conversationId = existing.rows[0].id;
      return res.json({ id: conversationId, title: otherUser.name });
    }

    const newConversation = await db.query(
      'INSERT INTO conversations (user_a_id, user_b_id, last_message, updated_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      [req.user.id, otherUser.id, 'Yeni söhbət başladı']
    );

    res.status(201).json({ id: newConversation.rows[0].id, title: otherUser.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not create conversation' });
  }
});

router.post('/:id/messages', auth, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Message text is required' });
  }
  if (containsIllegalWords(text)) {
    return res.status(400).json({ message: 'Mesajınızda yasa dışı içerik var.' });
  }

  try {
    const conversationResult = await db.query(
      `SELECT id FROM conversations
       WHERE id = $1
         AND ($2 = user_a_id OR $2 = user_b_id)`,
      [id, req.user.id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const insertResult = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3) RETURNING id, conversation_id, sender_id, text, created_at',
      [id, req.user.id, text.trim()]
    );

    const message = insertResult.rows[0];

    await db.query(
      'UPDATE conversations SET last_message = $1, updated_at = NOW() WHERE id = $2',
      [text.trim(), id]
    );

    res.json({
      id: message.id,
      text: message.text,
      createdAt: message.created_at,
      sender: { id: req.user.id, name: req.user.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not send message' });
  }
});

module.exports = router;
