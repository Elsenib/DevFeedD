# DevFeed — Layihə Planı və İnkişaf Statusu

**Tarix:** 2026-06-14  
**Məqsəd:** Azərbaycanlı tech komunitası üçün sosyal network tətbiqinin (Expo + Express/Postgres) tam ətraflı inkişaf və dəstəyi.

---

## 1. Layihə Tərifi

**DevFeed** — tech peşəkarları üçün sosyal network:
- **Frontend:** Expo (React Native) — iOS/Android/Web
- **Backend:** Express.js + PostgreSQL
- **Authentifikasiya:** Google OAuth 2.0 + email/password
- **Sosial Xüsusiyyətlər:** Feed, Posts, Direct Messaging, User Profiles

---

## 2. Rollar və Istifadəçi Tipləri

Tətbiqin dəstəklədiyi rollar (DevFeed.jsx-dən):

| Rol | Üzrə Rol | Istifadə |
|-----|----------|---------|
| **Developer** | Frontend, Backend, Full-Stack, Mobile, Embedded, Game | Kod bölüşəcəkləri, texniki sualları |
| **Designer** | UX, UI, Product, Motion, Brand | UI/UX fikirlərini bölüşmə |
| **DevOps / SRE** | Cloud, SRE, Security, CI/CD | İnfrastruktur sualları |
| **HR / Recruiter** | Recruiter, HRBP, Talent Manager | İstedad axtarışı |
| **Product Manager** | PM, Scrum, Engineering Director | Roadmap diskussiyası |
| **Student** | CS, Bootcamp, Self-taught | Öyrənmə, mentorluq istəyi |
| **Founder / CTO** | CTO, CEO, Indie Hacker | Startup fikirlərini bölüşmə |
| **Data / ML** | Analyst, Engineer, Scientist, ML Eng. | Data proyektləri |

---

## 3. Texniki Stack

**Frontend:**
- React Native + Expo SDK 49
- React Navigation (Tab Navigator)
- AsyncStorage / expo-secure-store (token persistance)
- axios (API client)

**Backend:**
- Express.js
- PostgreSQL (users, posts, conversations, avatars)
- JWT authentication
- Middleware: auth, contentFilter

**Deployiment:**
- EAS (Expo Application Services) — build və tunnel
- Server hosting (TBD — Heroku/DigitalOcean/AWS)

---

## 4. Hazırda Tamamlanan Xüsusiyyətlər

✅ **Authentication:**
- Email/password login/signup
- Google OAuth yönləndirmə
- Token persistance (localStorage/AsyncStorage)
- Profile restoration on app launch

✅ **Navigation:**
- Login → RegisterOnboarding → Main (Tab)
- Tab Navigator: Feed, Messages, Profile
- Role/skill selection ekranı (RegisterOnboarding)

✅ **Backend Routes:**
- `POST /auth/login` — email/password
- `POST /auth/register` — user yaradılması
- `POST /auth/social-login` — Google OAuth
- `GET /posts` — feed
- `POST /posts` — post yaratma
- `GET /profile` — istifadəçi profili
- `POST /conversations` — chat

✅ **Database Schema:**
- users (id, email, password, googleId, name, role, onboardingPending)
- posts (id, userId, content, likes, comments)
- conversations (id, participants, messages)
- uploads/avatars (user avatarları)

---

## 5. Hazırda İş Görülən Xüsusiyyətlər

🔄 **Social Login Flow:**
- Google popup əvvəlcə dəstəklənir, şəhsən user sign-in düzəldilir
- Token + user data localStorage-a saved
- RegisterOnboarding-ə yönləndirmə OK, ancaq bəzi edge-case-lər düzəldiliyor

🔄 **Avatar Upload:**
- `server/uploads/avatars/` — bəzi fayllar itib
- Placeholder-lar yaradıldı, real fayllar yenidən yüklənəcək

---

## 6. ToDo / Əsas Prioritetlər

| # | Tapşırıq | Status | Müddət | Səbəb |
|----|----------|--------|--------|------|
| 1 | Google OAuth Android/iOS test | TODO | 2-3 saat | Mobile-də redirect URI ayarı |
| 2 | Avatar upload/display sistem | TODO | 1-2 saat | File management |
| 3 | Direct messaging UI tamamla | TODO | 3 saat | Chat screen component-ləri |
| 4 | Post editing/deletion | TODO | 1 saat | Backend route + UI |
| 5 | Search functionality | TODO | 2 saat | Full-text search backend |
| 6 | Notifications system | TODO | 3-4 saat | Real-time (socket.io?) |
| 7 | Dark mode | TODO | 1 saat | Theme context |
| 8 | Offline mode | TODO | 2 saat | AsyncStorage queue |

---

## 7. Məlum Problemlər

⚠️ **Google OAuth Web:**
- `http://localhost:19006` redirect URI Google Console-da qeydə alınmalıdır
- Web bundle-də COOP/COEP uyarıları görünə biləri

⚠️ **Avatar faylları:**
- `server/uploads/avatars/` içində placeholder-lar var
- Real avatar sistemi kurulması tələb olunur

⚠️ **Backend environment:**
- `.env` faylı tamamlanmalıdır (DATABASE_URL, JWT_SECRET, Google OAuth credentials)

---

## 8. Development Əmrlər

```bash
# Frontend
cd /path/to/DevFeed
npm install
npm run dev                  # Expo Metro
npm run web                  # Web version
npm run android              # Android build

# Backend
cd server
npm install
npm run dev                  # nodemon

# Database
npm run migrations            # SQL migrations
npm run seed                  # Test data
```

---

## 9. Git Workflow

```bash
git add .
git commit -m "feat: [feature name] - [qısa açıqlama]"
git push origin [branch-name]
```

---

## 10. Qeydlər və Sonrakı Görüşmələr

- 🎯 **1. həftə:** Social login + avatarlar tamamlama
- 🎯 **2. həftə:** Messaging, notifications
- 🎯 **3. həftə:** Search, advanced filtering
- 🎯 **4. həftə:** Polish, testing, deployment

---

**Son yenilənmə:** 2026-06-14  
**Sorumluluk:** [Tələbdən asılı]

