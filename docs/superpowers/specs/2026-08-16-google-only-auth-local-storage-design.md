# EPIX Esports — Google-Only Sign-In + Local D: Storage Design

**Date**: 2026-08-16
**Status**: Approved by user (verbal "ok")

## 1. Goal

1. Remove the UID sign-in method from the UI — Google sign-in becomes the only visible method.
2. UID entry moves to the profile page of every player (link UID to the Google account).
3. Pictures (profile avatars, team logos, player pictures) are saved as real files on the local disk D:, organized one folder per team, with all of that team's players inside a single folder.
4. Move the MongoDB data files from C: (1.8 GB free — urgent) to D:.

## 2. Constraints & Decisions (from user)

- **Keep backend, hide UI**: The UID login API (`POST /api/auth/login`) stays functional for API compatibility; only the UI form is removed.
- **Hosting model**: Backend stays on Render. Files are stored on the PC (D:) and served to Render/players through a Cloudflare Tunnel.
- **Pictures**: Both manual avatar upload AND auto-fetched in-game picture (when lookup works) are shown on the profile page.
- **DB files + pictures on D:**: MongoDB data directory moves to D:; pictures live in team folders on D:.
- **Live site**: www.epixesports.com must keep working.

## 3. Discovery: Midasbuy lookup is broken

During investigation, the Midasbuy page (`https://www.midasbuy.com/midasbuy/pk/buy/pubgm`) was redesigned into a Vite/JS app. The HTML no longer contains the JWT `eyJ...` token that `playerLookupService.ts` extracts, so `lookupViaMidasbuy` fails (`found: false`) for ALL UIDs — including real ones (verified against live backend with real UIDs from the DB: 51876514157, 51315502416).

**Design decision**: The in-game picture/name feature degrades gracefully (lookup failure → show "lookup unavailable", allow manual upload). Fixing the Midasbuy scraper is a separate effort (likely requires finding the token from one of the JS bundles or a different endpoint) and is explicitly out of scope for this design.

## 4. Storage Architecture

```
D:\epix-data\
├── db\                          ← MongoDB data files (dbPath move from C:)
└── files\                       ← served by local file server (port 8081)
    ├── avatars\<uid>.png        ← profile pictures, one per player
    └── teams\
        ├── <TeamName>\
        │   ├── logo.png
        │   └── players\
        │       ├── <player1>.png
        │       ├── <player2>.png
        │       └── ...
        └── <TeamName2>\...
```

- **MongoDB**: `mongod.cfg` dbPath changed to `D:\epix-data\db\`. Existing auth (enabled, credentials in `%LOCALAPPDATA%\epix-sync\local-app-pass.txt`) preserved. Migrate the 16 existing Atlas docs into local instance (already done once; re-verify).
- **Local file server**: small Node/Express app on the PC (port 8081) that:
  - Serves files from `D:\epix-data\files\`
  - Accepts uploads (multipart or base64) and writes them to the correct folder
  - Endpoints: upload avatar, upload team logo, upload player picture; GET static files
- **Tunnel**: Cloudflare Tunnel (`cloudflared`) — free, works behind CGNAT (confirmed: 57/58 probes failed, CGNAT). Routes:
  - `mongo.<domain>` → `localhost:27017` (MongoDB)
  - `files.<domain>` → `localhost:8081` (file server)
- **PC uptime**: PC must run 24/7. Tunnel + file server auto-start with Windows (Task Scheduler / NSSM service).

## 5. Backend Changes (Render)

1. **`.env`**: `MONGODB_URI` → points at the PC through the tunnel (mongodb://user:pass@mongo.<domain>:port with auth).
2. **Image storage**: uploads no longer stored as base64 in MongoDB. Backend proxies uploads to the local file server via the tunnel, stores only the resulting URL (`https://files.<domain>/...`) in the DB. This applies to:
   - Avatar upload (`uploadAvatar`)
   - Registration team logo + player pictures
3. **Sidecar**: Render start command runs `cloudflared` (or equivalent) alongside `dist/server.js` so the backend can reach the PC services.
4. **Auth routes**: `POST /api/auth/login` kept as-is (hidden). No route changes for Google sign-in / link-uid.

## 6. Frontend Changes

1. **SignInForm.tsx**: remove UID/password/inGameName fields — Google button only. Keep title/subtitle describing Google sign-in.
2. **AuthModal.tsx**: same — Google-only.
3. **/link-uid page**: redirect to `/profile` (or render Google-only sign-in then push to profile).
4. **Profile page**:
   - New "Link Your UID" section: input for PUBG UID → `POST /api/auth/link-uid` (existing endpoint), shows current UID + in-game name when available.
   - Avatar upload stays (now stored on D:).
   - In-game picture shown next to avatar when lookup succeeds; graceful message when lookup is unavailable.
5. **RegisterTournamentModal**: team logo + player picture uploads now go through the new storage flow (URLs saved).

## 7. Error Handling

- Tunnel down / PC offline → API returns clear errors ("storage unavailable"); site should not crash; uploads fail with a friendly message.
- Lookup failure → "In-game picture unavailable" fallback, manual upload still works.
- UID already linked → 409 "This UID is already linked to another account" (existing behavior).

## 8. Verification / Acceptance

1. Local test server against local MongoDB on D: — full auth flow (Google login, link UID, avatar upload → file appears in `D:\epix-data\files\avatars\<uid>.png`).
2. Registration with team logo + 4 player pictures → files appear under `D:\epix-data\files\teams\<TeamName>\`.
3. Live: tunnel up → Render backend reads/writes through tunnel; profile page shows UID section, avatar, in-game picture (or graceful fallback).
4. Login page shows ONLY Google button.
5. `/link-uid` no longer shows the UID form (redirect).
6. MongoDB data files confirmed on D:, not C:.

## 9. Out of Scope

- Fixing the Midasbuy scraper token extraction (separate effort).
- Migrating legacy base64 avatar data already stored in MongoDB docs (left as-is; URLs take precedence when present).
- Moving the frontend/backend off Render/Vercel.