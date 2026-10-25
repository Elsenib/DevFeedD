const express = require('express');

const router = express.Router();

const APP_NAME = 'DevFeed';
const UPDATED_AT = '26.10.2026';

function contactEmail() {
  return process.env.SUPPORT_EMAIL || '';
}

function page(title, body) {
  return `<!doctype html>
<html lang="az">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — ${APP_NAME}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; line-height: 1.6; color: #e6edf3; background: #0d1117; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.15rem; margin-top: 1.8em; }
  a { color: #58a6ff; } li { margin: 4px 0; } .muted { color: #8b949e; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function contactLine() {
  const email = contactEmail();
  return email
    ? `<a href="mailto:${email}">${email}</a>`
    : 'tətbiqdəki Parametrlər bölməsi';
}

router.get('/privacy', (req, res) => {
  res.type('html').send(page('Məxfilik siyasəti', `
<h1>${APP_NAME} — Məxfilik siyasəti</h1>
<p class="muted">Son yenilənmə: ${UPDATED_AT}</p>
<p>Bu sənəd ${APP_NAME} mobil tətbiqinin hansı məlumatları topladığını, necə istifadə etdiyini və sizin hüquqlarınızı izah edir.</p>

<h2>1. Topladığımız məlumatlar</h2>
<ul>
  <li><b>Hesab məlumatları:</b> ad, e-poçt ünvanı, şifrə (yalnız şifrələnmiş hash kimi saxlanılır). Google ilə daxil olduqda Google hesabınızın adı, e-poçtu və profil şəkli.</li>
  <li><b>Profil məlumatları:</b> rol, bacarıqlar, dillər, bio, vebsayt, profil şəkli — bunları özünüz daxil edirsiniz.</li>
  <li><b>Paylaşdığınız məzmun:</b> postlar, şərhlər, şəkil/video faylları, bəyənmələr, izləmələr.</li>
  <li><b>Mesajlar:</b> şəxsi yazışmalar və ümumi söhbət otaqlarındakı mesajlar.</li>
  <li><b>İş müraciətləri:</b> müraciət etdiyiniz zaman telefon nömrəniz, CV faylınız və müşayiət məktubunuz elanı paylaşan şəxsə göndərilir.</li>
  <li><b>Texniki məlumatlar:</b> serverə sorğu zamanı IP ünvanı (təhlükəsizlik və sui-istifadənin qarşısını almaq üçün).</li>
</ul>

<h2>2. Məlumatlardan necə istifadə edirik</h2>
<ul>
  <li>Hesabınızı yaratmaq və daxil olmanızı təmin etmək;</li>
  <li>Lent, mesajlaşma, bildiriş və iş müraciəti funksiyalarını işlətmək;</li>
  <li>E-poçt təsdiqi kodu göndərmək;</li>
  <li>Spam, sui-istifadə və qaydalara zidd məzmunla mübarizə aparmaq.</li>
</ul>
<p>Məlumatlarınızı satmırıq və reklam məqsədilə üçüncü tərəflərə vermirik.</p>

<h2>3. Kimlər görə bilər</h2>
<ul>
  <li>Postlarınız, şərhləriniz və profiliniz digər istifadəçilərə görünür.</li>
  <li>Şəxsi mesajları yalnız yazışmanın tərəfləri görür.</li>
  <li>İş müraciətinizi yalnız elanı paylaşan şəxs görür.</li>
</ul>

<h2>4. Xidmət təminatçıları</h2>
<ul>
  <li><b>Railway</b> — server və verilənlər bazası hostinqi;</li>
  <li><b>Google</b> — "Google ilə daxil ol" funksiyası;</li>
  <li><b>Resend</b> — təsdiq e-poçtlarının göndərilməsi.</li>
</ul>

<h2>5. Təhlükəsizlik</h2>
<p>Məlumatlar HTTPS ilə ötürülür, şifrələr bcrypt ilə hash edilir. Heç bir sistem 100% təhlükəsiz deyil, lakin məlumatlarınızı qorumaq üçün ağlabatan tədbirlər görürük.</p>

<h2>6. Saxlama müddəti və silinmə</h2>
<p>Məlumatlarınız hesabınız aktiv olduğu müddətdə saxlanılır. Hesabınızı silsəniz, profiliniz, postlarınız, şərhləriniz, mesajlarınız və müraciətləriniz dərhal və birdəfəlik silinir. Ətraflı: <a href="/account-deletion">hesabın silinməsi</a>.</p>

<h2>7. Uşaqlar</h2>
<p>${APP_NAME} 13 yaşdan kiçik uşaqlar üçün nəzərdə tutulmayıb və onlardan bilərəkdən məlumat toplamırıq.</p>

<h2>8. Məzmun qaydaları</h2>
<p>Təhqiramiz, nifrət, zorakılıq, cinsi, fırıldaqçılıq və spam məzmunu qadağandır. İstənilən post, şərh, mesaj və ya istifadəçi barədə tətbiqdən şikayət edə və istifadəçini bloklaya bilərsiniz. Qaydaları pozan məzmun silinir, hesablar bloklana bilər.</p>

<h2>9. Əlaqə</h2>
<p>Suallarınız üçün: ${contactLine()}</p>
`));
});

router.get('/account-deletion', (req, res) => {
  res.type('html').send(page('Hesabın silinməsi', `
<h1>${APP_NAME} — Hesabın silinməsi</h1>
<h2>Tətbiqdən silmək</h2>
<ol>
  <li>${APP_NAME} tətbiqini açın və hesabınıza daxil olun.</li>
  <li><b>Profil → Parametrlər</b> bölməsinə keçin.</li>
  <li><b>Hesabı sil</b> düyməsini basın və təsdiqləyin.</li>
</ol>
<h2>Tətbiqə daxil ola bilmirsinizsə</h2>
<p>Qeydiyyatdan keçdiyiniz e-poçt ünvanından ${contactLine()} ünvanına "Hesabın silinməsi" mövzusunda yazın. Sorğunuz 7 gün ərzində icra olunacaq.</p>
<h2>Nələr silinir</h2>
<p>Profiliniz, e-poçtunuz, postlarınız, şərhləriniz, bəyənmələriniz, mesajlarınız, iş müraciətləriniz və bildirişləriniz birdəfəlik silinir. Heç bir məlumat saxlanılmır.</p>
`));
});

module.exports = router;
