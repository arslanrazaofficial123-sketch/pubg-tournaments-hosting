# Production Tournaments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Production Desk organizers create portal-only tournaments (name only) and select them in the add-team dropdown, so roster uploads and ZIP exports are scoped to organizer-created tournaments.

**Architecture:** New `ProductionTournament` model + two endpoints under the existing `/api/production` router (same `requireProduction` auth). Frontend switches the add-team dropdown from public tournaments to production tournaments and gains a small inline create form. Team upload/export endpoints unchanged — they already accept any opaque tournament id.

**Tech Stack:** Express + Mongoose (ESM, NodeNext `.js` import suffixes), Next.js 16 App Router client pages, existing `productionFetch` helper, `npx tsc --noEmit` as the verification gate (no test framework), curl/PowerShell smoke tests.

## Global Constraints

- Every backend relative import ends in `.js` (NodeNext ESM).
- PowerShell 5.1; every git command prefixed `$env:GIT_MASTER='1';`.
- Stage only task files; pre-existing dirty files (`backend/src/data/seed.ts`, `backend/src/utils/email.ts`, frontend batch, untracked dirs) stay untouched.
- Verification gate: `npx tsc --noEmit` in `backend/` and `frontend/` + local API smoke (local backend on :5000, local Mongo on 127.0.0.1:27017).
- Deploy: `npx vercel --prod --yes` from `backend/` then `frontend/`; push at the end with `$env:GIT_MASTER='1'; git push`.
- Production tournament ids are `ptn-<12 hex>`; they never appear on the public site (no public endpoint touches the collection).
- Download stays per-tournament via the existing export endpoint.

---

### Task 1: Backend — ProductionTournament model + create/list endpoints

**Files:**
- Create: `backend/src/models/ProductionTournament.ts`
- Modify: `backend/src/controllers/productionController.ts` (append two handlers + import)
- Modify: `backend/src/routes/productionRoutes.ts` (two routes)

**Interfaces:**
- Consumes: `asyncHandler` (`../middleware/asyncHandler.js`), `crypto` (already imported in the controller)
- Produces (HTTP, all behind `requireProduction`):
  - `POST /api/production/tournaments` body `{ name }` → `201 { id, name }` | `400 { message: "Tournament name is required" }`
  - `GET /api/production/tournaments` → `200` array of `{ id, name, createdAt }`, newest first

- [ ] **Step 1: Create the model**

Create `backend/src/models/ProductionTournament.ts`:

```ts
import { Schema, model } from "mongoose";

const productionTournamentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export const ProductionTournamentModel = model("ProductionTournament", productionTournamentSchema);
```

- [ ] **Step 2: Append controller handlers**

In `backend/src/controllers/productionController.ts` add to the import block:

```ts
import { ProductionTournamentModel } from "../models/ProductionTournament.js";
```

Append at the end of the file:

```ts
export const createProductionTournament = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ message: "Tournament name is required" });
    return;
  }
  const tournament = await ProductionTournamentModel.create({
    id: `ptn-${crypto.randomBytes(6).toString("hex")}`,
    name: name.trim(),
  });
  res.status(201).json({ id: tournament.id, name: tournament.name });
});

export const listProductionTournaments = asyncHandler(async (_req: Request, res: Response) => {
  const tournaments = await ProductionTournamentModel.find()
    .sort({ createdAt: -1 })
    .lean();
  res.json(
    tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
    })),
  );
});
```

- [ ] **Step 3: Add routes**

In `backend/src/routes/productionRoutes.ts` extend the import list with `createProductionTournament, listProductionTournaments` and add after the existing team routes:

