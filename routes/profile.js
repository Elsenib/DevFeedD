const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateFileUpload, processAvatar, containsIllegalWords, checkBadWords } = require('../middleware/contentFilter');
const { publicBaseUrl } = require('../services/publicUrl');

const router = express.Router();

const avatarUploadDir = path.join(__dirname, '../uploads/avatars');
fs.mkdirSync(avatarUploadDir, { recursive: true });

const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

// Kept in memory: the original is re-encoded by processAvatar and only the
// cleaned-up JPEG is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const validation = validateFileUpload(file);
    if (!validation.valid) return cb(Object.assign(new Error(validation.reason), { status: 400 }));
    cb(null, true);
  },
});

// Multer reports problems through next(err); answer them as JSON the app can show.
function receiveAvatar(req, res, next) {
  upload.single('avatar')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Şəkil çox böyükdür. Maksimum 10 MB ola bilər.' : error.message;
    res.status(400).json({ message });
  });
}

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
    if (!user) return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });

    const counts = await getProfileCounts(req.user.id, req.user.id);
    const stack = (user.skills && user.skills.length) ? user.skills : (user.languages && user.languages.length ? user.languages : []);
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
    res.status(500).json({ message: 'Profil yüklənmədi.' });
  }
});

router.post('/avatar', auth, receiveAvatar, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Şəkil seçilmədi.' });
  }
  try {
    const avatar = await processAvatar(req.file.buffer);
    if (!avatar.valid) {
      return res.status(400).json({ message: avatar.reason });
    }
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    await fs.promises.writeFile(path.join(avatarUploadDir, filename), avatar.buffer);

    const avatarUrl = `${publicBaseUrl(req)}/uploads/avatars/${filename}`;
    const result = await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url', [avatarUrl, req.user.id]);
    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    console.error('POST /profile/avatar error:', error);
    res.status(500).json({ message: 'Profil şəkli yüklənmədi. Bir az sonra yenidən cəhd et.' });
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
    res.status(500).json({ message: 'Profil paylaşımları yüklənmədi.' });
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
      return res.status(400).json({ message: 'İstifadəçi düzgün deyil.' });
    }

    const viewerId = req.user?.id || 0;
    const result = await db.query(
      'SELECT id, name, bio, role, role_sub, skills, languages, website, avatar_url, activity_visible FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });

    const counts = await getProfileCounts(userId, viewerId);
    const stack = (user.skills && user.skills.length) ? user.skills : (user.languages && user.languages.length ? user.languages : []);
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
    res.status(500).json({ message: 'Profil yüklənmədi.' });
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
      return res.status(400).json({ message: 'Adda qadağan olunmuş sözlər var.' });
    }
    if (name && checkBadWords(name)) {
      return res.status(400).json({ message: 'Adda uyğunsuz sözlər var.' });
    }
    if (bio && containsIllegalWords(bio)) {
      return res.status(400).json({ message: 'Bio-da qadağan olunmuş sözlər var.' });
    }
    if (bio && checkBadWords(bio)) {
      return res.status(400).json({ message: 'Bio-da uyğunsuz sözlər var.' });
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
    if (!user) return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Profil yenilənmədi.' });
  }
});

// Permanently delete the current user's account and all data tied to it.
router.delete('/', auth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING email, avatar_url', [req.user.id]);
    const deleted = result.rows[0];
    if (!deleted) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
    }
    await client.query('DELETE FROM email_verification_codes WHERE email = $1', [deleted.email]);
    await client.query("DELETE FROM oauth_login_sessions WHERE user_payload->>'id' = $1", [String(req.user.id)]);
    await client.query('COMMIT');

    const avatarFile = String(deleted.avatar_url || '').split('/uploads/avatars/')[1];
    if (avatarFile) {
      fs.unlink(path.join(avatarUploadDir, path.basename(avatarFile)), () => {});
    }

    res.json({ deleted: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('DELETE /profile error:', error);
    res.status(500).json({ message: 'Hesab silinmədi. Yenidən cəhd et.' });
  } finally {
    client.release();
  }
});

module.exports = router;
