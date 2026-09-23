# Team Registrations JSON Export — Design

## Goal
Let admin/partner download tournament registration data as a JSON file containing team name, team logo URL, and each member's uid + in-game name + picture URL.

## Scope
- Export **registrations only** (not user team profiles from `/player-photos`).
- Format: **JSON only** (no CSV).
- Saved location: browser **Downloads** folder (e.g. `C:\Users\<user>\Downloads\registrations-export.json`).

## Data shape
```json
[
  {
    "teamName": "FURIOUS4T7",
    "teamLogo": "https://res.cloudinary.com/rwso5oo6/.../logo.png",
    "group": "Group A",
    "status": "pending",
    "whatsapp": "0309...",
    "tournamentId": "t-ovbtfnoyd",
    "members": [
      {
        "uid": "52116569921",
        "inGameName": "Player1",
        "picture": "https://res.cloudinary.com/rwso5oo6/.../pic.png"
      }
    ]
  }
]
```

`picture` and `teamLogo` are Cloudinary `secure_url` values (or empty/undefined if never uploaded). Each picture is paired with its member's `uid` inside the `members` array.

## Architecture

### Backend
- New route: `GET /api/tournaments/registrations/export`
- Guard: `requireStaff` (same as other registration mutations)
- Optional query: `?tournamentId=t-xxx` to export one tournament; omit = all registrations
- Handler reuses existing `getAllRegistrations(tournamentId, memberUid)` from `tournamentService`
- Response headers:
  - `Content-Type: application/json`
  - `Content-Disposition: attachment; filename="registrations-export.json"`
- Body: raw JSON array (not wrapped in `{ data: ... }`)

Route order: must be registered **before** `GET /:id` so Express does not treat `export` as a tournament id. Place it with the other `/registrations` routes (already before `/:id`).

### Frontend (Admin → Registrations tab)
- Add **"Export JSON"** button in the Registrations List header (next to team count badge)
- On click:
  1. Build URL: `/tournaments/registrations/export` or `...export?tournamentId=<active>`
  2. Fetch with existing auth headers (admin/partner token from sessionStorage — same pattern as `apiClient`)
  3. Create blob, `URL.createObjectURL`, trigger `<a download>` click
  4. Filename: `registrations-export.json` or `registrations-<tournamentId>.json`
- Button state: show brief loading/disabled while fetching
- Errors: show existing admin alert on failure

## Components
| Layer | File | Change |
|-------|------|--------|
| Route | `backend/src/routes/tournamentRoutes.ts` | Add `GET /registrations/export` with `requireStaff` |
| Controller | `backend/src/controllers/tournamentController.ts` | Add `exportRegistrations` handler |
| Service | none | Reuse `getAllRegistrations` |
| Frontend API | `frontend/src/services/api/tournaments.ts` | Add `exportRegistrations()` returning Blob |
| Admin UI | `frontend/src/app/admin/page.tsx` | Export button + download handler |

## Error handling
- No registrations → export empty array `[]` (valid JSON), not an error
- Auth failure → 401 from existing middleware; frontend shows alert
- Network failure → frontend catch → admin alert

## Testing
1. `npx tsc --noEmit` in backend and frontend
2. Manual: admin login → Registrations → Export JSON → file downloads
3. Verify JSON opens and each member has `uid` + `picture` (Cloudinary URL when present)
4. Export with `tournamentId` filter → only that tournament's teams
5. Non-staff token → 401

## Out of scope
- CSV format
- Exporting `users.teamData` profiles
- Image binary download (only URLs included)
