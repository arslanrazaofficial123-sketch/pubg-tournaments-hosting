# Tournament Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delete button for production tournaments that cascades: teams, their Cloudinary images, and the tournament itself are removed.

**Architecture:** New `DELETE /api/production/tournaments/:id` endpoint reusing the existing `cleanupReplacedMedia` image-cleanup helper; desk-page card button with two-click confirm mirroring the team-delete pattern.

**Tech Stack:** Express + Mongoose (ESM `.js` suffixes), Next.js 16 client page, existing `productionFetch`, gate = `npx tsc --noEmit` + API smoke, deploy via Vercel CLI.

## Global Constraints

- Backend relative imports end in `.js`; PowerShell 5.1; git commands prefixed `$env:GIT_MASTER='1';`.
- Stage only task files; pre-existing dirty files stay untouched.
- Verification gate: `npx tsc --noEmit` in `backend/` and `frontend/` + local API smoke (backend :5000, local Mongo).
- Deploy `npx vercel --prod --yes` from `backend/` then `frontend/`; push last.
- Cascade deletes Cloudinary images best-effort (`deleteImageByUrl` never throws).

---

### Task 1: Backend — DELETE tournament endpoint

**Files:**
- Modify: `backend/src/controllers/productionController.ts` (append handler)
- Modify: `backend/src/routes/productionRoutes.ts` (import + route)

**Interfaces:**
- Consumes: `deleteProductionTeam`'s pattern — `cleanupReplacedMedia(team, { teamLogo: "", players: [] })` (deletes all a team's images), `TeamDoc` type, `ProductionTournamentModel`, `ProductionTeamModel` (all already in the controller)
- Produces: `DELETE /api/production/tournaments/:id` (behind `requireProduction`) → `200 { success: true, deletedTeams: number }` | `404 { message: "Tournament not found" }`

- [ ] **Step 1: Append controller handler**

In `backend/src/controllers/productionController.ts`, append after `updateProductionTournament`:

```ts
export const deleteProductionTournament = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const tournament = await ProductionTournamentModel.findOne({ id }).lean();
  if (!tournament) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }
  const teams = (await ProductionTeamModel.find({ tournamentId: id }).lean()) as TeamDoc[];
  await ProductionTeamModel.deleteMany({ tournamentId: id });
  await Promise.all(
    teams.map((team) => cleanupReplacedMedia(team, { teamLogo: "", players: [] })),
  );
  await ProductionTournamentModel.deleteOne({ id });
  res.json({ success: true, deletedTeams: teams.length });
});
```

- [ ] **Step 2: Add route**

In `backend/src/routes/productionRoutes.ts`: add `deleteProductionTournament` to the controller import list, and add after `router.patch("/tournaments/:id", updateProductionTournament);`:

```ts
router.delete("/tournaments/:id", deleteProductionTournament);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` in `backend/` — expected silent success.

- [ ] **Step 4: Local API smoke**

1. Start local backend (`npm run dev`, wait for :5000).
2. Run:

```powershell
$login = Invoke-RestMethod -Uri http://localhost:5000/api/production/login -Method Post -ContentType "application/json" -Body '{"username":"epixprod","password":"epixprod"}'
$H = @{ Authorization = "Bearer $($login.token)" }
$t = Invoke-RestMethod -Uri http://localhost:5000/api/production/tournaments -Method Post -ContentType "application/json" -Body '{"name":"Del Test"}' -Headers $H
# delete -> 200 with deletedTeams
Invoke-RestMethod -Uri "http://localhost:5000/api/production/tournaments/$($t.id)" -Method Delete -Headers $H
# re-delete -> 404
try { Invoke-RestMethod -Uri "http://localhost:5000/api/production/tournaments/$($t.id)" -Method Delete -Headers $H } catch { $_.Exception.Response.StatusCode.value__ }
# no token -> 401
try { Invoke-RestMethod -Uri "http://localhost:5000/api/production/tournaments/$($t.id)" -Method Delete } catch { $_.Exception.Response.StatusCode.value__ }
```

Expected: `success True / deletedTeams 0`; `404`; `401`

- [ ] **Step 5: Commit**

```bash
$env:GIT_MASTER='1'; git add backend/src/controllers/productionController.ts backend/src/routes/productionRoutes.ts; git commit -m "feat(backend): delete production tournament with cascading team cleanup"
```

---

### Task 2: Frontend — deleteProductionTournament helper

**Files:**
- Modify: `frontend/src/services/api/production.ts`

**Interfaces:**
- Consumes: `productionFetch`
- Produces: `deleteProductionTournament(id: string): Promise<{ success: boolean; deletedTeams: number }>`

- [ ] **Step 1: Append helper**

In `frontend/src/services/api/production.ts` append:

