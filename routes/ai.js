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

// Until ANTHROPIC_API_KEY is set the assistant runs in beta: the app's
// suggested questions get these prepared answers, anything else gets BETA_REPLY.
const BETA_ANSWERS = {
  'React-də useEffect nə vaxt işləyir?': `useEffect komponent ekrana çəkiləndən (render-dən) sonra işləyir. Nə vaxt təkrar işləyəcəyini asılılıq massivi müəyyən edir:

\`\`\`js
useEffect(() => {
  // hər render-dən sonra
});

useEffect(() => {
  // yalnız ilk dəfə (mount)
}, []);

useEffect(() => {
  fetchPosts(userId);
}, [userId]); // userId dəyişəndə
\`\`\`

Təmizləmə üçün funksiya qaytar — komponent silinəndə və effekt yenidən işləməzdən əvvəl çağırılır:

\`\`\`js
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
\`\`\``,
  'Junior developer CV-mə nə yazım?': `Junior CV-də təcrübənin azlığını layihələrlə əvəz et:

1. Başlıq: ad, rol (məs. "Frontend Developer"), email, GitHub, LinkedIn, portfolio linki.
2. Qısa xülasə (2–3 cümlə): nə ilə işləyirsən və nə axtarırsan.
3. Layihələr — ən vacib bölmə. Hər biri üçün: nə edir, hansı texnologiyalar, canlı demo və GitHub linki. Rəqəm ver: "səhifə yüklənməsini 2 san-dən 0.8 san-ə endirdim".
4. Bacarıqlar: yalnız həqiqətən istifadə etdiklərin (React, TypeScript, Git, REST...).
5. Təhsil, kurslar, sertifikatlar.

Məsləhət: CV 1 səhifə olsun, PDF göndər, hər vakansiyaya uyğun açar sözləri əlavə et. DevFeed-də layihələrini demo kimi paylaş — işəgötürənlər birbaşa baxa bilər.`,
  'Layihəm üçün DevFeed paylaşımı yaz': `Bu şablonu öz layihənə uyğunlaşdır:

🚀 [Layihənin adı] — canlı!

[Bir cümlə: layihə nə problemi həll edir?]

🛠 Stack: React · Node.js · PostgreSQL
✨ Əsas imkanlar:
• [imkan 1]
• [imkan 2]
• [imkan 3]

Ən çətini [çətin hissə] oldu — [necə həll etdin].

Demo: [link]
Kod: [GitHub link]

Rəyini şərhlərdə yaz 👇
#react #nodejs #portfolio

Paylaşanda növü "Demo" seç — link kart kimi görünəcək və hamı bir toxunuşla aça biləcək.`,
  'Bu xətanı izah et: undefined is not a function': `Bu xəta o deməkdir ki, funksiya kimi çağırdığın şey əslində undefined-dir.

Ən çox rast gəlinən səbəblər:
1. Ad səhvi: \`user.getNmae()\` — metod adı düz yazılmayıb.
2. Import səhvi: default və named export qarışıb.
\`\`\`js
import fetchPosts from './api';     // default
import { fetchPosts } from './api'; // named
\`\`\`
3. Məlumat hələ gəlməyib: \`data.map(...)\` çağırılanda data massiv deyil.
4. this itib: class metodu callback kimi ötürüləndə.

Necə tapmaq: xətadakı sətrə bax, çağırılan şeyi \`console.log(typeof x)\` ilə yoxla. Qoruma üçün: \`onPress?.()\`, \`Array.isArray(data) && data.map(...)\`.`,
};

const BETA_REPLY = `DevFeed AI hazırda beta mərhələsindədir 🚀
Hələlik yalnız hazır suallara cavab verə bilirəm — onları mesaj qutusunun üstündə görə bilərsən. Tam versiya tezliklə açılacaq!`;

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
  const messages = cleanHistory(req.body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ message: 'Sual boşdur.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    const question = messages[messages.length - 1].content;
    return res.json({ reply: BETA_ANSWERS[question] || BETA_REPLY, beta: true });
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
