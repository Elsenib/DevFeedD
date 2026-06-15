# DevFeed - Layihe Plani ve Inkisaf Statusu

**Son yenilenme:** 2026-06-15
**Meqsed:** Azerbaycanli tech komunitasi ucun sosial network tetbiqini Expo/React Native + Express/PostgreSQL stack-i ile tamamlanmis mehsula cevirmek.

Bu fayl `DevFeed.jsx` prototipinde olan hedefleri ve repo-da real gorunen veziyyeti eyni yere yigir. `DevFeed.jsx` daha cox "plan/prototip UI" kimi qebul olunur; `src/` ve `routes/` ise hazirda isleyen app/backend kodudur.

---

## 1. Layihe Terifi

**DevFeed** - developer, designer, devops, data, HR ve startup adamlari ucun sosial platforma:

- **Frontend:** React Native / Expo hedefli mobil app
- **Backend:** Express.js + PostgreSQL
- **Auth:** email/password, Google ile davam et, GitHub ile davam et
- **Sosial hisseler:** feed, postlar, serhler, beyenmeler, bookmark, profil, DM mesajlasma
- **Yeni hedef:** DM-den ayri public chat sistemi, moderasiya/filter, is elani boost, profilde destek ol sistemi

---

## 2. DevFeed.jsx-de Olan Hedef Prototip

### Rollar

| Rol | Alt roller |
| --- | --- |
| Developer | Frontend, Backend, Full Stack, Mobile, Embedded / IoT, Game Dev |
| Designer | UX Designer, UI Designer, Product Designer, Motion Designer, Brand Designer |
| DevOps / SRE | Cloud Engineer, SRE, Security Eng., CI/CD Specialist |
| HR / Recruiter | Recruiter, HRBP, Talent Manager |
| Product Manager | Product Manager, Scrum Master, Engineering Director |
| Telebe | Komputer Elmleri, Bootcamp, Self-taught |
| Founder / CTO | CTO, CEO/Co-founder, Indie Hacker |
| Data / ML Eng. | Data Analyst, Data Engineer, Data Scientist, ML Engineer |

### Ekranlar ve UI hisseleri

- **AuthScreen:** email/password, `GitHub ile davam et`, `Google ile davam et` duymeleri
- **OnboardingScreen:** ad, username, bio, rol, alt rol, stack secimi
- **FeedScreen:** trend tagler, post siyahisi, serh modali, yeni post modali
- **ComposeModal:** paylasim novleri: `Post/Text`, `Git`, `Deploy`, `Media`, `Is elani`
- **ExploreScreen:** istifadeci axtarisi, texnologiya filterleri, izleme duymesi
- **MessagesScreen:** DM siyahisi, yeni sohbet acmaq
- **ChatScreen:** 1:1 mesajlasma UI-si
- **NotificationsScreen:** like/comment/follow bildirisleri, hamisini oxunmus et
- **ProfileScreen:** profil melumatlari, auth provider badge, son postlar, destek ol duymesi
- **SupportModal:** minimum 1 manat destek modeli
- **SettingsScreen:** profil redaktesi, tehlukesizlik, 2FA mock, bildiris ayarlari, tema/dil

### DevFeed.jsx-de olan, amma real app-e tam kocurulmeyenler

- Explore tab real `TabNavigator`-da yoxdur.
- Compose modal ve post novleri real mobil feed-e esas axin kimi baglanib; edit/delete ve real media upload hele qalir.
- GitHub/Google social login prototipde mock-dur, real auth flow deyil.
- Support/destek modali real payment/account flow-a baglanmayib.
- Settings prototipi real `src/screens/SettingsScreen.jsx`-den daha genisdir.
- Public chat sistemi `DevFeed.jsx`-de de yoxdur; yeni teleb kimi elave olunmalidir.

---

## 3. Movcud Repo Statusu

### Backendde hazir gorunenler

