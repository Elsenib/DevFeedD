const db = require('../db');

async function createNotification({ userId, actorId, type, entityType, entityId, text }) {
  if (!userId || String(userId) === String(actorId || '')) return null;

  const result = await db.query(
    `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, text)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, actor_id, type, entity_type, entity_id, text, read_at, created_at`,
    [userId, actorId || null, type, entityType || null, entityId || null, text]
  );

  return result.rows[0];
}

module.exports = { createNotification };
