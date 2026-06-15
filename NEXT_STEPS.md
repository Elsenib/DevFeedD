# DevFeed Next Steps

**Last updated:** 2026-06-15

This file is the short working checklist. The full plan lives in `devfeed_progress.md`; handoff notes live in `HANDOFF.md`.

## Current Stage: Backend Deploy + Expo Device Test

Goal: deploy the updated backend, then run the Expo app on a phone against the live Railway API.

### P0 Checklist

- [x] Add missing AuthContext functions: `socialSignIn`, `completeOnboarding`.
- [x] Route users with empty role to `RegisterOnboarding`.
- [x] Fix `RegisterOnboarding.jsx` compile/runtime issues.
- [x] Add frontend API helpers for `POST /auth/social-login` and `PATCH /profile`.
- [x] Add Google and GitHub buttons to both login and register screens.
- [x] Keep social OAuth as a documented skeleton until real provider IDs/secrets and redirect URIs are confirmed.
- [ ] Add token persistence with a real mobile storage layer (`expo-secure-store` or AsyncStorage). Current code has only a web `localStorage` fallback.
- [ ] Implement real Google OAuth provider flow and pass provider profile into `socialSignIn`.
- [ ] Implement real GitHub OAuth provider flow and pass provider profile into `socialSignIn`.
- [x] Run web compile check with `npm.cmd run web -- --offline`.
- [ ] Manually verify login/register -> onboarding -> main against Railway backend.

## Next Stages

### P1 Feed and Posts

- [x] Build real feed composer modal in `src/screens/FeedScreen.jsx`.
- [x] Support post types: Text, Git, Deploy, Media, Job.
- [x] Wire post create to `POST /posts`.
- [x] Render typed cards in feed: Git, Deploy, Media, Job.
- [x] Wire bookmark UI to `POST /posts/:id/bookmark`.
- [x] Wire Job apply button to `POST /posts/:id/apply`.
- [x] Add post edit/delete UI.
- [x] Improve post detail/comment UI to match `DevFeed.jsx`.
- [ ] Add real media upload flow; current Media post stores title/link metadata.

### P2 Messaging and Public Chat

- [x] Finish DM detail screen and send-message flow.
- [x] Add new conversation UI by email.
- [x] Add public chat backend routes: rooms, join/leave, messages.
- [x] Add public chat screen/tab.
- [ ] Decide realtime transport: Socket.io, SSE, or polling. Current flow uses manual refresh/poll-ready REST.

### P3 Moderation and Safety

- [x] Apply existing text filter to public chat rooms/messages.
- [ ] Centralize text/image moderation.
- [ ] Expand filters to AZ/TR/RU + better false-positive handling.
- [ ] Add report/block/moderator workflow.

### P4 Monetization

- Add job boost model and UI.
- Add profile support flow with minimum 1 AZN.
- Start with manual account-number payment confirmation.

## Working Rule

After each stage, update this file and `HANDOFF.md` so another account/session can continue from the exact state.

## Backend + Expo Device Steps

- [ ] Commit/push or deploy the updated backend to Railway.
- [ ] Confirm `https://devfeed-production.up.railway.app/health`.
- [ ] Confirm new backend routes after deploy: `/chat/rooms`, `/conversations`, `/posts`.
- [ ] Start Expo for phone testing: `npx.cmd expo start --tunnel` or `npx.cmd expo start --lan`.
- [ ] Install/open Expo Go on the phone and scan the QR.
- [ ] If native dev-client is needed later: configure EAS and build an Android APK/AAB.
