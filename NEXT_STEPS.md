# DevFeed Next Steps

**Last updated:** 2026-06-16

This file is the short working checklist. The full plan lives in `devfeed_progress.md`; handoff notes live in `HANDOFF.md`.

## Current Stage: OAuth Deploy Test

Goal: deploy the Google/GitHub OAuth update, configure provider callback URLs on Railway/Google/GitHub, then test login/register on the phone.

### P0 Checklist

- [x] Add missing AuthContext functions: `socialSignIn`, `completeOnboarding`.
- [x] Route users with empty role to `RegisterOnboarding`.
- [x] Fix `RegisterOnboarding.jsx` compile/runtime issues.
- [x] Add frontend API helpers for `POST /auth/social-login` and `PATCH /profile`.
- [x] Add Google and GitHub buttons to both login and register screens.
- [x] Replace social OAuth skeleton with backend-driven Google/GitHub OAuth start/callback/complete flow.
- [ ] Add token persistence with a real mobile storage layer (`expo-secure-store` or AsyncStorage). Current code has only a web `localStorage` fallback.
- [x] Implement real Google OAuth provider flow and pass provider profile into `socialSignIn`.
- [x] Implement real GitHub OAuth provider flow and pass provider profile into `socialSignIn`.
- [x] Add email verification code flow for password registration.
- [x] Configure production email sending on Railway: `RESEND_API_KEY`, `EMAIL_FROM`.
- [x] Run web compile check with `npm.cmd run web -- --offline`.
- [ ] Manually verify login/register -> onboarding -> main against Railway backend.
- [ ] Configure Railway OAuth variables: `PUBLIC_BACKEND_URL`, `GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- [ ] Add provider callback URLs:
  - Google: `https://devfeedd-backend-production.up.railway.app/auth/oauth/callback/google`
  - GitHub: `https://devfeedd-backend-production.up.railway.app/auth/oauth/callback/github`

## Next Stages

### P1 Feed and Posts

- [x] Build real feed composer modal in `src/screens/FeedScreen.jsx`.
- [x] Support post types: Text, Git, Deploy, Media, Job.
- [x] Wire post create to `POST /posts`.
- [x] Render typed cards in feed: Git, Deploy, Media, Job.
- [x] Wire bookmark UI to `POST /posts/:id/bookmark`.
- [x] Show active like/save state from backend (`liked_by_me`, `bookmarked_by_me`).
- [x] Render real author/profile avatar in feed and post detail.
- [x] Wire Job apply button to `POST /posts/:id/apply`.
- [x] Add post edit/delete UI.
- [x] Improve post detail/comment UI to match `DevFeed.jsx`.
- [ ] Add real media upload flow; current Media post stores title/link metadata.

### P2 Messaging and Public Chat

- [x] Finish DM detail screen and send-message flow.
- [x] Add new conversation UI by email.
- [x] Add public chat backend routes: rooms, join/leave, messages.
- [x] Add public chat screen/tab.
- [x] Add SafeArea header fix for Feed, Messages, Chat, Public Chat, Post Detail.
- [ ] Decide realtime transport: Socket.io, SSE, or polling. Current flow uses manual refresh/poll-ready REST.

### P3 Moderation and Safety

- [x] Apply existing text filter to public chat rooms/messages.
- [x] Add notification records for like, comment, bookmark, follow, message, and job apply.
- [ ] Centralize text/image moderation.
- [ ] Expand filters to AZ/TR/RU + better false-positive handling.
- [ ] Add report/block/moderator workflow.

### P4 Monetization

- Add job boost model and UI.
- [x] Add profile support flow with minimum 1 AZN.
- [x] Start with manual account-number payment confirmation.

### P5 Explore, Profile, Notifications

- [x] Add Explore tab with user/post search.
- [x] Add follow/unfollow backend and UI.
- [x] Show followers/following counts on profile.
- [x] Add public profile view with follow/message actions.
- [x] Add Notifications tab and read/read-all actions.
- [x] Add Settings privacy toggle for profile activity visibility.
- [x] Add settings shortcut button in profile header.

## Working Rule

After each stage, update this file and `HANDOFF.md` so another account/session can continue from the exact state.

## Backend + Expo Device Steps

- [ ] Commit/push or deploy the updated backend to Railway.
- [ ] Confirm `https://devfeedd-backend-production.up.railway.app/health`.
- [ ] Confirm new backend routes after deploy: `/chat/rooms`, `/conversations`, `/posts`.
- [ ] Confirm new backend routes after deploy: `/users/search`, `/notifications`, `/profile/:id`, `/posts/search`.
- [ ] Confirm OAuth start routes after deploy: `/auth/oauth/start/google`, `/auth/oauth/start/github`.
- [ ] Start Expo for phone testing: `npx.cmd expo start --tunnel` or `npx.cmd expo start --lan`.
- [ ] Install/open Expo Go on the phone and scan the QR.
- [ ] If native dev-client is needed later: configure EAS and build an Android APK/AAB.
