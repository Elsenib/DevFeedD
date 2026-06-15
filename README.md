# DevFeed - Social Media App

Production-ready DevFeed backend and Expo mobile frontend.

## Architecture

- **Backend**: Node.js + Express, PostgreSQL (Railway)
- **Frontend**: Expo (React Native), targets Android/iOS
- **Auth**: JWT-based with bcrypt password hashing
- **API**: RESTful endpoints for posts, comments, messages, profiles

## Directories

- `routes/`, `index.js`, `db.js` - Express backend with PostgreSQL
- `src/` - Expo mobile app source (React Native)
- `app.json`, `App.jsx` - Expo configuration and entry point

## Local Setup

### Backend

1. Create/update `.env` in the project root and fill in:
   - `DATABASE_URL` from Railway PostgreSQL
   - Generate strong `JWT_SECRET` (e.g., `openssl rand -hex 32`)

2. Install and run:
   ```bash
   npm.cmd install
   npm.cmd run dev
   ```

Server listens on `http://localhost:4000` and has a `/health` endpoint.

### Mobile App

1. Install Expo CLI:
   ```bash
   npm install -g expo-cli
   ```

2. Set up dependencies:
   ```bash
   npm.cmd install
   ```

3. Update `src/constants/config.js` to point to your backend:
   ```javascript
   export const API_BASE_URL = 'http://localhost:4000'; // or deployed Railway URL
   ```

4. Start Expo:
   ```bash
   npm.cmd run web
   ```

Use tunnel mode for testing on physical devices:
```bash
npx.cmd expo start --tunnel
```

## Production Deployment

### Backend (Railway)

1. Push code to GitHub
2. Connect GitHub repo to Railway via dashboard
3. Set environment variables in Railway:
   - `DATABASE_URL` (auto-generated for Railway PostgreSQL)
   - `JWT_SECRET` (strong random string)
   - `NODE_ENV=production`
   - `PGSSLMODE=require`
4. Railway auto-deploys on push to main/master

### Mobile App (EAS)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. Update `API_BASE_URL` in `src/constants/config.js` to deployed Railway URL

3. Build and submit:
   ```bash
   eas build -p android --profile production
   eas submit -p android --latest
   ```

## Environment Variables

See `.env.example` and `server/.env.example` for required variables.

## API Endpoints

- `POST /auth/register` - Register user
- `POST /auth/login` - Login (returns JWT token)
- `GET /posts` - List all posts
- `POST /posts/:id/comments` - Add comment
- `POST /posts/:id/like` - Toggle like
- `GET /profile` - Get current user profile
- `GET /conversations` - List conversations
- `GET /conversations/:id` - Conversation detail
- `POST /conversations/:id/messages` - Send DM
- `GET /chat/rooms` - Public chat rooms
- `POST /chat/rooms/:id/messages` - Send public chat message
- `GET /health` - Health check

## Database

The root `index.js` creates/extends the required schema on startup. SQL migration files also live in `migrations/`.

---

For questions or issues, check logs in Railway dashboard or run locally with `npm run dev`.
