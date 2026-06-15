const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');
const { containsIllegalWords, checkBadWords } = require('../middleware/contentFilter');
const { createNotification } = require('../services/notifications');

const router = express.Router();
const resumesDir = path.join(__dirname, '../uploads/resumes');
fs.mkdirSync(resumesDir, { recursive: true });

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, resumesDir),
    filename: (req, file, cb) => {
      const safeName = path.basename(file.originalname || 'cv.pdf').replace(/[^a-zA-Z0-9._-]/g, '-');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = file.mimetype === 'application/pdf' || (file.mimetype === 'application/octet-stream' && ext === '.pdf');
    if (!allowed) return cb(new Error('CV yalnız PDF formatında olmalıdır.'));
    cb(null, true);
  },
});

function getPublicUploadUrl(req, folder, filename) {
  const base = (process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  return `${base}/uploads/${folder}/${filename}`;
}

// GET /posts?limit=20&offset=0
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const viewerId = req.user?.id || 0;
    const result = await pool.query(
      `SELECT 
        p.id, p.user_id, p.title, p.caption, p.body, p.post_type, p.metadata, p.tags, p.views, p.likes, p.created_at,
        u.name, u.role, u.role_sub, u.avatar_url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE((SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id), 0) as bookmark_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked_by_me,
        EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND user_id = $1) as bookmarked_by_me
       FROM posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [viewerId, limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /posts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /posts/search?q=react
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const pattern = `%${q}%`;
    const viewerId = req.user?.id || 0;

    const result = await pool.query(
      `SELECT
        p.id, p.user_id, p.title, p.caption, p.body, p.post_type, p.metadata, p.tags, p.views, p.likes, p.created_at,
        u.name, u.role, u.role_sub, u.avatar_url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE((SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id), 0) as bookmark_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked_by_me,
        EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND user_id = $1) as bookmarked_by_me
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE $2 = ''
          OR p.title ILIKE $3
          OR p.caption ILIKE $3
          OR p.body ILIKE $3
          OR EXISTS (SELECT 1 FROM unnest(p.tags) tag WHERE tag ILIKE $3)
       ORDER BY p.created_at DESC
       LIMIT 40`,
      [viewerId, q, pattern]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('GET /posts/search error:', error);
    res.status(500).json({ message: 'Postlar axtarılmadı.' });
  }
});

router.post('/applications/resume', auth, resumeUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CV PDF faylı lazımdır.' });
    }
    res.status(201).json({
      resumeUrl: getPublicUploadUrl(req, 'resumes', req.file.filename),
      resumeFileName: req.file.originalname || req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (unlinkError) {}
    }
    console.error('POST /posts/applications/resume error:', error);
    res.status(500).json({ message: error.message || 'CV yüklənmədi.' });
  }
});

router.get('/applications/inbox', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         ja.id, ja.post_id, ja.user_id, ja.status, ja.cover_letter, ja.resume_url,
         ja.resume_file_name, ja.applicant_phone, ja.created_at,
         p.title AS post_title, p.caption AS post_caption, p.post_type,
         u.name AS applicant_name, u.email AS applicant_email, u.role AS applicant_role,
         u.role_sub AS applicant_role_sub, u.avatar_url AS applicant_avatar_url
       FROM job_applications ja
       JOIN posts p ON p.id = ja.post_id
       JOIN users u ON u.id = ja.user_id
       WHERE p.user_id = $1
       ORDER BY ja.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /posts/applications/inbox error:', error);
    res.status(500).json({ message: 'Müraciətlər yüklənmədi.' });
  }
});

// GET /posts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.user?.id || 0;
    const result = await pool.query(
      `SELECT 
        p.id, p.user_id, p.title, p.caption, p.body, p.post_type, p.metadata, p.tags, p.views, p.likes, p.created_at,
        u.name, u.role, u.role_sub, u.avatar_url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE((SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id), 0) as bookmark_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked_by_me,
        EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND user_id = $1) as bookmarked_by_me
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $2`,
      [viewerId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    // Increment views
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('GET /posts/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts (create post)
router.post('/', auth, async (req, res) => {
  try {
    const { title, caption, body, post_type = 'TEXT', metadata = {}, tags = [] } = req.body;
    const user_id = req.user.id;

    if (!body) {
      return res.status(400).json({ error: 'body is required' });
    }
    
    if (title && (containsIllegalWords(title) || checkBadWords(title))) {
      return res.status(400).json({ error: 'Post başlığı kurallara uygun değil' });
    }
    if (caption && (containsIllegalWords(caption) || checkBadWords(caption))) {
      return res.status(400).json({ error: 'Post içeriği kurallara uygun değil' });
    }
    if (containsIllegalWords(body) || checkBadWords(body)) {
      return res.status(400).json({ error: 'Post metni kurallara uygun değil' });
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, title, caption, body, post_type, metadata, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, title, caption, body, post_type, JSON.stringify(metadata), tags]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /posts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /posts/:id (update post)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, caption, body, metadata = {}, tags = [] } = req.body;
    const user_id = req.user.id;

    // Check ownership
    const ownership = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (ownership.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (containsIllegalWords(title) || containsIllegalWords(caption) || containsIllegalWords(body)) {
      return res.status(400).json({ error: 'İçerik kurallara uyğun deyil.' });
    }

    const result = await pool.query(
      `UPDATE posts SET title = $1, caption = $2, body = $3, metadata = $4, tags = $5
       WHERE id = $6
       RETURNING *`,
      [title, caption, body, JSON.stringify(metadata), tags, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('PUT /posts/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check ownership
    const ownership = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (ownership.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (ownership.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('DELETE /posts/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post tapılmadı.' });
    }

    const insert = await pool.query(
      `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING
       RETURNING id`,
      [id, user_id]
    );

    if (insert.rows.length > 0) {
      await createNotification({
        userId: postResult.rows[0].user_id,
        actorId: user_id,
        type: 'post_like',
        entityType: 'post',
        entityId: id,
        text: `${req.user.name || 'Bir istifadəçi'} paylaşımını bəyəndi.`,
      });
    }

    const count = await pool.query('SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1', [id]);
    res.json({ message: 'Bəyənildi', liked: true, like_count: count.rows[0].count });
  } catch (error) {
    console.error('POST /posts/:id/like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /posts/:id/like
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [id, user_id]);
    const count = await pool.query('SELECT COUNT(*)::int AS count FROM post_likes WHERE post_id = $1', [id]);
    res.json({ message: 'Bəyənmə silindi', liked: false, like_count: count.rows[0].count });
  } catch (error) {
    console.error('DELETE /posts/:id/like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts/:id/bookmark
router.post('/:id/bookmark', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post tapılmadı.' });
    }

    const insert = await pool.query(
      `INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING
       RETURNING id`,
      [id, user_id]
    );

    if (insert.rows.length > 0) {
      await createNotification({
        userId: postResult.rows[0].user_id,
        actorId: user_id,
        type: 'post_bookmark',
        entityType: 'post',
        entityId: id,
        text: `${req.user.name || 'Bir istifadəçi'} paylaşımını yadda saxladı.`,
      });
    }

    const count = await pool.query('SELECT COUNT(*)::int AS count FROM post_bookmarks WHERE post_id = $1', [id]);
    res.json({ message: 'Yadda saxlandı', bookmarked: true, bookmark_count: count.rows[0].count });
  } catch (error) {
    console.error('POST /posts/:id/bookmark error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /posts/:id/bookmark
router.delete('/:id/bookmark', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    await pool.query('DELETE FROM post_bookmarks WHERE post_id = $1 AND user_id = $2', [id, user_id]);
    const count = await pool.query('SELECT COUNT(*)::int AS count FROM post_bookmarks WHERE post_id = $1', [id]);
    res.json({ message: 'Yadda saxlamadan çıxarıldı', bookmarked: false, bookmark_count: count.rows[0].count });
  } catch (error) {
    console.error('DELETE /posts/:id/bookmark error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts/:id/comments (add comment)
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const user_id = req.user.id;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (containsIllegalWords(text) || checkBadWords(text)) {
      return res.status(400).json({ error: 'Şərh qaydalara uyğun deyil.' });
    }

    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post tapılmadı.' });
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, text) VALUES ($1, $2, $3)
       RETURNING *`,
      [id, user_id, text]
    );

    await createNotification({
      userId: postResult.rows[0].user_id,
      actorId: user_id,
      type: 'post_comment',
      entityType: 'post',
      entityId: id,
      text: `${req.user.name || 'Bir istifadəçi'} paylaşımına şərh yazdı.`,
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /posts/:id/comments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /posts/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.id, c.post_id, c.user_id, c.text, c.created_at, u.name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /posts/:id/comments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /posts/:id/apply
router.post('/:id/apply', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      cover_letter = '',
      resume_url = '',
      resume_file_name = '',
      applicant_phone = '',
    } = req.body;

    const postResult = await pool.query('SELECT id, user_id, title, caption, post_type FROM posts WHERE id = $1', [id]);
    const jobPost = postResult.rows[0];
    if (!jobPost) return res.status(404).json({ error: 'Post not found' });
    if (jobPost.post_type !== 'JOB') return res.status(400).json({ error: 'Only JOB posts can be applied to' });
    if (String(jobPost.user_id) === String(userId)) return res.status(400).json({ error: 'Öz iş elanına müraciət etmək olmaz.' });
    if (!String(applicant_phone || '').trim()) return res.status(400).json({ error: 'Əlaqə nömrəsi lazımdır.' });
    if (!String(resume_url || '').trim()) return res.status(400).json({ error: 'CV PDF faylı lazımdır.' });

    if (
      containsIllegalWords(cover_letter) ||
      containsIllegalWords(resume_url) ||
      containsIllegalWords(resume_file_name) ||
      containsIllegalWords(applicant_phone)
    ) {
      return res.status(400).json({ error: 'Müraciət məzmunu uyğun deyil.' });
    }

    const applicationResult = await pool.query(
      `INSERT INTO job_applications (post_id, user_id, status, cover_letter, resume_url, resume_file_name, applicant_phone)
       VALUES ($1, $2, 'APPLIED', $3, $4, $5, $6)
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET
         status = EXCLUDED.status,
         cover_letter = EXCLUDED.cover_letter,
         resume_url = EXCLUDED.resume_url,
         resume_file_name = EXCLUDED.resume_file_name,
         applicant_phone = EXCLUDED.applicant_phone,
         created_at = NOW()
       RETURNING id, post_id, user_id, status, cover_letter, resume_url, resume_file_name, applicant_phone, created_at`,
      [id, userId, cover_letter, resume_url, resume_file_name || null, applicant_phone]
    );

    const ownerId = jobPost.user_id;
    const existingConversation = await pool.query(
      `SELECT id FROM conversations
       WHERE (user_a_id = $1 AND user_b_id = $2)
          OR (user_a_id = $2 AND user_b_id = $1)`,
      [userId, ownerId]
    );

    let conversationId;
    if (existingConversation.rows.length > 0) {
      conversationId = existingConversation.rows[0].id;
    } else {
      const conversationResult = await pool.query(
        'INSERT INTO conversations (user_a_id, user_b_id, last_message, updated_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [userId, ownerId, 'İş müraciəti göndərildi']
      );
      conversationId = conversationResult.rows[0].id;
    }

    const jobTitle = jobPost.caption || jobPost.title || 'İş elanı';
    const messageText = [
      `Mən "${jobTitle}" elanına müraciət etdim.`,
      `Telefon: ${applicant_phone}`,
      `CV: ${resume_url}`,
      cover_letter ? `Məktub: ${cover_letter}` : 'Məktub əlavə edilməyib.',
    ].join('\n');

    await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3)',
      [conversationId, userId, messageText]
    );
    await pool.query('UPDATE conversations SET last_message = $1, updated_at = NOW() WHERE id = $2', [messageText, conversationId]);

    await createNotification({
      userId: ownerId,
      actorId: userId,
      type: 'job_application',
      entityType: 'post',
      entityId: id,
      text: `${req.user.name || 'Bir istifadəçi'} iş elanına müraciət etdi.`,
    });

    res.json({ message: 'Application submitted', conversationId, application: applicationResult.rows[0] });
  } catch (error) {
    if (error?.code === '42703') return next();
    console.error('POST /posts/:id/apply real flow error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/applications', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    if (postResult.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to view applications' });

    const applicationsResult = await pool.query(
      `SELECT ja.id, ja.user_id, ja.status, ja.cover_letter, ja.resume_url, ja.resume_file_name,
              ja.applicant_phone, ja.created_at,
              u.name, u.email, u.role, u.role_sub, u.avatar_url
       FROM job_applications ja
       JOIN users u ON u.id = ja.user_id
       WHERE ja.post_id = $1
       ORDER BY ja.created_at DESC`,
      [id]
    );

    res.json(applicationsResult.rows);
  } catch (error) {
    if (error?.code === '42703') return next();
    console.error('GET /posts/:id/applications real flow error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy fallback: POST /posts/:id/apply
router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const { cover_letter = '', resume_url = '' } = req.body;

    const postResult = await pool.query('SELECT post_type FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (postResult.rows[0].post_type !== 'JOB') {
      return res.status(400).json({ error: 'Only JOB posts can be applied to' });
    }
    if (containsIllegalWords(cover_letter) || containsIllegalWords(resume_url)) {
      return res.status(400).json({ error: 'Müraciət məzmunu uyğun deyil.' });
    }

    await pool.query(
      `INSERT INTO job_applications (post_id, user_id, status, cover_letter, resume_url)
       VALUES ($1, $2, 'APPLIED', $3, $4)
       ON CONFLICT (post_id, user_id)
       DO UPDATE SET status = EXCLUDED.status, cover_letter = EXCLUDED.cover_letter, resume_url = EXCLUDED.resume_url, created_at = NOW()`,
      [id, user_id, cover_letter, resume_url]
    );

    const postOwner = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    const ownerId = postOwner.rows[0].user_id;

    const existingConversation = await pool.query(
      `SELECT id FROM conversations
       WHERE (user_a_id = $1 AND user_b_id = $2)
          OR (user_a_id = $2 AND user_b_id = $1)`,
      [user_id, ownerId]
    );

    let conversationId;
    if (existingConversation.rows.length > 0) {
      conversationId = existingConversation.rows[0].id;
    } else {
      const conversationResult = await pool.query(
        'INSERT INTO conversations (user_a_id, user_b_id, last_message, updated_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [user_id, ownerId, 'İş müraciəti göndərildi']
      );
      conversationId = conversationResult.rows[0].id;
    }

    const messageText = `Mən bu vakansiyaya müraciət etdim. CV: ${resume_url || 'Mövcud deyil'}\nMəktub: ${cover_letter || 'Məktub əlavə edilməyib'}`;
    await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, text) VALUES ($1, $2, $3)',
      [conversationId, user_id, messageText]
    );

    await pool.query(
      'UPDATE conversations SET last_message = $1, updated_at = NOW() WHERE id = $2',
      [messageText, conversationId]
    );

    await createNotification({
      userId: ownerId,
      actorId: user_id,
      type: 'job_application',
      entityType: 'post',
      entityId: id,
      text: `${req.user.name || 'Bir istifadəçi'} iş elanına müraciət etdi.`,
    });

    res.json({ message: 'Application submitted', conversationId });
  } catch (error) {
    console.error('POST /posts/:id/apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /posts/:id/application-status
router.get('/:id/application-status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const result = await pool.query(
      'SELECT status FROM job_applications WHERE post_id = $1 AND user_id = $2',
      [id, user_id]
    );
    res.json({ applied: result.rows.length > 0, status: result.rows[0]?.status || null });
  } catch (error) {
    console.error('GET /posts/:id/application-status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/applications', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const postResult = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (postResult.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to view applications' });
    }

    const applicationsResult = await pool.query(
      `SELECT ja.user_id, ja.status, ja.cover_letter, ja.resume_url, ja.created_at,
              u.name, u.email, u.role, u.avatar_url
       FROM job_applications ja
       JOIN users u ON u.id = ja.user_id
       WHERE ja.post_id = $1
       ORDER BY ja.created_at DESC`,
      [id]
    );

    res.json(applicationsResult.rows);
  } catch (error) {
    console.error('GET /posts/:id/applications error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