- `POST /auth/register` - email/password qeydiyyat, email format/domain yoxlamasi, disposable email bloklama
- `POST /auth/login` - email/password login
- `POST /auth/social-login` - provider esasli sosial login ucun baza endpoint
- `POST /auth/oauth-callback` - Google OAuth code callback ucun endpoint
- `GET /posts`, `GET /posts/:id`
- `POST /posts` - post yaratma, text filter ile
- `PUT /posts/:id`, `DELETE /posts/:id` - post edit/delete backend route-lari
- `POST /posts/:id/like`, `DELETE /posts/:id/like`
- `POST /posts/:id/bookmark`, `DELETE /posts/:id/bookmark`
- `POST /posts/:id/comments`, `GET /posts/:id/comments`
- `POST /posts/:id/apply` - JOB postuna muraciet, avtomatik DM yaradir
- `GET /posts/:id/application-status`, `GET /posts/:id/applications`
- `GET /profile`, `GET /profile/:id`, `PATCH /profile`
- `POST /profile/avatar` - avatar upload + fayl/image yoxlamasi
- `GET /conversations`, `GET /conversations/:id`, `POST /conversations`, `POST /conversations/:id/messages`
- `middleware/contentFilter.js` - illegal sozler, bad-words, avatar image metadata ve sadelesdirilmis NSFW skin-tone yoxlamasi

### Database-de hazir gorunenler

- `users`, `posts`, `comments`, `post_likes`
- `post_bookmarks`
- `conversations`, `messages`
- `job_applications`
- `migrations/002_extend_posts_and_users.sql` icinde `chat_rooms`, `room_members`, `chat_messages` cedvelleri var, amma hazir `index.js` schema yaratmasinda ve route-larda public chat hele islek deyil.

### Frontendde hazir gorunenler

- `App.jsx` auth context ile login/register/main navigation qurur.
- `FeedScreen.jsx` backendden postlari oxuyur, typed card-lar gosterir, post yaradir, like/bookmark ve JOB apply action-larini cagirir.
- `PostDetailScreen.jsx` post detail, comment fetch/add, like, sahib ucun edit/delete API-larini cagirir.
- `MessagesScreen.jsx` conversation siyahisini oxuyur, email ile yeni DM acir.
- `ChatScreen.jsx` DM mesajlarini oxuyur ve mesaj gonderir.
- `PublicChatScreen.jsx` public chat otaqlari ve mesajlarini oxuyur/yazir.
- `ProfileScreen.jsx` profil melumatlarini oxuyur.
- `SettingsScreen.jsx` esas logout/tema/info kartlari var.

### Frontendde problemli/qalan hisseler

- Social login duymeleri context-e baglidir, amma real OAuth provider profile alma flow-u hele tamamlanmayib.
- `RegisterOnboarding.jsx` app navigation-a qosulub; role olmayan user onboarding-e gedir.
- Token persistence real deyil: `App.jsx` launch zamani token restore etmir.
- Real mobil UI `DevFeed.jsx` prototipindeki zengin feed/profile/settings/chat strukturuna hele catmayib.
- Google/GitHub duymeleri login ve register ekranlarinda var; OAuth redirect/client ID hissesi qalib.

---

## 4. Hazirda Qalan Isler

### P0 - bloklayan isler

| Is | Status | Qeyd |
| --- | --- | --- |
| `socialSignIn`-i AuthContext/App.jsx-e elave etmek | PARTIAL | Context ve UI var; real OAuth provider flow qalib |
| `completeOnboarding`-i AuthContext/App.jsx-e elave etmek | DONE | `PATCH /profile` ile profil tamamlanir |
| RegisterOnboarding-i real navigation flow-a qosmaq | DONE | Role olmayan user onboarding-e gedir |
| Token persistence | PARTIAL | Web `localStorage` fallback var; mobile SecureStore/AsyncStorage qalib |
| Google OAuth mobile/web flow-un tam test edilmesi | TODO | Client ID, redirect URI, backend callback |
| GitHub OAuth flow-un elave edilmesi | TODO | GitHub app ID/secret, callback, provider mapping |

### P1 - Feed ve post sistemi

