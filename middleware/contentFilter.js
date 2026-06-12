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

async function validateImageMetadata(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
      return { valid: false, reason: 'İcazə verilən şəkil formatı: JPG, PNG, WebP' };
    }
    
    const maxDimension = 2048;
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      return { valid: false, reason: `Şəkil ölçüsü çox böyükdür (maksimum: ${maxDimension}x${maxDimension}px). Lütfən daha kiçik şəkil seçin.` };
    }
    
    const minDimension = 32;
    if (metadata.width < minDimension || metadata.height < minDimension) {
      return { valid: false, reason: `Şəkil ölçüsü çox kiçikdir (minimum: ${minDimension}x${minDimension}px)` };
    }
    
    return { valid: true, metadata };
  } catch (error) {
    return { valid: false, reason: 'Şəkil oxunmadı: ' + error.message };
  }
}

async function detectNSFWSkinTone(buffer) {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Resize for faster processing if image is too large
    const resized = image.resize(400, 400, { fit: 'inside', withoutEnlargement: true });
    
    // Get raw RGB pixel data
    const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });
    
    let skinTonePixels = 0;
    let totalPixels = 0;
    
    // Process pixels (RGB format, 3 bytes per pixel)
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Skin tone detection: 
      // - Red dominant (R > G and R > B)
      // - High saturation (R-B > 20)
      // - Within skin tone range
      if (r > 80 && g > 40 && b > 20 && (r - g) > 5 && (r - b) > 15) {
        skinTonePixels++;
      }
      totalPixels++;
    }
    
    const skinTonePercentage = (skinTonePixels / totalPixels) * 100;
    
    // If more than 25% skin tone pixels, likely inappropriate
    if (skinTonePercentage > 18) {
      return { valid: false, reason: 'Şəkil uyğunsuz dərəcədə cəldi göstərir. Lütfən başqa şəkil seçin.' };
    }
    
    return { valid: true };
  } catch (error) {
    console.warn('NSFW detection error (non-blocking):', error.message);
    return { valid: true }; // Don't block if detection fails
  }
}

async function validateAvatar(buffer) {
  const validation = await validateImageMetadata(buffer);
  if (!validation.valid) return validation;
  
  const { metadata } = validation;
  const aspectRatio = metadata.width / metadata.height;
  
  if (aspectRatio < 0.75 || aspectRatio > 1.33) {
    return { valid: false, reason: 'Profil şəkli kvadrata yaxın ölçüdə olmalıdır (portrət formatı qəbul olunur)' };
  }
  
  // Check for excessive skin tones (NSFW detection)
  const nsfwCheck = await detectNSFWSkinTone(buffer);
  if (!nsfwCheck.valid) {
    return nsfwCheck;
  }
  
  return { valid: true, metadata };
}

function validateFileUpload(file) {
  if (!file) return { valid: false, reason: 'Fayl seçilmədi' };
  
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, reason: `Fayl çox böyükdür. Maksimum: 5MB, Yüklənmiş: ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }
  
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return { valid: false, reason: `İcazə verilən formatlar: JPG, PNG, WebP. Yüklənmiş: ${file.mimetype}` };
  }
  
  return { valid: true };
}

module.exports = {
  containsIllegalWords,
  containsNSFWKeywords,
  checkBadWords,
  validateImageMetadata,
  validateAvatar,
  validateFileUpload,
  detectNSFWSkinTone,
  ILLEGAL_TERMS,
  NSFW_KEYWORDS,
  filter,
};
