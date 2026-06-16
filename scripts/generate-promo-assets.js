const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'marketing');
const imageDir = path.join(outDir, 'images');
const frameDir = path.join(outDir, 'video', 'frames');

for (const dir of [outDir, imageDir, frameDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const palette = {
  bg: '#050816',
  panel: '#0b1120',
  panel2: '#111827',
  text: '#f8fafc',
  muted: '#94a3b8',
  border: '#1f2a44',
  purple: '#7c3aed',
  cyan: '#22d3ee',
  green: '#22c55e',
  amber: '#f59e0b',
  rose: '#ef4444',
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function text(value, x, y, size, fill = palette.text, weight = 700, extra = '') {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" ${extra}>${esc(value)}</text>`;
}

function pill(label, x, y, color = palette.purple, width = 160) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="42" rx="21" fill="${color}" opacity="0.16"/>
    ${text(label, x + 20, y + 28, 18, color, 800)}
  `;
}

function phoneShell(content, x = 300, y = 260, w = 480, h = 1040) {
  return `
    <rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="62" fill="#020617"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="48" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2"/>
    <rect x="${x + 176}" y="${y + 18}" width="128" height="20" rx="10" fill="#020617"/>
    <g clip-path="url(#phoneClip)">
      ${content(x, y, w, h)}
    </g>
  `;
}

function appHeader(x, y, title) {
  return `
    <rect x="${x}" y="${y}" width="480" height="92" fill="${palette.bg}"/>
    <circle cx="${x + 52}" cy="${y + 52}" r="24" fill="${palette.purple}"/>
    <text x="${x + 52}" y="${y + 60}" text-anchor="middle" fill="${palette.text}" font-size="20" font-weight="900" font-family="Inter, Arial">D</text>
    ${text(title, x + 92, y + 60, 24, palette.text, 900)}
    <circle cx="${x + 424}" cy="${y + 52}" r="19" fill="${palette.panel2}"/>
  `;
}

function feedScreen(x, y) {
  const posts = [
    ['Deploy tamamlandı', 'Railway backend canlıdır', palette.green],
    ['React Native UI', 'Feed kartları və bildirişlər', palette.cyan],
    ['Junior Backend işi', 'CV ilə müraciət et', palette.amber],
  ];
  return `
    ${appHeader(x, y + 10, 'DevFeed')}
    ${pill('Trend', x + 28, y + 112, palette.cyan, 110)}
    ${pill('React', x + 150, y + 112, palette.purple, 118)}
    ${pill('Remote', x + 280, y + 112, palette.green, 132)}
    ${posts.map((post, index) => {
      const top = y + 190 + index * 218;
      return `
        <rect x="${x + 28}" y="${top}" width="424" height="180" rx="20" fill="${palette.panel}" stroke="${palette.border}"/>
        <circle cx="${x + 62}" cy="${top + 40}" r="20" fill="${post[2]}"/>
        ${text(post[0], x + 96, top + 48, 22, palette.text, 900)}
        ${text(post[1], x + 36, top + 92, 18, palette.muted, 600)}
        <rect x="${x + 36}" y="${top + 122}" width="86" height="30" rx="15" fill="${post[2]}" opacity="0.18"/>
        ${text('Bəyən', x + 52, top + 144, 15, post[2], 800)}
        <rect x="${x + 136}" y="${top + 122}" width="72" height="30" rx="15" fill="#172033"/>
        ${text('Rəy', x + 158, top + 144, 15, palette.muted, 800)}
      `;
    }).join('')}
    <rect x="${x + 28}" y="${y + 888}" width="424" height="78" rx="24" fill="${palette.panel2}"/>
    ${text('Feed', x + 62, y + 936, 18, palette.cyan, 900)}
    ${text('Kəşf', x + 154, y + 936, 18, palette.muted, 700)}
    ${text('Chat', x + 254, y + 936, 18, palette.muted, 700)}
    ${text('Profil', x + 354, y + 936, 18, palette.muted, 700)}
  `;
}

function chatScreen(x, y) {
  return `
    ${appHeader(x, y + 10, 'Mesajlar')}
    ${pill('Söhbətlər', x + 28, y + 112, palette.purple, 150)}
    ${pill('Müraciətlər', x + 198, y + 112, palette.cyan, 165)}
    <rect x="${x + 28}" y="${y + 184}" width="424" height="112" rx="20" fill="${palette.panel}" stroke="${palette.border}"/>
    <circle cx="${x + 72}" cy="${y + 240}" r="24" fill="${palette.cyan}"/>
    ${text('Aysel Məmmədli', x + 112, y + 230, 20, palette.text, 900)}
    ${text('Kod nümunəsini göndərdim...', x + 112, y + 260, 16, palette.muted, 600)}
    <rect x="${x + 58}" y="${y + 350}" width="284" height="64" rx="22" fill="${palette.panel2}"/>
    ${text('Salam, API route hazırdır?', x + 82, y + 390, 17, palette.text, 700)}
    <rect x="${x + 138}" y="${y + 438}" width="294" height="74" rx="22" fill="${palette.purple}"/>
    ${text('Bəli, PR linkini atıram.', x + 164, y + 482, 17, palette.text, 800)}
    <rect x="${x + 58}" y="${y + 540}" width="326" height="88" rx="22" fill="${palette.panel2}"/>
    ${text('Public chat-də də paylaşaq?', x + 82, y + 588, 17, palette.text, 700)}
    <rect x="${x + 28}" y="${y + 734}" width="424" height="170" rx="26" fill="${palette.panel}" stroke="${palette.border}"/>
    ${text('Public chat', x + 56, y + 782, 24, palette.text, 900)}
    ${text('Kod, iş və ideya paylaşımı', x + 56, y + 820, 18, palette.muted, 600)}
    <rect x="${x + 56}" y="${y + 844}" width="190" height="36" rx="18" fill="${palette.green}" opacity="0.16"/>
    ${text('Hamı üçün açıq', x + 76, y + 868, 16, palette.green, 800)}
  `;
}

function jobsScreen(x, y) {
  return `
    ${appHeader(x, y + 10, 'İş elanları')}
    <rect x="${x + 28}" y="${y + 128}" width="424" height="246" rx="24" fill="${palette.panel}" stroke="${palette.border}"/>
    ${text('Frontend Developer', x + 56, y + 178, 28, palette.text, 900)}
    ${text('Bakı / Remote · 1500-2500 AZN', x + 56, y + 216, 18, palette.muted, 700)}
    ${pill('React', x + 56, y + 242, palette.cyan, 104)}
    ${pill('TypeScript', x + 174, y + 242, palette.purple, 150)}
    <rect x="${x + 56}" y="${y + 310}" width="170" height="44" rx="22" fill="${palette.green}"/>
    ${text('Müraciət et', x + 82, y + 338, 18, palette.bg, 900)}
    <rect x="${x + 240}" y="${y + 310}" width="156" height="44" rx="22" fill="${palette.amber}" opacity="0.95"/>
    ${text('Önə çıxar', x + 266, y + 338, 18, palette.bg, 900)}
    <rect x="${x + 28}" y="${y + 420}" width="424" height="350" rx="24" fill="${palette.panel2}" stroke="${palette.border}"/>
    ${text('Müraciət forması', x + 56, y + 472, 26, palette.text, 900)}
    ${text('CV PDF', x + 56, y + 530, 18, palette.cyan, 900)}
    <rect x="${x + 56}" y="${y + 550}" width="368" height="54" rx="16" fill="${palette.bg}" stroke="${palette.border}"/>
    ${text('elsen_cv.pdf', x + 78, y + 585, 17, palette.muted, 700)}
    ${text('Telefon', x + 56, y + 642, 18, palette.cyan, 900)}
    <rect x="${x + 56}" y="${y + 662}" width="368" height="54" rx="16" fill="${palette.bg}" stroke="${palette.border}"/>
    ${text('+994 ...', x + 78, y + 696, 17, palette.muted, 700)}
  `;
}

function profileScreen(x, y) {
  return `
    ${appHeader(x, y + 10, 'Profil')}
    <circle cx="${x + 240}" cy="${y + 190}" r="72" fill="${palette.purple}"/>
    <text x="${x + 240}" y="${y + 214}" text-anchor="middle" fill="${palette.text}" font-size="62" font-weight="900" font-family="Inter, Arial">E</text>
    ${text('Elşən İbrahimov', x + 142, y + 300, 28, palette.text, 900)}
    ${text('Full Stack Developer', x + 154, y + 336, 18, palette.cyan, 800)}
    <rect x="${x + 52}" y="${y + 386}" width="112" height="88" rx="22" fill="${palette.panel}"/>
    ${text('128', x + 82, y + 426, 26, palette.text, 900)}
    ${text('İzləyici', x + 74, y + 454, 15, palette.muted, 700)}
    <rect x="${x + 184}" y="${y + 386}" width="112" height="88" rx="22" fill="${palette.panel}"/>
    ${text('42', x + 222, y + 426, 26, palette.text, 900)}
    ${text('Post', x + 226, y + 454, 15, palette.muted, 700)}
    <rect x="${x + 316}" y="${y + 386}" width="112" height="88" rx="22" fill="${palette.panel}"/>
    ${text('18', x + 354, y + 426, 26, palette.text, 900)}
    ${text('CV', x + 360, y + 454, 15, palette.muted, 700)}
    <rect x="${x + 48}" y="${y + 540}" width="384" height="58" rx="29" fill="${palette.amber}"/>
    ${text('Dəstək ol · minimum 1 AZN', x + 96, y + 577, 18, palette.bg, 900)}
    <rect x="${x + 48}" y="${y + 630}" width="384" height="180" rx="24" fill="${palette.panel}" stroke="${palette.border}"/>
    ${text('Son fəaliyyət', x + 78, y + 682, 24, palette.text, 900)}
    ${text('Yeni iş elanı paylaşdı', x + 78, y + 724, 17, palette.muted, 700)}
    ${text('React Native postunu bəyəndi', x + 78, y + 762, 17, palette.muted, 700)}
  `;
}

function safetyScreen(x, y) {
  return `
    ${appHeader(x, y + 10, 'Təhlükəsizlik')}
    <rect x="${x + 36}" y="${y + 142}" width="408" height="132" rx="26" fill="${palette.panel}" stroke="${palette.border}"/>
    ${text('+18 və illegal filter', x + 66, y + 198, 25, palette.text, 900)}
    ${text('Post, mesaj, rəy və profil yoxlanır', x + 66, y + 232, 17, palette.muted, 700)}
    <rect x="${x + 36}" y="${y + 316}" width="408" height="132" rx="26" fill="${palette.panel}" stroke="${palette.border}"/>
    ${text('Bildirişlər', x + 66, y + 372, 25, palette.text, 900)}
    ${text('Like, rəy, follow və müraciət', x + 66, y + 406, 17, palette.muted, 700)}
    <rect x="${x + 36}" y="${y + 490}" width="408" height="132" rx="26" fill="${palette.panel}" stroke="${palette.border}"/>
    ${text('Kəşf və follow', x + 66, y + 546, 25, palette.text, 900)}
    ${text('İstifadəçi və post axtarışı', x + 66, y + 580, 17, palette.muted, 700)}
    <circle cx="${x + 240}" cy="${y + 780}" r="94" fill="${palette.green}" opacity="0.16"/>
    <path d="M202 ${y + 784} L230 ${y + 812} L286 ${y + 744}" fill="none" stroke="${palette.green}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function coverScreen(x, y) {
  return `
    <rect x="${x}" y="${y}" width="480" height="1040" rx="48" fill="${palette.bg}" stroke="${palette.border}" stroke-width="2"/>
    <circle cx="${x + 240}" cy="${y + 296}" r="118" fill="${palette.purple}" opacity="0.95"/>
    <text x="${x + 240}" y="${y + 332}" text-anchor="middle" fill="${palette.text}" font-size="104" font-weight="900" font-family="Inter, Arial">D</text>
    ${text('DevFeed', x + 118, y + 500, 56, palette.text, 900)}
    ${text('Developerlər üçün sosial platforma', x + 64, y + 552, 22, palette.muted, 700)}
    <rect x="${x + 78}" y="${y + 636}" width="324" height="68" rx="34" fill="${palette.cyan}" opacity="0.16"/>
    ${text('Feed · Chat · İş · Profil', x + 120, y + 679, 20, palette.cyan, 900)}
  `;
}

function slide(title, subtitle, phoneContent, accent = palette.purple) {
  return `
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#07111f"/>
          <stop offset="0.58" stop-color="#050816"/>
          <stop offset="1" stop-color="#101827"/>
        </linearGradient>
        <clipPath id="phoneClip">
          <rect x="300" y="620" width="480" height="1040" rx="48"/>
        </clipPath>
      </defs>
      <rect width="1080" height="1920" fill="url(#bgGrad)"/>
      <rect x="64" y="72" width="180" height="54" rx="27" fill="${accent}" opacity="0.18"/>
      ${text('DevFeed', 92, 108, 24, accent, 900)}
      ${text(title, 64, 246, 62, palette.text, 900)}
      ${text(subtitle, 64, 310, 25, palette.muted, 700)}
      ${phoneShell(phoneContent, 300, 620, 480, 1040)}
    </svg>
  `;
}

function featureGraphic() {
  return `
    <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#07111f"/>
          <stop offset="0.52" stop-color="#050816"/>
          <stop offset="1" stop-color="#132033"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#fg)"/>
      <circle cx="98" cy="106" r="48" fill="${palette.purple}"/>
      <text x="98" y="123" text-anchor="middle" fill="${palette.text}" font-size="48" font-weight="900" font-family="Inter, Arial">D</text>
      ${text('DevFeed', 170, 116, 48, palette.text, 900)}
      ${text('Developer feed, chat və iş platforması', 72, 190, 26, palette.muted, 700)}
      ${pill('Sponsorlu post', 72, 240, palette.cyan, 190)}
      ${pill('CV müraciəti', 282, 240, palette.green, 178)}
      ${pill('Təhlükəsiz', 480, 240, palette.amber, 158)}
      <rect x="748" y="78" width="196" height="360" rx="38" fill="#020617" stroke="${palette.border}" stroke-width="2"/>
      <rect x="770" y="112" width="152" height="52" rx="18" fill="${palette.panel}"/>
      ${text('Feed', 798, 146, 20, palette.cyan, 900)}
      <rect x="770" y="184" width="152" height="72" rx="18" fill="${palette.panel}"/>
      ${text('Chat', 798, 226, 20, palette.purple, 900)}
      <rect x="770" y="276" width="152" height="72" rx="18" fill="${palette.panel}"/>
      ${text('İş', 798, 318, 20, palette.green, 900)}
    </svg>
  `;
}

const slides = [
  ['01-cover.png', 'DevFeed', 'Azərbaycanlı tech komunitası üçün sosial platforma', coverScreen, palette.purple],
  ['02-feed.png', 'Canlı feed', 'Kod, deploy, media və iş paylaşımları bir yerdə', feedScreen, palette.cyan],
  ['03-chat.png', 'DM və public chat', 'Komanda, dostlar və komunitə ilə rahat mesajlaşma', chatScreen, palette.purple],
  ['04-jobs.png', 'İş elanları', 'CV PDF ilə müraciət və elanları önə çıxarma modeli', jobsScreen, palette.green],
  ['05-profile.png', 'Profil və dəstək', 'İzləyici sayı, fəaliyyətlər və minimum 1 AZN dəstək', profileScreen, palette.amber],
  ['06-safety.png', 'Təhlükəsiz paylaşım', '+18 və illegal kontent üçün filter və bildirişlər', safetyScreen, palette.rose],
];

async function renderPng(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(file);
}

async function main() {
  await renderPng(path.join(imageDir, 'devfeed-feature-graphic.png'), featureGraphic());

  for (let i = 0; i < slides.length; i += 1) {
    const [fileName, title, subtitle, screen, accent] = slides[i];
    const svg = slide(title, subtitle, screen, accent);
    await renderPng(path.join(imageDir, fileName), svg);
    await renderPng(path.join(frameDir, `frame-${String(i + 1).padStart(2, '0')}.png`), svg);
  }

  const readme = [
    '# DevFeed promo assets',
    '',
    'Generated files:',
    '',
    '- `images/devfeed-feature-graphic.png` - Google Play feature graphic style image',
    '- `images/01-cover.png` ... `images/06-safety.png` - portrait store/presentation images',
    '- `video/frames/frame-01.png` ... `frame-06.png` - video slideshow frames',
    '',
    'Regenerate images:',
    '',
    '```powershell',
    'node scripts\\generate-promo-assets.js',
    '```',
    '',
    'Recreate the silent MP4 from frames when `ffmpeg` is available:',
    '',
    '```powershell',
    'ffmpeg -y -framerate 1/3 -i marketing\\video\\frames\\frame-%02d.png -vf "fps=30,format=yuv420p" marketing\\video\\devfeed-promo.mp4',
    '```',
    '',
    'Video voiceover:',
    '',
    '1. DevFeed - Azərbaycanlı developer komunitası üçün sosial platforma.',
    '2. Kod, deploy, media və iş paylaşımlarını canlı feed-də paylaş.',
    '3. DM və public chat ilə komandalar və komunitə ilə əlaqədə qal.',
    '4. İş elanlarına CV PDF ilə müraciət et, elanlarını önə çıxar.',
    '5. Profilini qur, izləyicilərini artır və dəstək qəbul et.',
    '6. Filter və bildiriş sistemi paylaşımı daha təhlükəsiz saxlayır.',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'README.md'), readme);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
