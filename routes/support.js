const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { containsIllegalWords, checkBadWords } = require('../middleware/contentFilter');

const router = express.Router();

const DEFAULT_ACCOUNT_NUMBER = 'AZ00 XXXX XXXX XXXX XXXX XXXX XXXX';

function invalidText(value) {
  return containsIllegalWords(value || '') || checkBadWords(value || '');
}

router.get('/config', auth, (req, res) => {
  res.json({
    minimumAmount: 1,
    currency: 'AZN',
    accountNumber: process.env.SUPPORT_ACCOUNT_NUMBER || DEFAULT_ACCOUNT_NUMBER,
    receiverName: process.env.SUPPORT_RECEIVER_NAME || 'DevFeed creator',
    note: 'Odenis etdikden sonra meblegi ve qeyd kodunu saxlayin.',
  });
});

router.post('/payments', auth, async (req, res) => {
  const receiverId = Number(req.body.receiverId || req.body.receiver_id || req.user.id);
  const amount = Number(req.body.amount);
  const note = String(req.body.note || '').trim();

  if (!Number.isFinite(amount) || amount < 1) {
    return res.status(400).json({ message: 'Minimum destek meblegi 1 AZN-dir.' });
  }
  if (note && invalidText(note)) {
    return res.status(400).json({ message: 'Destek qeydi qaydalara uygun deyil.' });
  }

  try {
    const receiver = await db.query('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (receiver.rows.length === 0) {
      return res.status(404).json({ message: 'Destek alacaq profil tapilmadi.' });
    }

    const reference = `DF-${Date.now()}-${req.user.id}`;
    const result = await db.query(
      `INSERT INTO support_payments (supporter_id, receiver_id, amount, currency, status, note, reference)
       VALUES ($1, $2, $3, 'AZN', 'PENDING_MANUAL_CONFIRMATION', $4, $5)
       RETURNING id, supporter_id, receiver_id, amount, currency, status, note, reference, created_at`,
      [req.user.id, receiverId, amount, note || null, reference]
    );

    res.status(201).json({
      payment: result.rows[0],
      accountNumber: process.env.SUPPORT_ACCOUNT_NUMBER || DEFAULT_ACCOUNT_NUMBER,
      receiverName: process.env.SUPPORT_RECEIVER_NAME || 'DevFeed creator',
    });
  } catch (error) {
    console.error('POST /support/payments error:', error);
    res.status(500).json({ message: 'Destek qeyde alina bilmedi.' });
  }
});

module.exports = router;
