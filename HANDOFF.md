# DevFeed Handoff

**Last updated:** 2026-06-16

## Where We Are

The project has a richer web-style prototype in `DevFeed.jsx`. P1 feed/post work is backend-backed, P2 DM/public chat has REST flows, the social graph pass is implemented locally, and Google/GitHub OAuth now has a backend-driven start/callback/complete flow. APK testing found several UX/runtime issues; the current passes fixed native auth persistence, long job/media composer scrolling, media upload/video playback, safe link validation, comment input focus, profile button overflow, chat invites, comment replies/@mentions, and main-screen theme/language propagation.

## Important Files

- `devfeed_progress.md` - full project plan and backlog.
- `NEXT_STEPS.md` - short active checklist.
- `App.jsx` - app auth state and navigation.
- `src/context/AuthContext.jsx` - auth context contract.
- `src/api/index.js` - frontend API helpers.
- `src/screens/LoginScreen.jsx` - login UI.
- `src/screens/RegisterScreen.jsx` - register UI.
- `src/screens/RegisterOnboarding.jsx` - onboarding UI.
- `src/screens/FeedScreen.jsx` - real feed, typed cards, composer, like/bookmark/job apply actions.
- `src/screens/PostDetailScreen.jsx` - post detail, comments, owner edit/delete.
- `src/screens/MessagesScreen.jsx` - DM list and new conversation modal.
- `src/screens/ChatScreen.jsx` - direct message detail and send-message flow.
- `src/screens/PublicChatScreen.jsx` - public chat rooms/messages tab.
- `src/screens/ExploreScreen.jsx` - user/post search and follow actions.
- `src/screens/NotificationsScreen.jsx` - notification list and read actions.
- `routes/auth.js` - backend auth routes, including email verification and Google/GitHub OAuth.
- `routes/posts.js` - post create/read/like/bookmark/comment/job apply routes.
- `routes/conversations.js` - DM conversations and messages.
- `routes/chat.js` - public chat rooms, join/leave, messages.
- `routes/profile.js` - backend profile update route.
- `routes/users.js` - user search and follow/unfollow routes.
- `routes/notifications.js` - notification read/list routes.
- `services/notifications.js` - notification insert helper.
- `src/constants/config.js` - frontend API base URL.

## Current Known Issues

- Social OAuth code is implemented, but production still needs Railway variables and provider dashboard callbacks before live testing: `PUBLIC_BACKEND_URL`, `GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- Google callback URL: `https://devfeedd-backend-production.up.railway.app/auth/oauth/callback/google`.
- GitHub callback URL: `https://devfeedd-backend-production.up.railway.app/auth/oauth/callback/github`.
- Password registration now requires email verification in production. `RESEND_API_KEY` and `EMAIL_FROM` are configured, but emails may still land in spam until domain reputation improves.
- Token persistence now uses AsyncStorage in `App.jsx`; retest APK cold start after reinstall/update.
- `API_BASE_URL` currently points to `https://devfeedd-backend-production.up.railway.app`; routes in this repo are mounted without `/api`.
- `npm.cmd run web -- --offline` compiled successfully, but full browser/user-flow testing still needs to be done.
- Media posts now support gallery image/video selection, backend upload to `/posts/media`, and `expo-av` playback in feed/post detail.
- Feed/post metadata links are validated server-side, but full link reputation scanning/warning screen is still pending.
- Job composer and job application modals now scroll on small screens.
- Comment input draft is local to avoid keyboard closing while typing; reply and @mention notifications are implemented.
- Theme/language changes now affect the main app screens: Feed, Explore, Messages, Chat, Public Chat, Notifications, and Post Detail.
- Public/group chat invites are implemented for chat rooms; invited users are added to room members and receive notifications.
- Public chat is REST/manual-refresh now; realtime transport is still pending.
- Updated OAuth backend code is not deployed until Railway receives this repo update.
- `middleware/contentFilter.js`, deleted uploaded avatar files, `server`, `android/`, `eas-inspect/`, and `scripts/` are dirty/untracked in the working tree; do not stage them blindly.

## Completed In This Pass