```ts
export async function deleteProductionTournament(
  id: string,
): Promise<{ success: boolean; deletedTeams: number }> {
  return productionFetch<{ success: boolean; deletedTeams: number }>(
    `/production/tournaments/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` in `frontend/` — expected silent success.

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add frontend/src/services/api/production.ts; git commit -m "feat(frontend): deleteProductionTournament API helper"
```

---

### Task 3: Frontend — delete button on desk tournament cards

**Files:**
- Modify: `frontend/src/app/production/desk/page.tsx`

**Interfaces:**
- Consumes: `deleteProductionTournament` (Task 2), existing card `<Link>` markup, `ApiError`
- Produces: two-click delete on each card; list + derived stats refresh on success

- [ ] **Step 1: Import and state**

In `frontend/src/app/production/desk/page.tsx`:

1. Add `deleteProductionTournament` to the `@/services/api/production` import.
2. Add state next to the existing `creating` state:

```tsx
  const [confirmDelete, setConfirmDelete] = useState("");
```

- [ ] **Step 2: Add the delete handler**

Add after the `create` handler:

```tsx
  const handleDelete = async (t: ProductionTournament) => {
    if (confirmDelete !== t.id) {
      setConfirmDelete(t.id);
      return;
    }
    setConfirmDelete("");
    setError("");
    try {
      await deleteProductionTournament(t.id);
      setTournaments((prev) => (prev ?? []).filter((x) => x.id !== t.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete tournament.");
    }
  };
```

- [ ] **Step 3: Add the button to each card**

Replace the card's footer line:

```tsx
              <p className="mt-5 border-t border-border/60 pt-4 text-sm font-semibold text-accent">Manage collection →</p>
```

with:

```tsx
              <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                <span className="text-sm font-semibold text-accent">Manage collection →</span>
                {confirmDelete === t.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmDelete("");
                      }}
                      className="cursor-pointer text-xs font-semibold text-text-primary/50 hover:text-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(t);
                      }}
                      className="cursor-pointer rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20"
                    >
                      Confirm delete
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(t);
                    }}
                    className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400/80 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                )}
              </div>
```

Notes: `e.preventDefault()` stops the surrounding `<Link>` from navigating (the card is an `<a>`). First click arms, second confirms; Cancel disarms. Stats recompute automatically from the filtered list. Page-level `error` banner (already rendered above the grid) shows API failures.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `frontend/` — expected silent success.

- [ ] **Step 5: Local UI check**

1. Backend :5000 + `npm run dev` in `frontend/`.
2. Open `http://localhost:3000/production/desk` → login → card shows Delete; first click → "Confirm delete"/Cancel; confirm removes card; Cancel disarms; clicking Delete does not navigate into the tournament.

- [ ] **Step 6: Commit**

```bash
$env:GIT_MASTER='1'; git add frontend/src/app/production/desk/page.tsx; git commit -m "feat(frontend): delete button on desk tournament cards"
```

---

### Task 4: Deploy + prod smoke + push

**Files:** none (deployment only)

- [ ] **Step 1: Typecheck both sides** — `npx tsc --noEmit` in `backend/` and `frontend/`, both silent.

- [ ] **Step 2: Deploy** — `npx vercel --prod --yes` from `backend/`, then `frontend/`; `npx vercel ls` to confirm both newest deployments Ready, Production.

- [ ] **Step 3: Prod smoke**

```powershell
$login = Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/login" -Method Post -ContentType "application/json" -Body '{"username":"epixprod","password":"epixprod"}'
$H = @{ Authorization = "Bearer $($login.token)" }
$t = Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/tournaments" -Method Post -ContentType "application/json" -Body '{"name":"Del Smoke"}' -Headers $H
Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/tournaments/$($t.id)" -Method Delete -Headers $H   # success, deletedTeams 0
try { Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/tournaments/$($t.id)" -Method Delete -Headers $H } catch { $_.Exception.Response.StatusCode.value__ }  # 404
(Invoke-WebRequest -Uri "https://www.epixesports.com/production/desk" -UseBasicParsing).StatusCode  # 200
```

- [ ] **Step 4: Push** — `$env:GIT_MASTER='1'; git push` (with spec/plan docs commits included).

---

## Self-Review Notes (plan author)

1. **Spec coverage:** cascade (T1 reuses `cleanupReplacedMedia` = Cloudinary cleanup), 404/200 shapes (T1), helper (T2), card placement + two-click confirm + no navigation (T3), share link dies with doc (implicit — no endpoint change needed), verification (each task + T4).
2. **Placeholders:** none — full code/commands everywhere.
3. **Type consistency:** `deleteProductionTournament` returns `{ success, deletedTeams }` in T2 and T4; `cleanupReplacedMedia(team, { teamLogo: "", players: [] })` matches its existing signature (T1); `confirmDelete` string state mirrors the team-page pattern.
