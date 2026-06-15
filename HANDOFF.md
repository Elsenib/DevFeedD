# DevFeed Handoff

**Last updated:** 2026-06-15

## Where We Are

The project has a richer web-style prototype in `DevFeed.jsx`. P0 auth/onboarding foundation is partially implemented. P1 feed/post work is now backend-backed, and P2 DM/public chat has real REST flows. The next big step is deploying the updated backend to Railway and testing the Expo app on a physical phone.

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
- `routes/auth.js` - backend auth routes.
- `routes/posts.js` - post create/read/like/bookmark/comment/job apply routes.
- `routes/conversations.js` - DM conversations and messages.
- `routes/chat.js` - public chat rooms, join/leave, messages.
- `routes/profile.js` - backend profile update route.
- `src/constants/config.js` - frontend API base URL.

## Current Known Issues

- Social OAuth is not fully real yet. Frontend has Google/GitHub buttons and `socialSignIn`, but provider OAuth profile acquisition still needs to be implemented.
- Token persistence still needs a real mobile storage dependency such as `expo-secure-store` or AsyncStorage. `App.jsx` currently has only a web `localStorage` fallback.
- `API_BASE_URL` currently points to `https://devfeed-production.up.railway.app`; routes in this repo are mounted without `/api`.
- `npm.cmd run web -- --offline` compiled successfully, but full browser/user-flow testing still needs to be done.
- Media posts currently store title/link metadata only; real file upload is still pending.
- Public chat is REST/manual-refresh now; realtime transport is still pending.
- Updated backend code is not deployed until Railway receives this repo update.

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

## If Continuing In A New Session

1. Read `devfeed_progress.md`.
2. Read `NEXT_STEPS.md`.
3. Deploy/update the backend on Railway so `/chat/*` and the new schema exist live.
4. Verify the app can move through login/register -> onboarding -> main against the Railway backend.
5. Start Expo with LAN/tunnel and test on the phone.

## Last Intended Direction

Continue in this order:

1. Deploy backend update to Railway and verify `/health` plus `/chat/rooms`.
2. Test Expo on phone with the live Railway API.
3. Add token persistence for native mobile.
4. Real Google/GitHub OAuth.
5. Media upload, realtime chat, job boost, and support payments.