- Added `NEXT_STEPS.md` and `HANDOFF.md`.
- Added `socialLogin` and `updateProfile` API helpers.
- Expanded `AuthContext` with `socialSignIn` and `completeOnboarding`.
- Updated `App.jsx` to route users without a role into onboarding.
- Rebuilt login/register screens with Google and GitHub buttons.
- Rebuilt `RegisterOnboarding.jsx` as a clean React Native component.
- Added `role_sub` schema support and profile update/read support.
- Fixed frontend API base URL to use the Railway root URL without `/api`.
- Added frontend API helpers for `createPost`, `bookmarkPost`, `removeBookmark`, and `applyToJob`.
- Rebuilt `FeedScreen.jsx` around the `DevFeed.jsx` visual direction: typed composer, trending chips, typed cards, like/bookmark actions, and Job apply action.
- Verified web compile with `npm.cmd run web -- --offline`; output included `web compiled successfully`.
- Added post update/delete/comment fetch API helpers.
- Rebuilt `PostDetailScreen.jsx` with typed post details, comments, owner edit/delete.
- Added DM helpers, `ChatScreen.jsx`, and new conversation flow from `MessagesScreen.jsx`.
- Added `routes/chat.js`, public chat schema creation/default rooms in `index.js`, frontend chat helpers, and `PublicChatScreen.jsx` tab.
- Existing local Expo server on ports 8081/19006 blocked starting a second compile server; `http://localhost:19006` and `/static/js/bundle.js` returned 200.
- Added optional auth middleware so public reads can still include `liked_by_me`/`bookmarked_by_me` when logged in.
- Added follows, notifications, email verification, and activity visibility schema creation plus `migrations/003_social_notifications_email.sql`.
- Added Explore and Notifications tabs.
- Added public profile flow using `ProfileScreen` for `UserProfile`.
- Added follow/unfollow and message actions on public profiles.
- Added follower/following/post counts to profiles.
- Added profile settings shortcut and activity visibility toggle.
- Fixed real avatar rendering in feed, post detail, message list, and profile state persistence after avatar upload.
- Fixed active heart/bookmark UI and server-backed toggle counts.
- Added SafeArea header fixes for Feed, Messages, Chat, Public Chat, and Post Detail.
- Added email OTP register/verify flow in backend and register screen.
- Verified backend route syntax with `node --check`.
- Verified changed JSX files with `@babel/parser`.
- Added `expo-web-browser` and `expo-linking`.
- Added app scheme `devfeed`.
- Added backend OAuth state and one-time login session tables.
- Added `/auth/oauth/start/:provider`, `/auth/oauth/callback/:provider`, and `/auth/oauth/complete`.
- Wired `socialSignIn` to open the provider login page and complete login via the backend session.
- Added OAuth account linking by provider ID or matching email.
- Replaced web-only auth persistence with `AsyncStorage` so APK restarts keep the login session.
- Made OAuth app redirect explicit with `devfeed://oauth` and improved social login error display.
- Added `/posts/media` upload endpoint for images/videos and frontend media picker in Feed composer.
- Added backend safe URL validation for media/deploy metadata links.
- Made Deploy links visible/clickable in feed cards.
- Added vertical scroll and keyboard avoiding behavior to Feed composer and Job application modal.
- Fixed comment composer keyboard/focus behavior by moving the draft state into a local component.
- Fixed profile action button overflow for `İzləmədən çıx` on narrow phones.
- Updated promo generator and marketing images/video from `Elşən İbrahimli` to `Elşən İbrahimov`.
- Added `expo-av` for native video playback.
- Added `comments.parent_id` and `comments.reply_to_user_id` schema support.
- Added room member metadata (`invited_by`, `role`) and `/chat/rooms/:id/members`, `/chat/rooms/:id/invite`.
- Added comment reply UI, @mention parsing, and mention/reply notifications.
- Added Public Chat invite UI and member count display.
- Added DM/public chat avatar polish and DM message notifications.
- Added main-screen theme/language propagation to Feed, Explore, Messages, Chat, Public Chat, Notifications, and Post Detail.

## If Continuing In A New Session

1. Read `devfeed_progress.md`.
2. Read `NEXT_STEPS.md`.
3. Deploy/update the backend on Railway so OAuth tables/routes exist live.
4. Configure Railway OAuth variables and provider callback URLs.
5. Verify the app can move through Google/GitHub login/register -> onboarding -> main against the Railway backend.
5. Start Expo with LAN/tunnel and test on the phone.

## Last Intended Direction

Continue in this order:

1. Commit/push the OAuth update and let Railway deploy.
2. Add/check Railway OAuth variables and provider callback URLs.
3. Verify `/health`, `/auth/oauth/start/google`, and `/auth/oauth/start/github`.
4. Test Expo on phone with Google/GitHub login against the live Railway API.
5. Deploy backend so new schema/routes exist live.
6. Rebuild/reinstall APK because `expo-av` and new JS/native changes are included.
7. Retest APK restart/session, job composer scroll, media upload/video playback, comment typing/reply/@mention, profile follow button, chat invites, theme/language, and Google/GitHub OAuth.