```ts
router.post("/tournaments", createProductionTournament);
router.get("/tournaments", listProductionTournaments);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `backend/`
Expected: no output (success)

- [ ] **Step 5: Local API smoke test**

1. Start local backend: `npm run dev` in `backend/` (background; wait for :5000)
2. Run (PowerShell):

```powershell
$login = Invoke-RestMethod -Uri http://localhost:5000/api/production/login -Method Post -ContentType "application/json" -Body '{"username":"epixprod","password":"epixprod"}'
$H = @{ Authorization = "Bearer $($login.token)" }
# blank name -> 400
try { Invoke-RestMethod -Uri http://localhost:5000/api/production/tournaments -Method Post -ContentType "application/json" -Body '{"name":"  "}' -Headers $H } catch { $_.Exception.Response.StatusCode.value__ }
# create
$t = Invoke-RestMethod -Uri http://localhost:5000/api/production/tournaments -Method Post -ContentType "application/json" -Body '{"name":"Smoke Ptn"}' -Headers $H
$t.id   # expect ptn-...
# list contains it
(Invoke-RestMethod -Uri http://localhost:5000/api/production/tournaments -Headers $H).id -contains $t.id
# without token -> 401
try { Invoke-RestMethod -Uri http://localhost:5000/api/production/tournaments } catch { $_.Exception.Response.StatusCode.value__ }
```

Expected: `400`; `ptn-...` id; `True`; `401`

3. Keep the backend running for Task 3 smoke, or stop and restart later.

- [ ] **Step 6: Commit**

```bash
$env:GIT_MASTER='1'; git add backend/src/models/ProductionTournament.ts backend/src/controllers/productionController.ts backend/src/routes/productionRoutes.ts; git commit -m "feat(backend): production tournament create/list endpoints"
```

---

### Task 2: Frontend — production tournament API helpers

**Files:**
- Modify: `frontend/src/services/api/production.ts` (append type + two functions)

**Interfaces:**
- Consumes: existing `productionFetch<T>` in the same file
- Produces:
  - `type ProductionTournament = { id: string; name: string; createdAt?: string }`
  - `listProductionTournaments(): Promise<ProductionTournament[]>`
  - `createProductionTournament(name: string): Promise<ProductionTournament>`

- [ ] **Step 1: Append helpers**

In `frontend/src/services/api/production.ts` append:

```ts
export interface ProductionTournament {
  id: string;
  name: string;
  createdAt?: string;
}

export async function listProductionTournaments(): Promise<ProductionTournament[]> {
  return productionFetch<ProductionTournament[]>("/production/tournaments");
}

export async function createProductionTournament(name: string): Promise<ProductionTournament> {
  return productionFetch<ProductionTournament>("/production/tournaments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` in `frontend/`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
$env:GIT_MASTER='1'; git add frontend/src/services/api/production.ts; git commit -m "feat(frontend): production tournament API helpers"
```

---

### Task 3: Frontend — add-team page uses production tournaments + inline create form

**Files:**
- Modify: `frontend/src/app/production/add-team/page.tsx`

**Interfaces:**
- Consumes: `listProductionTournaments`, `createProductionTournament`, `ProductionTournament` from `@/services/api/production` (Task 2); existing page state/handlers; `ApiError` from `@/services/api`
- Produces: same page route; dropdown lists only production tournaments; inline create form; empty-state panel

- [ ] **Step 1: Update imports and state**

In `frontend/src/app/production/add-team/page.tsx`:

1. Replace the `@/services/api` import line `import { ApiError, getTournaments } from "@/services/api";` with `import { ApiError } from "@/services/api";`
2. Remove `import type { Tournament } from "@/types/tournament";`
3. Extend the `@/services/api/production` import with `createProductionTournament, listProductionTournaments, type ProductionTournament` (keep the existing named imports).
4. Change state declarations:

```tsx
  const [tournaments, setTournaments] = useState<ProductionTournament[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [creating, setCreating] = useState(false);
```

(keep every other existing state as-is).

- [ ] **Step 2: Swap the tournament-loading effect and add the create handler**

Replace this effect body:

```tsx
  useEffect(() => {
    if (!ready) return;
    getTournaments()
      .then((list) => {
        setTournaments(list);
        setTournamentId((current) => current || list[0]?.id || "");
      })
      .catch(() => setError("Failed to load tournaments."));
  }, [ready]);
```

with:

```tsx
  useEffect(() => {
    if (!ready) return;
    listProductionTournaments()
      .then((list) => {
        setTournaments(list);
        setTournamentId((current) => current || list[0]?.id || "");
      })
      .catch(() => setError("Failed to load tournaments."));
  }, [ready]);
```

Add this handler after `handleTournamentChange`:

```tsx
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const created = await createProductionTournament(newTournamentName.trim());
      const list = await listProductionTournaments();
      setTournaments(list);
      setTournamentId(created.id);
      setNewTournamentName("");
      setShowCreateForm(false);
      setSavedTeam(null);
      window.history.replaceState(
        null,
        "",
        `/production/add-team?id=${encodeURIComponent(created.id)}`,
      );
      refreshCount(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tournament.");
    } finally {
      setCreating(false);
    }
  };
```

- [ ] **Step 3: Replace the tournament selector block**

Replace this JSX block:

```tsx
        <div className="mb-6 rounded-2xl border border-border bg-bg-secondary p-4">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
            Tournament
          </label>
          <select
            value={tournamentId}
            onChange={(e) => handleTournamentChange(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select a tournament…</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
```

with:

```tsx
        <div className="mb-6 rounded-2xl border border-border bg-bg-secondary p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
              Tournament
            </label>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
              className="cursor-pointer rounded-lg border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + New tournament
            </button>
          </div>

          {tournaments.length > 0 && (
            <select
              value={tournamentId}
              onChange={(e) => handleTournamentChange(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">Select a tournament…</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {tournaments.length === 0 && !showCreateForm && (
            <p className="rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-center text-sm text-text-primary/50">
              Create a tournament first to start adding teams.
            </p>
          )}

          {showCreateForm && (
            <form onSubmit={handleCreateTournament} className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                placeholder="Tournament name (e.g. Epix Friday Cup)"
                autoFocus
                className="min-w-40 flex-1 rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newTournamentName.trim()}
                className="cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-text-primary hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save"}
              </button>
              {tournaments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTournamentName("");
                    setError("");
                  }}
                  className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-primary/70 hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </form>
          )}
        </div>
```

Notes: the option label uses `t.name` (ProductionTournament has `name`, not `title`). Cancel is hidden when there are zero tournaments so the user cannot get stuck without a tournament. The submit button already disables on `!tournamentId`, which covers the empty state.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `frontend/`
Expected: no output (success)

- [ ] **Step 5: Local UI check**

1. Local backend running on :5000 + `npm run dev` in `frontend/`
2. Open `http://localhost:3000/production` → login `epixprod`/`epixprod` → add-team page
3. Dropdown lists production tournaments only (the local "Smoke Ptn" from Task 1 appears)
4. "+ New tournament" → type name → Save → new tournament auto-selected, `?id=ptn-...` in URL
5. Delete local test docs if desired (`db.productiontournaments.deleteMany({name:"Smoke Ptn"})` via mongosh)

- [ ] **Step 6: Commit**

```bash
$env:GIT_MASTER='1'; git add frontend/src/app/production/add-team/page.tsx; git commit -m "feat(frontend): production tournaments in add-team dropdown with inline create"
```

---

### Task 4: Deploy + prod smoke + push

**Files:**
- No code files; deployment only

**Interfaces:**
- Consumes: Tasks 1–3 deployed to Vercel projects `epix-backend` and `frontend`
- Produces: live production-tournament flow on `www.epixesports.com/production/add-team`

- [ ] **Step 1: Pre-deploy typecheck**

Run: `npx tsc --noEmit` in `backend/` AND `frontend/`
Expected: both silent success

- [ ] **Step 2: Deploy backend, then frontend**

```powershell
# backend/
npx vercel --prod --yes; npx vercel ls   # newest Ready, Production
# frontend/
npx vercel --prod --yes; npx vercel ls   # newest Ready, Production
```

- [ ] **Step 3: Prod API smoke**

```powershell
$login = Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/login" -Method Post -ContentType "application/json" -Body '{"username":"epixprod","password":"epixprod"}'
$H = @{ Authorization = "Bearer $($login.token)" }
$t = Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/tournaments" -Method Post -ContentType "application/json" -Body '{"name":"Prod Ptn Smoke"}' -Headers $H
$t.id   # ptn-...
# team against the ptn id (1x1 PNGs)
$dataPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
$body = @{ tournamentId=$t.id; teamName="PtnSmokeTeam"; teamLogo=$dataPng; players=@(@{uid="55443322"; photo=$dataPng}) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/teams" -Method Post -ContentType "application/json" -Body $body -Headers $H | Out-Null
# export zip
Invoke-WebRequest -Uri "https://api.epixesports.com/api/production/teams/export?id=$($t.id)" -Headers $H -OutFile "$env:TEMP\opencode\ptn-roster.zip"
# pages
(Invoke-WebRequest -Uri "https://www.epixesports.com/production" -UseBasicParsing).StatusCode       # 200
(Invoke-WebRequest -Uri "https://www.epixesports.com/production/add-team" -UseBasicParsing).StatusCode  # 200
```

Expected: `ptn-` id; ZIP downloads with `roster.csv` + `Player Pics/` + `Teams Logos/`; pages 200.

- [ ] **Step 4: Verify isolation**

Public tournaments endpoint must not contain the new tournament name:

```powershell
(Invoke-RestMethod -Uri "https://api.epixesports.com/api/tournaments" | ConvertTo-Json -Depth 4 -Compress) -match "Prod Ptn Smoke"   # expect False
```

- [ ] **Step 5: Optional UI check + cleanup**

Browser: open `https://www.epixesports.com/production/add-team` → sign in → create a real tournament, add a team, download ZIP. Remove smoke docs from Atlas (`productiontournaments` where `name:"Prod Ptn Smoke"`, `productionteams` where `teamName:"PtnSmokeTeam"`) at owner's discretion — can be left for the owner.

- [ ] **Step 6: Push**

```powershell
$env:GIT_MASTER='1'; git push
```

Expected: Task 1–3 commits land on `origin/master`.

---

## Self-Review Notes (plan author)

1. **Spec coverage:** portal-only collection (T1, no public endpoints touched); name-only create (T1 + T3 mini-form); dropdown = production only (T3 Step 2–3, `t.title`→`t.name`); same production login (routes already behind `requireProduction`); empty state + "+ New tournament" (T3 Step 3); downloads unchanged (no export edits); team flow unchanged (only dropdown source swapped).
2. **Placeholders:** none — every step has full code or exact commands.
3. **Type consistency:** `ProductionTournament { id, name, createdAt? }` defined T2, consumed T3; `createProductionTournament(name)` / `listProductionTournaments()` names match across T2/T3; backend handlers `createProductionTournament`/`listProductionTournaments` exported T1 and imported in routes T1.
