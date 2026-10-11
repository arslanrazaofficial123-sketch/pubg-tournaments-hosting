# Production Desk — Production Tournaments

Date: 2026-10-11
Status: Approved

## Goal

Let Production Desk organizers create their own portal-only tournaments and select them in the add-team form, so every roster upload is scoped to an organizer-created tournament and downloadable as a per-tournament ZIP. Public site tournaments are not involved.

## Decisions (confirmed with owner)

- **Portal-only**: production tournaments never appear on the public EPIX site.
- **Fields**: name only (e.g. "Epix Friday Cup").
- **Dropdown source**: the add-team form lists ONLY production tournaments; public tournaments are removed from that dropdown.
- **Who creates**: anyone signed in with the shared Production Desk credentials (same `requireProduction` login).
- **Downloads**: unchanged — per-tournament roster ZIP via the existing export button.

## Data

New model `ProductionTournament` (collection `productiontournaments`), mirroring the ProductionTeam isolation pattern:

- `id: string` — unique, `ptn-<12 hex>`
- `name: string` — required, trimmed, non-empty
- timestamps

`ProductionTeam.tournamentId` will now store a `ptn-` id. The model field is an opaque string, so no schema change is needed. Existing test team `ProdSmokeTest` (references public `t-l2cqhxnks`) becomes unreachable from the dropdown; owner may delete it from Atlas.

## API

All under `/api/production`, protected by `requireProduction` (mounted after the login route, like teams):

| Endpoint | Body/Query | Response |
|---|---|---|
| `POST /api/production/tournaments` | `{ name }` | `201 { id, name }` · `400` missing/blank name |
| `GET /api/production/tournaments` | — | `200` array newest first |

Unchanged: `POST/GET /api/production/teams`, `GET /api/production/teams/export` (keyed by opaque tournament id — works with `ptn-` ids as-is).

No public endpoint references `ProductionTournament`.

## Frontend

`/production/add-team` changes only:

1. Tournament dropdown loads from `listProductionTournaments()` instead of `getTournaments()`.
2. **"+ New tournament"** button beside the dropdown reveals an inline single-field mini-form (name input + Save). On save: create via API, close mini-form, auto-select the new tournament, refresh URL `?id=`, clear success/error states.
3. Empty state: when zero production tournaments exist, the team form is replaced by a short "Create a tournament first" panel whose primary action is the same create mini-form.
4. Team upload flow, success panel, team count, roster ZIP download, logout — unchanged.

New frontend helper `listProductionTournaments()` / `createProductionTournament(name)` in `services/api/production.ts` using the existing `productionFetch` (Bearer + 401 redirect).

## Error handling

- Create with blank name → `400` shown inline in the mini-form.
- List/create failing with `401` → existing `productionFetch` behavior (clear token, redirect to `/production`).
- Export with a `ptn-` id that has no teams → `404 "No teams to export"` (existing).

## Testing / verification

- `npx tsc --noEmit` in `backend/` and `frontend/`.
- Local API smoke: create tournament → list contains it → create team against `ptn-` id → export ZIP matches reference layout.
- Prod smoke after deploy: create tournament via API, add team through the real UI flow, download ZIP, confirm public tournament page/admin registrations untouched.
