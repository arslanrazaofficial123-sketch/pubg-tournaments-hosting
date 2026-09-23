# Team Registrations ZIP Export — Design

## Goal
Let admin/partner download tournament registration data as a **ZIP folder** containing:
1. `registrations.json` — structured team + member data
2. Downloaded **team logos** and **member pictures** (from Cloudinary URLs)

## Scope
- Export **registrations only** (not user team profiles from `/player-photos`).
- Format: **ZIP** containing JSON + images.
- Saved location: browser **Downloads** folder (e.g. `C:\Users\<user>\Downloads\registrations-export.zip`).

## ZIP structure
```
registrations-export/
  registrations.json
  <safe-team-name>/
    team-logo.png
    <uid>-<safe-ingamename>.png
    <uid>-<safe-ingamename>.png
    ...
  <safe-team-name>/
    ...
```

- Team folder name: sanitized `teamName` (or `team-<registrationId>` if missing)
- Image filenames: sanitized from uid + inGameName; extension from URL/content-type
- If logo/picture URL is missing or download fails: skip that file (JSON still has the URL field)

## JSON shape
```json
[
  {
    "teamName": "FURIOUS4T7",
    "teamLogo": "https://res.cloudinary.com/.../logo.png",
    "teamLogoFile": "FURIOUS4T7/team-logo.png",
    "group": "Group A",
    "status": "pending",
    "whatsapp": "0309...",
    "tournamentId": "t-ovbtfnoyd",
    "members": [
      {
        "uid": "52116569921",
        "inGameName": "Player1",
        "picture": "https://res.cloudinary.com/.../pic.png",
        "pictureFile": "FURIOUS4T7/52116569921-Player1.png"
      }
    ]
  }
]
```

- `teamLogo` / `picture`: original Cloudinary URL (or empty)
- `teamLogoFile` / `pictureFile`: relative path inside ZIP when image was included; omit if not downloaded

## Architecture

### Backend
- New route: `GET /api/tournaments/registrations/export`
- Guard: `requireStaff` (admin or partner)
- Optional query: `?tournamentId=t-xxx` to export one tournament; omit = all registrations
- Flow:
  1. Reuse `getAllRegistrations(tournamentId)` from `tournamentService`
  2. Build in-memory ZIP (use `archiver` npm package — add dependency)
  3. For each registration: append JSON entry; fetch `teamLogo` + each `picture` URL and append image buffers into team folder
  4. Stream ZIP with headers:
     - `Content-Type: application/zip`
     - `Content-Disposition: attachment; filename="registrations-export.zip"`
- Image fetch: Node `fetch` with timeout (~10s); on failure skip image, keep URL in JSON
- Route order: register with other `/registrations` routes (before `GET /:id`)

### Frontend (Admin → Registrations tab)
- **"Export ZIP"** button in Registrations List header (next to team count badge)
- On click:
  1. Fetch `/tournaments/registrations/export` or `...?tournamentId=<active>` with auth headers (same as `apiClient` / admin_token pattern)
  2. Response → blob → `URL.createObjectURL` → `<a download>` click
  3. Filename: `registrations-export.zip` or `registrations-<tournamentId>.zip`
- Loading/disabled while exporting (image downloads can take a few seconds)
- Errors: existing admin alert

## Components
| Layer | File | Change |
|-------|------|--------|
| Route | `backend/src/routes/tournamentRoutes.ts` | `GET /registrations/export` + `requireStaff` |
| Controller | `backend/src/controllers/tournamentController.ts` | `exportRegistrations` — build ZIP stream |
| Service | none | Reuse `getAllRegistrations` |
| Deps | `backend/package.json` | Add `archiver` (+ `@types/archiver` if needed) |
| Frontend API | `frontend/src/services/api/tournaments.ts` | `exportRegistrations(): Promise<Blob>` |
| Admin UI | `frontend/src/app/admin/page.tsx` | Export button + download handler |

## Error handling
- No registrations → valid ZIP with `registrations.json` containing `[]` (and no team folders)
- Image URL missing/fetch fail → skip file, keep URL in JSON
- Auth failure → 401; frontend alert
- Network failure → frontend catch → admin alert

## Testing
1. `npx tsc --noEmit` backend + frontend
2. Admin → Registrations → Export ZIP → downloads
3. Unzip: verify `registrations.json` + team folders with logo/member images
4. Each member row has `uid`, `inGameName`, `picture` URL, and `pictureFile` when image present
5. Filter by `tournamentId` → only that tournament
6. Non-staff token → 401

## Out of scope
- CSV format
- Exporting `users.teamData` profiles
- Progressive/streaming progress UI beyond button loading state
