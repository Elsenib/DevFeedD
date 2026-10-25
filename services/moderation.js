const db = require('../db');

// SQL condition: true when neither user has blocked the other.
// Both arguments are SQL expressions (column names or $n params).
function notBlockedSql(viewerExpr, otherExpr) {
  return `NOT EXISTS (
    SELECT 1 FROM user_blocks ub
    WHERE (ub.blocker_id = ${viewerExpr} AND ub.blocked_id = ${otherExpr})
       OR (ub.blocker_id = ${otherExpr} AND ub.blocked_id = ${viewerExpr})
  )`;
}

async function isBlockedBetween(userA, userB) {
  if (!userA || !userB) return false;
  const result = await db.query(
    `SELECT 1 FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userA, userB]
  );
  return result.rows.length > 0;
}

module.exports = { notBlockedSql, isBlockedBetween };
