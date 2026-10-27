const sharp = require('sharp');
const Filter = require('bad-words');

const filter = new Filter();

const ILLEGAL_TERMS = [
  'sex',
  'porn',
  'xxx',
  'kill',
  'murder',
  'terror',
  'bomb',
  'drugs',
  'fraud',
  'scam',
  'hack',
  'hacker',
  'piracy',
  'abuse',
  'racist',
  'racism',
  'discriminate',
  'illegal',
  'rape',
  'child',
  'weapon',
  'attack',
  'suicide',
  'self-harm',
  'gijdillaq',
  'gijdıllaq',
  'peyser',
  'peysər',
  'qehbe',
  'qəhbə',
  'sik',
  'amciq',
  'suka',
  'soxum',
  'dillaq'
];

const NSFW_KEYWORDS = [
  'nude',
  'naked',
  'erotic',
  'adult',
  'explicit',
  'inappropriate',
];

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsIllegalWords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return ILLEGAL_TERMS.some((term) => normalized.includes(term));
}

function containsNSFWKeywords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return NSFW_KEYWORDS.some((term) => normalized.includes(term));
}

function checkBadWords(text) {
  if (!text || typeof text !== 'string') return false;
  return filter.isProfane(text);
}

const AVATAR_SIZE = 512;
const AVATAR_MIN_SIDE = 64;

// Checks an uploaded avatar and turns it into a 512x512 JPEG: square-cropped
// around the most interesting region, rotated by its EXIF orientation, and
// with all metadata (GPS position, camera details) dropped.
async function processAvatar(buffer) {
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (error) {
    return { valid: false, reason: 'Şəkil oxunmadı. Başqa şəkil seç.' };
  }
  if (!['jpeg', 'png', 'webp', 'heif'].includes(metadata.format)) {
    return { valid: false, reason: 'Yalnız JPG, PNG, WebP və HEIC şəkillər qəbul olunur.' };
  }
  if (Math.min(metadata.width || 0, metadata.height || 0) < AVATAR_MIN_SIDE) {
    return { valid: false, reason: 'Şəkil çox kiçikdir. Ən azı 64×64 piksel olmalıdır.' };
  }
  try {
    const output = await sharp(buffer)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: sharp.strategy.attention })
      .flatten({ background: '#10131D' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { valid: true, buffer: output };
  } catch (error) {
    return { valid: false, reason: 'Şəkil emal olunmadı. Başqa şəkil seç.' };
  }
}

function validateFileUpload(file) {
  if (!file) return { valid: false, reason: 'Şəkil seçilmədi.' };
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!allowedMimes.includes(file.mimetype)) {
    return { valid: false, reason: 'Yalnız JPG, PNG, WebP və HEIC şəkillər qəbul olunur.' };
  }
  return { valid: true };
}

module.exports = {
  containsIllegalWords,
  containsNSFWKeywords,
  checkBadWords,
  processAvatar,
  validateFileUpload,
  ILLEGAL_TERMS,
  NSFW_KEYWORDS,
  filter,
};
