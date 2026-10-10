# Production Desk (Hidden Add-Team Portal) — Design

**Date:** 2026-10-10
**Status:** Approved
**Reference:** team4hm.com/production (login + add-team.php + roster ZIP export)

## Goal

Two hidden pages on the EPIX site, reachable only by direct link (never listed in navigation, footer, or sitemap):

1. `/production` — Production Desk login (separate crew credentials)
2. `/production/add-team?id=<tournamentId>` — manually add teams (name, logo, player photos + UIDs) to a **separate** production list, and download the list as a ZIP

Teams added here are **not** registrations. They never appear in the admin panel registrations, never affect tournament slots, and are never shown on public tournament pages.

## Auth

- Backend env vars: `PRODUCTION_USERNAME`, `PRODUCTION_PASSWORD` (plain text, set per deployment; values chosen by site owner)
- `POST /api/production/login` → verifies credentials → returns JWT `{ uid: "production", role: "production" }` with 24h expiry (same JWT secret/signing as existing auth)
- New middleware `requireProduction` on all `/api/production/*` routes except login
- Frontend stores the token in `sessionStorage` under `production_token` (independent of `epix_session_user` and `admin_token`; `apiClient` must NOT auto-attach it — production calls use their own fetch wrapper or explicit headers)
- 401 from any production API → redirect back to `/production` login
- Wrong credentials → inline error on the login form

## Pages

### `/production` (login)

- Standalone page: centered card on a plain dark background, **no** PageShell/HeroSection/nav (matches team4hm's isolated portal look)
- Fields: username, password; submit button "Sign In to Production Workspace"
- On success → `router.push("/production/add-team")`
- Not linked from anywhere in the site UI

### `/production/add-team?id=<tournamentId>` (add-team)

- Same standalone shell as the login page (no PageShell/nav — the whole portal stays out of the public site chrome)
- Guard: no production token → redirect `/production`
- Header: Production Desk brand, tournament `<select>` (loads all tournaments via public `GET /api/tournaments`), logout button
- Changing the tournament updates `?id=` and reloads team list state
- Unknown/missing `id` → "Tournament not found" message with the picker still available
- **Section 01 — Team essentials:** team logo upload (PNG/JPG/WebP; file → dataURL preview; required), team name (required text)
- **Section 02 — Player media & UIDs (optional):** multi-file photo picker (up to 16); each selected photo becomes a row with: thumbnail preview, required numeric UID input (`[0-9]{1,32}`, `inputmode="numeric"`), "Choose / replace photo" input, "Remove" button
- Submit → `POST /api/production/teams` (JSON with dataURLs) → success panel: "✓ TEAM ADDED SUCCESSFULLY", "Team "<name>" is saved!", buttons "+ Add Another Team" and "Download roster ZIP"
- Download button (also in header area): `GET /api/production/teams/export?id=<tournamentId>` → ZIP download (filename `production-<tournamentId>.zip`)

## Data model

New Mongo collection via mongoose model `ProductionTeam`:

```
productionteams: {
  id:           String, unique, required   // "pt-" + random base36
  tournamentId: String, required           // matches Tournament.id
  teamName:     String, required
  teamLogo:     String, required           // Cloudinary URL
  players: [{
    uid:   String, required                // numeric string
    photo: String, required                // Cloudinary URL
  }],
  timestamps: true
}
```

Images uploaded as dataURLs → Cloudinary via existing `uploadImage` (same `storageService` used by registrations). No client-side image optimization (Cloudinary handles storage; matches existing EPIX upload flows).

## Export ZIP format

`GET /api/production/teams/export?id=<tournamentId>` (requireProduction):

```
roster.csv
Player Pics/<uid>.<ext>       // one file per unique UID; ext from source image
Teams Logos/<Team_Name>.<ext> // spaces in team name → underscores
```

- `roster.csv` columns: `Team,UID,Photo,Logo` — one row per player; `Photo` = `Player Pics/<uid>.<ext>`; `Logo` = `Teams Logos/<Team_Name>.<ext>` (quoted fields as in team4hm export)
- Images fetched server-side from Cloudinary URLs (reuse `fetchImageBuffer` pattern already in `tournamentController` for registration ZIP export)
- If a team's image fetch fails, skip that file but keep its CSV rows (with the expected path)
- Empty list (no teams) → 404 JSON `{ message: "No teams to export" }`
- ZIP streamed with `archiver` (already a backend dependency)

## API summary

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/production/login` | none | username/password → token |
| `POST /api/production/teams` | requireProduction | create team (tournamentId, teamName, teamLogo dataURL, players[{uid, photo dataURL}]) |
| `GET /api/production/teams?id=<tournamentId>` | requireProduction | list teams (for success counts / future use) |
| `GET /api/production/teams/export?id=<tournamentId>` | requireProduction | roster ZIP download |

Validation on create: tournament must exist; teamName required; players ≤ 16; each player uid required, digits only, ≤ 32 chars; logo + each photo required dataURLs.

## Error handling

- Login: invalid creds → 401 `{ message: "Invalid username or password" }`
- Create: missing/invalid fields → 400 with specific message; tournament not found → 404
- Export: no teams → 404 JSON
- Frontend: upload/submit failures show inline alerts; 401 anywhere → logout from production session → `/production`
- Cloudinary upload failure for any image → 500 with message, nothing saved (upload images first, then create doc)

## Out of scope (YAGNI)

- Editing/deleting existing production teams
- Player in-game names, WhatsApp, group fields (not needed for roster export)
- Client-side image compression
- Login rate limiting (consistent with existing admin login)
- robots.txt disallow (site already relies on the same obscurity model as team4hm; can add later)
- Reusing production credentials for admin panel or vice versa

## Testing

- `npx tsc --noEmit` on backend and frontend
- Manual API tests (admin-style token flow): wrong password → 401; correct → token; create team with dataURL images → doc saved + Cloudinary URLs; export → unzip and compare structure/columns against reference `D:\Downloads\production-8.zip`
- UI checks: `/production` renders login; without token `/production/add-team` bounces to `/production`; after login, form submits and success panel shows; download produces ZIP
- Confirm pages are absent from nav/footer and no sitemap entry
- Deploy backend + frontend; smoke-test prod (`/production` 200, login flow, one test team add + export, then leave data clean or keep test team at owner's discretion)

## Deployment notes

- Backend: set `PRODUCTION_USERNAME` / `PRODUCTION_PASSWORD` in Vercel env before/after deploy
- Frontend: no new public env vars
- Both projects deploy from working tree via `npx vercel --prod --yes` (existing flow)
