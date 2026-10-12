# Tournament Delete Button — Design

Date: 2026-10-11
Status: Approved

## Goal

Add a delete button for production tournaments (currently only teams can be deleted).

## Decisions (confirmed)

- **Cascade:** deleting a tournament deletes all its teams AND their storage images (Cloudinary logo + player photos) — same cleanup team delete already does. Then the tournament itself.
- **Placement:** each tournament card on the Production Desk (`/production/desk`); two-click confirm ("Delete" → "Confirm delete") mirroring the team-delete pattern; clicking Delete must not navigate the card link.
- Share link `/p/<slug>` 404s after deletion (tournament doc gone).

## API

`DELETE /api/production/tournaments/:id` — behind `requireProduction`:

- `200 { success: true, deletedTeams: number }`
- `404 { message: "Tournament not found" }`

Order: find tournament → delete its teams' Cloudinary images (best-effort, never throws) → delete team docs → delete tournament doc.

## Frontend

- `deleteProductionTournament(id): Promise<{ success: boolean; deletedTeams: number }>` in `services/api/production.ts`.
- Desk page: per-card Delete button with local `confirmDelete` state (pattern from `production/tournament/page.tsx` team delete). On success: remove card, refresh stats; error shown in card or page error slot.

## Verification

- `npx tsc --noEmit` both sides; local API smoke (create → delete → 404 on re-delete, teams gone); deploy + prod smoke; push.
