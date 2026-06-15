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

router.post('/job-boosts', auth, async (req, res) => {
  const postId = Number(req.body.postId || req.body.post_id);
  const amount = Number(req.body.amount || 5);
  const note = String(req.body.note || '').trim();

  if (!postId) {
    return res.status(400).json({ message: 'İş elanı seçilməyib.' });
  }
  if (!Number.isFinite(amount) || amount < 1) {
    return res.status(400).json({ message: 'Minimum boost məbləği 1 AZN-dir.' });
  }
  if (note && invalidText(note)) {
    return res.status(400).json({ message: 'Boost qeydi qaydalara uyğun deyil.' });
  }

  try {
    const postResult = await db.query('SELECT id, user_id, post_type FROM posts WHERE id = $1', [postId]);
    const post = postResult.rows[0];
    if (!post) return res.status(404).json({ message: 'İş elanı tapılmadı.' });
    if (post.post_type !== 'JOB') return res.status(400).json({ message: 'Yalnız iş elanları önə çıxarıla bilər.' });
    if (String(post.user_id) !== String(req.user.id)) return res.status(403).json({ message: 'Bu elanı yalnız sahibi önə çıxara bilər.' });

    const reference = `JB-${Date.now()}-${req.user.id}`;
    const result = await db.query(
      `INSERT INTO job_boosts (post_id, user_id, amount, currency, status, reference, note)
       VALUES ($1, $2, $3, 'AZN', 'PENDING_MANUAL_CONFIRMATION', $4, $5)
       RETURNING id, post_id, user_id, amount, currency, status, reference, note, created_at`,
      [postId, req.user.id, amount, reference, note || null]
    );

    res.status(201).json({
      boost: result.rows[0],
      accountNumber: process.env.SUPPORT_ACCOUNT_NUMBER || DEFAULT_ACCOUNT_NUMBER,
      receiverName: process.env.SUPPORT_RECEIVER_NAME || 'DevFeed creator',
    });
  } catch (error) {
    console.error('POST /support/job-boosts error:', error);
    res.status(500).json({ message: 'Boost ödənişi qeydə alınmadı.' });
  }
});

module.exports = router;
