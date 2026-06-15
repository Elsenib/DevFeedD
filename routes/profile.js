const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validateFileUpload, validateAvatar, containsIllegalWords, checkBadWords } = require('../middleware/contentFilter');

const router = express.Router();

const avatarUploadDir = path.join(__dirname, '../uploads/avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      return cb(new Error(validation.reason));
    }
    cb(null, true);
  },
});

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, bio, role, role_sub, skills, languages, website, avatar_url FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const postsCount = await db.query('SELECT COUNT(*)::int FROM posts WHERE user_id = $1', [req.user.id]);
    const stack = (user.skills && user.skills.length) ? user.skills : (user.languages && user.languages.length ? user.languages : ['React Native', 'Node.js', 'PostgreSQL']);
    res.json({
      ...user,
      stack,
      posts: postsCount.rows[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load profile' });
  }
});

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Şəkil yüklənmədi' });
    }

    // Read file buffer from disk for validation
    const fileBuffer = fs.readFileSync(req.file.path);
    const avatarValidation = await validateAvatar(fileBuffer);
    if (!avatarValidation.valid) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: avatarValidation.reason });
    }

    const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    const result = await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url', [avatarUrl, req.user.id]);
    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    console.error(error);
    res.status(500).json({ message: error.message || 'Could not upload avatar' });
  }
});

router.get('/posts', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        p.id, p.user_id, p.title, p.caption, p.body, p.post_type, p.metadata, p.tags, p.views, p.likes, p.created_at,
        u.name, u.role, u.avatar_url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE((SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id), 0) as bookmark_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('GET /profile/posts error:', error);
    res.status(500).json({ message: 'Profil paylaşımları yüklənmədi' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const result = await db.query('SELECT id, name, email, bio, role, role_sub, skills, languages, website, avatar_url FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const postsCount = await db.query('SELECT COUNT(*)::int FROM posts WHERE user_id = $1', [userId]);
    const stack = (user.skills && user.skills.length) ? user.skills : (user.languages && user.languages.length ? user.languages : ['React Native', 'Node.js', 'PostgreSQL']);
    res.json({
      ...user,
      stack,
      posts: postsCount.rows[0].count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load profile' });
  }
});

// Update profile (role, sub-role, skills, languages, bio, website, avatar_url)
router.patch('/', auth, async (req, res) => {
  const { role, roleSub, subRole, skills, languages, bio, website, name, avatar_url } = req.body;
  const roleSubValue = roleSub || subRole || null;
  try {
    if (name && containsIllegalWords(name)) {
      return res.status(400).json({ message: 'Ad qadağan edilmiş sözlər ehtiva edir' });
    }
    if (name && checkBadWords(name)) {
      return res.status(400).json({ message: 'Ad uyğunsuz sözlər ehtiva edir' });
    }
    if (bio && containsIllegalWords(bio)) {
      return res.status(400).json({ message: 'Bio qadağan edilmiş sözlər ehtiva edir' });
    }
    if (bio && checkBadWords(bio)) {
      return res.status(400).json({ message: 'Bio uyğunsuz sözlər ehtiva edir' });
    }

    const skillsJson = Array.isArray(skills) ? skills : (skills ? [skills] : []);
    const langsJson = Array.isArray(languages) ? languages : (languages ? [languages] : []);

    const result = await db.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         role = COALESCE($2, role),
         role_sub = COALESCE($3, role_sub),
         skills = COALESCE($4::jsonb, skills),
         languages = COALESCE($5::jsonb, languages),
         bio = COALESCE($6, bio),
         website = COALESCE($7, website),
         avatar_url = COALESCE($8, avatar_url)
       WHERE id = $9
       RETURNING id, name, email, role, role_sub, skills, languages, bio, website, avatar_url`,
      [
        name || null,
        role || null,
        roleSubValue,
        skillsJson.length ? JSON.stringify(skillsJson) : null,
        langsJson.length ? JSON.stringify(langsJson) : null,
        bio || null,
        website || null,
        avatar_url || null,
        req.user.id,
      ]
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error(error);
    // For debugging in dev, return error message and stack
    res.status(500).json({ message: error.message || 'Could not update profile', stack: error.stack });
  }
});

module.exports = router;
