const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');
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

async function getProfileCounts(userId, viewerId = 0) {
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM posts WHERE user_id = $1) AS posts_count,
       (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers_count,
       (SELECT COUNT(*)::int FROM follows WHERE follower_id = $1) AS following_count,
       EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) AS following_by_me`,
    [userId, viewerId]
  );
  return result.rows[0] || {};
}

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, bio, role, role_sub, skills, languages, website, avatar_url, activity_visible, email_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const counts = await getProfileCounts(req.user.id, req.user.id);
    const stack = (user.skills && user.skills.length) ? user.skills : (user.languages && user.languages.length ? user.languages : ['React Native', 'Node.js', 'PostgreSQL']);
    res.json({
      ...user,
      stack,
      posts: counts.posts_count,
      followers_count: counts.followers_count,
      following_count: counts.following_count,
      following_by_me: false,
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
        u.name, u.role, u.role_sub, u.avatar_url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE((SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id), 0) as bookmark_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked_by_me,
        EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND user_id = $1) as bookmarked_by_me
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

router.get('/:id/posts', optionalAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const viewerId = req.user?.id || 0;
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: 'İstifadəçi id-si yanlışdır.' });
    }

    const profileResult = await db.query('SELECT id, activity_visible FROM users WHERE id = $1', [userId]);
    const profile = profileResult.rows[0];
    if (!profile) return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    if (!profile.activity_visible && String(viewerId) !== String(userId)) {
      return res.json({ hidden: true, posts: [] });
    }

    const result = await db.query(
      `SELECT
        p.id, p.user_id, p.title, p.caption, p.body, p.post_type, p.metadata, p.tags, p.views, p.likes, p.created_at,
        u.name, u.role, u.role_sub, u.avatar_url,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        COALESCE((SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id), 0) as bookmark_count,
        EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $2) as liked_by_me,
        EXISTS(SELECT 1 FROM post_bookmarks WHERE post_id = p.id AND user_id = $2) as bookmarked_by_me
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId, viewerId]
    );

    res.json({ hidden: false, posts: result.rows });
  } catch (error) {
    console.error('GET /profile/:id/posts error:', error);
    res.status(500).json({ message: 'Profil paylaşımları yüklənmədi.' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const viewerId = req.user?.id || 0;
    const result = await db.query(
      'SELECT id, name, email, bio, role, role_sub, skills, languages, website, avatar_url, activity_visible, email_verified FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const counts = await getProfileCounts(userId, viewerId);
    const stack = (user.skills && user.skills.length) ? user.skills : (user.languages && user.languages.length ? user.languages : ['React Native', 'Node.js', 'PostgreSQL']);
    res.json({
      ...user,
      stack,
      posts: counts.posts_count,
      followers_count: counts.followers_count,
      following_count: counts.following_count,
      following_by_me: !!counts.following_by_me,
      is_me: String(viewerId) === String(userId),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load profile' });
  }
});

// Update profile (role, sub-role, skills, languages, bio, website, avatar_url)
router.patch('/', auth, async (req, res) => {
  const { role, roleSub, subRole, skills, languages, bio, website, name, avatar_url, activityVisible, activity_visible } = req.body;
  const roleSubValue = roleSub || subRole || null;
  const activityVisibleValue = typeof activityVisible === 'boolean'
    ? activityVisible
    : (typeof activity_visible === 'boolean' ? activity_visible : null);
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
         avatar_url = COALESCE($8, avatar_url),
         activity_visible = COALESCE($9, activity_visible)
       WHERE id = $10
       RETURNING id, name, email, role, role_sub, skills, languages, bio, website, avatar_url, activity_visible, email_verified`,
      [
        name || null,
        role || null,
        roleSubValue,
        skillsJson.length ? JSON.stringify(skillsJson) : null,
        langsJson.length ? JSON.stringify(langsJson) : null,
        bio || null,
        website || null,
        avatar_url || null,
        activityVisibleValue,
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