| Is | Status | Qeyd |
| --- | --- | --- |
| DevFeed.jsx-deki ComposeModal-i real RN screen/modal kimi qurmaq | DONE | Text, Git, Deploy, Media, Is elani modalda secilir |
| Post novlerini backend metadata ile tam isletmek | PARTIAL | Git/Deploy/Media/Job metadata yazilir; real media upload qalib |
| Feed-de post type kartlarini gostermek | DONE | Git/Deploy/Media/Job kartlari real feed-de render olunur |
| Post yaratma UI + API inteqrasiyasi | DONE | `POST /posts` frontendden cagrilir |
| Post edit/delete UI | DONE | `PostDetailScreen.jsx` sahib ucun `PUT/DELETE /posts/:id` cagirir |
| Bookmark UI/API inteqrasiyasi | DONE | Feed kartinda bookmark API cagrilir |
| Serh UI-ni daha yaxsi etmek | DONE | Detail ekraninda comment fetch/add yeni UI ile baglandi |

### P2 - Mesajlasma ve public chat

| Is | Status | Qeyd |
| --- | --- | --- |
| DM chat detail ekranini real app-e elave etmek | DONE | `ChatScreen.jsx` conversation detail oxuyur |
| Yeni conversation yaratma UI | DONE | `MessagesScreen.jsx` email ile sohbet acir |
| Mesaj gonderme UI + API client | DONE | `POST /conversations/:id/messages` cagrilir |
| Public chat sistemi | DONE | DM-den ayri `PublicChatScreen.jsx` tab-i var |
| Chat room-lar | DONE | `routes/chat.js`, schema ve default otaqlar elave edildi |
| Real-time yenilenme | TODO | Hazirda REST/manual refresh; Socket.io/SSE/polling secilecek |
| Kod snippet/file/link paylasimi qaydalari | PARTIAL | Text/link mesaj kimi gedir; format/limit/code block polish qalib |

### P3 - Tehlukesizlik ve moderasiya

| Is | Status | Qeyd |
| --- | --- | --- |
| Post, comment, DM, public chat filteri | PARTIAL | Baza filter var, genislenmelidir |
| +18/NSFW text filter | PARTIAL | Ingilisce keyword var, AZ/TR/RU genislenmelidir |
| Illegal content filter | PARTIAL | Baza siyahi var, kontekst ve false-positive islenmelidir |
| Profil adi, username, bio filteri | PARTIAL | `PATCH /profile` ad/bio yoxlayir; username flow yoxdur |
| Profil sekli filteri | PARTIAL | metadata + sade NSFW yoxlamasi var; daha guclu moderasiya lazimdir |
| Media upload filteri | TODO | Avatar xaric media upload ucun lazimdir |
| Report/block/moderator panel | TODO | Manual yoxlama ve ban/mute ucun |
| Audit log | TODO | Bloklanan content ve moderator action-lari saxlanmalidir |

### P4 - Monetizasiya

| Is | Status | Qeyd |
| --- | --- | --- |
| Is elanlarini odenisle ireli cekmek | TODO | Boost paketi, muddet, siralama prioriteti |
| Boost payment/order modeli | TODO | `job_boosts` ve ya `payments` cedveli lazimdir |
| Hesab nomresi ile manual odenis tesdiqi | TODO | Admin/env-de hesab nomresi; reference/qebz flow-u |
| Profilde "Destek ol" | TODO | DevFeed.jsx-de mock SupportModal var |
| Minimum 1 manat destek | TODO | 1 AZN minimum validation |
| Destek odenisi hesab nomresi ile | TODO | Hesab nomresi gosterilecek, odenis manual tesdiqlenecek |
| Destek tarixcesi | TODO | Kim, kime, mebleg, status |

### P5 - Kesf, bildiris, ayarlar, polish

| Is | Status | Qeyd |
| --- | --- | --- |
| Explore/Kesf et tab-i | TODO | DevFeed.jsx-de var, real TabNavigator-da yoxdur |
| Axtaris ve filter | TODO | User/post/tag search backend + UI |
| Notifications sistemi | PARTIAL | DevFeed.jsx mock; backend real deyil |
| Dark/light/system theme | PARTIAL | Settings mock/prototip var, real app-de sade |
| Dil secimi | TODO | i18n strukturu lazimdir |
| Offline mode | TODO | AsyncStorage queue/cache |
| Deployment hazirligi | TODO | env, migrations, EAS/backend hosting |
| Testler | TODO | Auth, posts, filter, messaging, payment flow |

---

## 5. Yeni Telebler Plana Elave Edildi

