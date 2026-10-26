const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const DAILY_LIMIT = Math.max(1, parseInt(process.env.AI_DAILY_LIMIT, 10) || 20);
const MAX_TURNS = 20;
const MAX_CHARS = 4000;

const SYSTEM_PROMPT = `Sən DevFeed AI-san: DevFeed tətbiqinin (Azərbaycan developerləri üçün sosial şəbəkə) köməkçisi.
İstifadəçilər developerlər, dizaynerlər və İT-yə yeni başlayanlardır. Onlara bu işlərdə kömək et:
- kod sualları, xətaların izahı, kod nümunələri;
- CV, portfolio, müsahibə və iş axtarışı məsləhətləri;
- DevFeed paylaşımları üçün mətn, hashtag və layihə təsviri yazmaq.
Cavabı istifadəçinin yazdığı dildə ver; susmaya görə Azərbaycan dilində yaz.
Cavablar telefon ekranında oxunur: qısa, aydın və konkret ol. Kodu \`\`\` blokunda ver.`;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Keeps only well-formed text turns, trims long ones and makes sure the
// conversation starts with the user, as the Messages API requires.
function cleanHistory(raw) {
  const turns = (Array.isArray(raw) ? raw : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

async function takeQuota(userId) {
  const result = await db.query(
    `INSERT INTO ai_usage (user_id, day, count) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1
     RETURNING count`,
    [userId]
  );
  return result.rows[0].count;
}

router.get('/status', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT count FROM ai_usage WHERE user_id = $1 AND day = CURRENT_DATE', [req.user.id]);
    const used = result.rows[0]?.count || 0;
    res.json({ enabled: !!process.env.ANTHROPIC_API_KEY, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) });
  } catch (error) {
    console.error('GET /ai/status error:', error);
    res.status(500).json({ message: 'AI statusu yüklənmədi.' });
  }
});

router.post('/chat', auth, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI asistent hələ aktiv deyil.' });
  }
  const messages = cleanHistory(req.body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ message: 'Sual boşdur.' });
  }

  try {
    const used = await takeQuota(req.user.id);
    if (used > DAILY_LIMIT) {
      return res.status(429).json({ message: `Bugünkü AI limitin (${DAILY_LIMIT} sual) bitdi. Sabah yenə yaz.`, remaining: 0 });
    }

    // Haiku has no server-side fallback; the other models retry a declined
    // request on Anthropic's recommended fallback model.
    const fallback = MODEL.startsWith('claude-haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages,
      ...fallback,
    });

    if (response.stop_reason === 'refusal') {
      return res.json({ reply: 'Bu suala cavab verə bilmirəm. Sualı başqa cür yazmağa çalış.', remaining: DAILY_LIMIT - used });
    }
    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    res.json({ reply: reply || 'Cavab alınmadı, yenidən yoxla.', remaining: DAILY_LIMIT - used });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ message: 'AI hazırda çox məşğuldur. Bir az sonra yenidən yoxla.' });
    }
    if (error instanceof Anthropic.APIError) {
      console.error('POST /ai/chat Anthropic error:', error.status, error.message);
      return res.status(502).json({ message: 'AI cavab vermədi. Bir az sonra yenidən yoxla.' });
    }
    console.error('POST /ai/chat error:', error);
    res.status(500).json({ message: 'AI cavab vermədi.' });
  }
});

module.exports = router;