1. Qeydiyyat ve login ekranlarinda **Google ile davam et** ve **GitHub ile davam et** olacaq.
2. Evvel alinmis OAuth ID/secret-ler `.env` ve app config-e duzgun qosulacaq.
3. **DM mesajlasma** ve **public chat** ayri sistemler olacaq.
4. Public chat-de hami gire bilecek, kod, is, link ve fikir paylasa bilecek.
5. Mesajlarda, postlarda, serhlerde, public chat-de, profil adinda/bio-da ve profil sekillerinde +18 ve illegal content filter olacaq.
6. Paylasim novleri islek olacaq: Text/Post, Git, Deploy, Media, Is elani.
7. Is elanlarini odenisle ireli cekmek olacaq.
8. Profillerde **Destek ol** olacaq.
9. Istifadeci en az **1 manat / 1 AZN** destek ede bilecek.
10. Destek ve boost odenisleri hesab nomresi yerlesdirilerek manual tesdiq modeli ile baslayacaq.

---

## 6. Lazim Olan Yeni Backend/API Isleri

### Auth

- `POST /auth/social-login` frontend API client-e elave edilsin.
- Google OAuth redirect flow mobile/web ucun tamamlanib test edilsin.
- GitHub OAuth endpoint/callback elave edilsin.
- Provider account merge qaydasi: eyni email varsa eyni user-e baglansin.

### Public chat

- `GET /chat/rooms`
- `POST /chat/rooms`
- `GET /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/messages`
- `POST /chat/rooms/:id/join`
- `POST /chat/rooms/:id/leave`
- Mesajlarda filter + rate limit

### Moderasiya

- Merkezi `moderateText({ type, text, userId })`
- Merkezi `moderateImage({ type, file, userId })`
- `moderation_logs` cedveli
- Report endpointleri: post/comment/message/profile ucun

### Odenis/destek

- `support_payments` cedveli: supporter, receiver, amount, status, reference
- `job_boosts` cedveli: post_id, amount, starts_at, expires_at, status
- Admin/manual tesdiq endpointleri
- Public config: hesab nomresi/IBAN/kart melumati server env/admin ayarindan gelsin

---

## 7. Melum Problemler

- Google/GitHub duymeleri UI-da var, amma real OAuth provider redirect/profile alma flow-u hele tamamlanmayib.
- Token persistence web `localStorage` fallback ile mehduddur; mobile ucun SecureStore/AsyncStorage lazimdir.
- Media postlari hele fayl upload etmir; title/link metadata kimi saxlanir.
- Public chat ve DM hazirda REST/manual refresh ile isleyir; realtime Socket.io/SSE/polling hele secilmeyib.
- `migrations/001_initial.sql` ve `002_extend_posts_and_users.sql` schema tiplerinde ferqler var (`skills` JSONB vs TEXT[]); netlesdirilmelidir.
- `DevFeed.jsx` web/prototip JSX-dir, real mobil RN komponentlerine birbasa kopyalanmamalidir; dizayn ve logic RN-e uygun kocurulmelidir.
- OAuth credentials, `DATABASE_URL`, `JWT_SECRET`, Google/GitHub ID/secret `.env`-de tam olmalidir.

---

## 8. Qisa Cavab: Plandan Ne Qalib?

En vacib qalanlar:

- Social login-i real islek etmek: Google + GitHub.
- Token persistence-i duzeltmek.
- `DevFeed.jsx`-deki qalan UI-lari real `src/` ekranlarina kocurmek.
- Media upload, realtime chat ve code block/link preview polish-i tamamlamaq.
- DM/public chat ucun realtime yenilenme ve notification flow-u qurmaq.
- Moderasiya/filter sistemini butun content novlerine yaymaq.
- Avatar upload/display UI-ni tamamlamaq.
- Is elani boost ve profilde destek ol/payment flow-u qurmaq.
- Search/Explore, notifications, theme/dil/offline/deployment/test islerini tamamlamaq.

---

## 9. Development Qeydleri

Backend:

```bash
npm install
npm run dev
```

Vacib env deyisenleri:

```bash
DATABASE_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID_WEB=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SUPPORT_ACCOUNT_NUMBER=
```

---

**Sorumluluk:** DevFeed plan fayli - `DevFeed.jsx` prototipi ve repo auditine gore yenilendi.
