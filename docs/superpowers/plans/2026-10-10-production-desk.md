# Production Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two hidden pages (`/production` login + `/production/add-team`) that store teams in a separate collection with a team4hm-style roster ZIP export.

**Architecture:** New `/api/production/*` backend routes (own env-configured credentials, JWT role `production`), new `ProductionTeam` mongoose model, Cloudinary uploads via existing `uploadImage`, ZIP export via existing `archiver`. Frontend: two standalone Next.js client pages with their own token storage (`production_token`), never linked from site navigation.

**Tech Stack:** Express + mongoose (ESM, `.js` import suffixes), Next.js App Router client pages, Cloudinary, archiver, existing HS256 JWT utils.

## Global Constraints

- Repo root: `D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master`. Every git command MUST be prefixed `$env:GIT_MASTER='1';`
- Backend is ESM (`"type": "module"`, NodeNext): ALL relative imports end in `.js`
- **No test framework exists** — verification gate per task is `npx tsc --noEmit` (run in `backend/` or `frontend/`) plus the manual curl/browser checks listed in each task
- Stage only the task's files; leave pre-existing dirty files untouched (`backend/src/data/seed.ts`, `backend/src/data/seedReviews.ts` (deleted), `backend/src/utils/email.ts`, frontend about/contact/globals.css/rules-terms/HeroSection/CarouselControls/SectionHeader/StatusBadge/TournamentCard/TournamentCarousel/TournamentFilters/dashboard-page-hunks, and untracked dirs including `frontend/src/app/wallet/`, `.firecrawl/`, `backend/scripts/`, `frontend/public/images/shop/`, `frontend/src/features/wallet/`, `frontend/src/services/api/admin.ts`, `frontend/src/services/api/wallet.ts`, `start-local.ps1`)
- Production portal pages must NOT import or render `PageShell`, `HeroSection`, `SiteNavigation`, or site footer — they are standalone (portal obscurity like team4hm)
- Do not add links to `/production` from any nav, footer, or sitemap
- Default local creds fall back like admin password does: `env.productionUsername` default `"epixprod"`, `env.productionPassword` default `"epixprod"`; Vercel env overrides in production
- Max 16 players per team; UIDs digits-only, 1–32 chars; duplicate UIDs allowed
- Export ZIP layout (must match reference `D:\Downloads\production-8.zip`): `roster.csv` (header `Team,UID,Photo,Logo`; Team/Photo/Logo fields quoted, UID unquoted; one row per player), `Player Pics/<uid>.<ext>`, `Teams Logos/<Team_Name>.<ext>` (non-alphanumerics → `_`)
- Deploy: `npx vercel --prod --yes` from `backend/` then `frontend/`; push with `$env:GIT_MASTER='1'; git push`
- Reference spec: `docs/superpowers/specs/2026-10-10-production-desk-design.md`

---

### Task 1: Backend foundations — env, model, middleware, storage kinds

**Files:**
- Modify: `backend/src/config/env.ts:26-29` (append two entries)
- Create: `backend/src/models/ProductionTeam.ts`
- Modify: `backend/src/middleware/auth.ts:6` (role union) and append `requireProduction`
- Modify: `backend/src/services/storageService.ts:12` (kind union) and `:21-27` (folder map) and `:36-40` (baseName branch)

**Interfaces:**
- Consumes: `env` from `config/env.js`, existing `requireAuth` in `middleware/auth.js`
- Produces:
  - `env.productionUsername: string`, `env.productionPassword: string`
  - `ProductionTeamModel` (mongoose model; doc: `{ id, tournamentId, teamName, teamLogo, players: [{ uid, photo }] }`)
  - `requireProduction(req, res, next)` middleware (accepts JWT with `role === "production"`)
  - `uploadImage` accepts new kinds `"production-logo"` (folder `epix/production-logos`, baseName from `teamName`) and `"production-photo"` (folder `epix/production-photos`, baseName from `uid`)

- [ ] **Step 1: Add env entries**

In `backend/src/config/env.ts`, after the `resendApiKey` line add:

```ts
  productionUsername: process.env.PRODUCTION_USERNAME || "epixprod",
  productionPassword: process.env.PRODUCTION_PASSWORD || "epixprod",
```

- [ ] **Step 2: Create the model**

Create `backend/src/models/ProductionTeam.ts`:

```ts
import { Schema, model } from "mongoose";

const productionPlayerSchema = new Schema(
  {
    uid: { type: String, required: true },
    photo: { type: String, required: true },
  },
  { _id: false },
);

const productionTeamSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    tournamentId: { type: String, required: true },
    teamName: { type: String, required: true },
    teamLogo: { type: String, required: true },
    players: { type: [productionPlayerSchema], default: [] },
  },
  { timestamps: true },
);

export const ProductionTeamModel = model("ProductionTeam", productionTeamSchema);
```

- [ ] **Step 3: Extend auth middleware**

In `backend/src/middleware/auth.ts` change the role union on line 8 to:

```ts
    role: "user" | "admin" | "partner" | "production";
```

Append at end of file:

```ts
export function requireProduction(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user?.role !== "production") {
      res.status(403).json({ message: "Access denied. Production privileges required." });
      return;
    }
    next();
  });
}
```

- [ ] **Step 4: Extend storage service**

In `backend/src/services/storageService.ts` change the kind union to:

```ts
  kind: "avatar" | "team-logo" | "player-picture" | "wallet-proof" | "receipt" | "production-logo" | "production-photo";
```

In `FOLDER_MAP` add:

```ts
  "production-logo": "epix/production-logos",
  "production-photo": "epix/production-photos",
```

Change the baseName ternary to:

```ts
  const baseName = sanitizeFilename(
    kind === "team-logo" || kind === "production-logo"
      ? teamName || uid || "logo"
      : kind === "wallet-proof"
        ? `${uid || "proof"}-${Date.now()}`
        : uid || kind
  );
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit` in `backend/`
Expected: no output (success)

- [ ] **Step 6: Commit**

```bash
$env:GIT_MASTER='1'; git add backend/src/config/env.ts backend/src/models/ProductionTeam.ts backend/src/middleware/auth.ts backend/src/services/storageService.ts; git commit -m "feat(backend): production portal model, auth middleware, storage kinds"
```

---

### Task 2: Extract shared image-fetch helpers

Move the three private helpers in `tournamentController.ts` into a shared util so the production export can reuse them without duplication.

**Files:**
- Create: `backend/src/utils/imageFetch.ts`
- Modify: `backend/src/controllers/tournamentController.ts:276-316` (delete local helpers) and imports at top

**Interfaces:**
- Consumes: nothing new
- Produces (all in `backend/src/utils/imageFetch.ts`):
  - `sanitizePathSegment(name: string): string`
  - `extFromUrlOrType(url: string, contentType: string | null): string`
  - `fetchImageBuffer(url: string): Promise<{ buffer: Buffer; ext: string } | null>`

- [ ] **Step 1: Create the util**

Create `backend/src/utils/imageFetch.ts` with the EXACT current implementations from `tournamentController.ts` lines 276–316:

```ts
export function sanitizePathSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "team";
}

export function extFromUrlOrType(url: string, contentType: string | null): string {
  const fromCt = (contentType || "").split(";")[0].trim();
  const ctMap: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  if (fromCt && ctMap[fromCt]) return ctMap[fromCt];
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.(png|jpe?g|webp|gif|svg)$/i);
    if (m) return m[1].toLowerCase() === "jpeg" ? ".jpg" : m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return ".png";
}

export async function fetchImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, ext: extFromUrlOrType(url, res.headers.get("content-type")) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Rewire tournamentController**

In `backend/src/controllers/tournamentController.ts`:
1. Delete the three local function blocks (lines 276–316: `sanitizePathSegment`, `extFromUrlOrType`, `fetchImageBuffer`)
2. Add import:

```ts
import { sanitizePathSegment, fetchImageBuffer } from "../utils/imageFetch.js";
```

(`extFromUrlOrType` is only used inside `fetchImageBuffer`; no need to import it in the controller.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` in `backend/`
Expected: no output (success)

- [ ] **Step 4: Commit**

```bash
$env:GIT_MASTER='1'; git add backend/src/utils/imageFetch.ts backend/src/controllers/tournamentController.ts; git commit -m "refactor(backend): share image fetch helpers for ZIP exports"
```

---

### Task 3: Production login + create/list team + routes mounted

**Files:**
- Create: `backend/src/controllers/productionController.ts`
- Create: `backend/src/routes/productionRoutes.ts`
- Modify: `backend/src/routes/index.ts:13-26` (import + mount)

**Interfaces:**
- Consumes: `ProductionTeamModel` (Task 1), `requireProduction` (Task 1), `signToken` from `../utils/jwt.js`, `uploadImage` from `../services/storageService.js`, `TournamentModel` from `../models/Tournament.js`, `env` from `../config/env.js`, `asyncHandler` from `../middleware/asyncHandler.js`
- Produces (HTTP):
  - `POST /api/production/login` body `{ username, password }` → `200 { success: true, token }` | `400` missing | `401 { message: "Invalid username or password" }`
  - `POST /api/production/teams` (Bearer production token) body `{ tournamentId, teamName, teamLogo, players: [{ uid, photo }] }` (all images dataURLs) → `201` team JSON `{ id, tournamentId, teamName, teamLogo, players }` | `400` validation | `404` tournament not found
  - `GET /api/production/teams?id=<tournamentId>` (Bearer) → `200` array of teams, newest first

- [ ] **Step 1: Create the controller**

Create `backend/src/controllers/productionController.ts`:

```ts
import crypto from "crypto";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ProductionTeamModel } from "../models/ProductionTeam.js";
import { TournamentModel } from "../models/Tournament.js";
import { uploadImage } from "../services/storageService.js";
import { signToken } from "../utils/jwt.js";

const MAX_PLAYERS = 16;

export const productionLogin = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, message: "Username and password are required" });
    return;
  }
  if (username !== env.productionUsername || password !== env.productionPassword) {
    res.status(401).json({ success: false, message: "Invalid username or password" });
    return;
  }
  const token = signToken({ uid: "production", role: "production" });
  res.json({ success: true, token });
});

export const createProductionTeam = asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, teamName, teamLogo, players } = req.body;

  if (!tournamentId || typeof tournamentId !== "string") {
    res.status(400).json({ message: "Tournament is required" });
    return;
  }
  if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
    res.status(400).json({ message: "Team name is required" });
    return;
  }
  if (!teamLogo || typeof teamLogo !== "string" || !teamLogo.startsWith("data:image/")) {
    res.status(400).json({ message: "Team logo is required" });
    return;
  }
  if (players != null && !Array.isArray(players)) {
    res.status(400).json({ message: "Players must be a list" });
    return;
  }
  const playerList: Array<{ uid?: unknown; photo?: unknown }> = Array.isArray(players) ? players : [];
  if (playerList.length > MAX_PLAYERS) {
    res.status(400).json({ message: `Maximum ${MAX_PLAYERS} players allowed` });
    return;
  }
  for (const p of playerList) {
    const uid = typeof p?.uid === "string" ? p.uid.trim() : "";
    if (!/^\d{1,32}$/.test(uid)) {
      res.status(400).json({ message: "Each player needs a numeric UID (up to 32 digits)" });
      return;
    }
    if (typeof p?.photo !== "string" || !p.photo.startsWith("data:image/")) {
      res.status(400).json({ message: "Each player needs a photo" });
      return;
    }
  }

  const tournament = await TournamentModel.findOne({ id: tournamentId }).lean();
  if (!tournament) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  const uniqueSuffix = crypto.randomBytes(3).toString("hex");
  const teamLogoUrl = await uploadImage({
    kind: "production-logo",
    teamName: `${teamName.trim()}-${uniqueSuffix}`,
    dataUrl: teamLogo,
  });

  const uploadedPlayers: Array<{ uid: string; photo: string }> = [];
  for (const p of playerList) {
    const uid = (p.uid as string).trim();
    const photoUrl = await uploadImage({
      kind: "production-photo",
      uid: `${uid}-${crypto.randomBytes(3).toString("hex")}`,
      dataUrl: p.photo as string,
    });
    uploadedPlayers.push({ uid, photo: photoUrl });
  }

  const team = await ProductionTeamModel.create({
    id: `pt-${crypto.randomBytes(6).toString("hex")}`,
    tournamentId,
    teamName: teamName.trim(),
    teamLogo: teamLogoUrl,
    players: uploadedPlayers,
  });

  res.status(201).json({
    id: team.id,
    tournamentId: team.tournamentId,
    teamName: team.teamName,
    teamLogo: team.teamLogo,
    players: team.players,
  });
});

export const listProductionTeams = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.id ? String(req.query.id) : "";
  if (!tournamentId) {
    res.status(400).json({ message: "Tournament id is required" });
    return;
  }
  const teams = await ProductionTeamModel.find({ tournamentId })
    .sort({ createdAt: -1 })
    .lean();
  res.json(teams);
});
```

- [ ] **Step 2: Create routes**

Create `backend/src/routes/productionRoutes.ts`:

```ts
import { Router } from "express";
import {
  createProductionTeam,
  listProductionTeams,
  productionLogin,
} from "../controllers/productionController.js";
import { requireProduction } from "../middleware/auth.js";

const router = Router();

router.post("/login", productionLogin);
router.use(requireProduction);
router.post("/teams", createProductionTeam);
router.get("/teams", listProductionTeams);

export default router;
```

- [ ] **Step 3: Mount routes**

In `backend/src/routes/index.ts` add import `import productionRoutes from "./productionRoutes.js";` and add mount line `router.use("/production", productionRoutes);` after the teamData mount.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `backend/`
Expected: no output (success)

- [ ] **Step 5: Local API smoke test**

1. Start local backend in a background terminal: `npm run dev` in `backend/` (uses local Mongo + local `.env`; production creds fall back to `epixprod`/`epixprod`)
2. Run these checks (PowerShell; use a temp `.mjs` script for POSTs if quoting is painful):

```powershell
# wrong password -> 401
Invoke-RestMethod -Uri http://localhost:5000/api/production/login -Method Post -ContentType "application/json" -Body '{"username":"epixprod","password":"nope"}' -ErrorAction SilentlyContinue
# correct -> token
$r = Invoke-RestMethod -Uri http://localhost:5000/api/production/login -Method Post -ContentType "application/json" -Body '{"username":"epixprod","password":"epixprod"}'
$r.token
# no token -> 401 on list
Invoke-RestMethod -Uri "http://localhost:5000/api/production/teams?id=x" -ErrorAction SilentlyContinue
```

Expected: 401 message "Invalid username or password"; token string; 401 "Access denied. No token provided."

3. Stop the local backend when done.

- [ ] **Step 6: Commit**

```bash
$env:GIT_MASTER='1'; git add backend/src/controllers/productionController.ts backend/src/routes/productionRoutes.ts backend/src/routes/index.ts; git commit -m "feat(backend): production portal login and team endpoints"
```

---

### Task 4: Roster ZIP export endpoint

**Files:**
- Modify: `backend/src/controllers/productionController.ts` (append export handler + archiver import)
- Modify: `backend/src/routes/productionRoutes.ts` (add route)

**Interfaces:**
- Consumes: `fetchImageBuffer`, `sanitizePathSegment` from `../utils/imageFetch.js` (Task 2), `ProductionTeamModel` (Task 1), `archiver` (existing dependency)
- Produces: `GET /api/production/teams/export?id=<tournamentId>` (Bearer) → `200` streaming ZIP `production-<tournamentId>.zip` | `404 { message: "No teams to export" }`

- [ ] **Step 1: Add export handler**

Append to `backend/src/controllers/productionController.ts` (add `import archiver from "archiver";` and `import { fetchImageBuffer, sanitizePathSegment } from "../utils/imageFetch.js";` at top):

```ts
function csvField(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export const exportProductionRoster = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.id ? String(req.query.id) : "";
  if (!tournamentId) {
    res.status(400).json({ message: "Tournament id is required" });
    return;
  }

  const teams = await ProductionTeamModel.find({ tournamentId }).lean();
  if (teams.length === 0) {
    res.status(404).json({ message: "No teams to export" });
    return;
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="production-${tournamentId}.zip"`,
  );

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    } else {
      res.destroy(err);
    }
  });
  archive.pipe(res);

  const csvLines: string[] = ["Team,UID,Photo,Logo"];
  const usedLogoNames = new Set<string>();
  const fetchedPlayerExts = new Map<string, string>();

  for (const team of teams) {
    const logoBase = sanitizePathSegment(team.teamName || "team");
    let logoName = logoBase;
    let n = 2;
    while (usedLogoNames.has(logoName)) {
      logoName = `${logoBase}-${n++}`;
    }
    usedLogoNames.add(logoName);

    let logoExt = ".png";
    if (team.teamLogo) {
      const img = await fetchImageBuffer(team.teamLogo);
      if (img) {
        logoExt = img.ext;
        archive.append(img.buffer, { name: `Teams Logos/${logoName}${img.ext}` });
      }
    }
    const logoPath = `Teams Logos/${logoName}${logoExt}`;

    for (const player of team.players || []) {
      const uid = player.uid || "";
      let playerExt = fetchedPlayerExts.get(uid);
      if (playerExt === undefined) {
        playerExt = ".jpg";
        if (player.photo) {
          const img = await fetchImageBuffer(player.photo);
          if (img) {
            playerExt = img.ext;
            archive.append(img.buffer, { name: `Player Pics/${uid}${img.ext}` });
          }
        }
        fetchedPlayerExts.set(uid, playerExt);
      }
      const playerPath = `Player Pics/${uid}${playerExt}`;
      csvLines.push(
        [csvField(team.teamName || ""), uid, csvField(playerPath), csvField(logoPath)].join(","),
      );
    }
  }

  archive.append(csvLines.join("\n") + "\n", { name: "roster.csv" });
  await archive.finalize();
});
```

- [ ] **Step 2: Add route**

In `backend/src/routes/productionRoutes.ts` add import of `exportProductionRoster` and register BEFORE nothing needed (path is distinct):

```ts
router.get("/teams/export", exportProductionRoster);
```

after the existing `router.get("/teams", listProductionTeams);` line.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` in `backend/`
Expected: no output (success)

- [ ] **Step 4: Local export smoke test**

1. Start local backend: `npm run dev` in `backend/`
2. Login to get token (same call as Task 3 Step 5)
3. Create a tiny test team against a real local tournament id (list via `GET http://localhost:5000/api/tournaments`, take first `id`), using a 1×1 PNG dataURL for logo and one player photo. Example dataURL (valid 1×1 red PNG base64): `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`
4. `GET http://localhost:5000/api/production/teams/export?id=<thatId>` with Bearer token → save as `roster-test.zip`
5. Extract and verify against reference format:

```powershell
Expand-Archive .\roster-test.zip -DestinationPath .\roster-out
Get-ChildItem .\roster-out -Recurse
Get-Content .\roster-out\roster.csv
```

Expected structure: `roster.csv` with header `Team,UID,Photo,Logo` and one row; `Player Pics/<uid>.png`; `Teams Logos/<Team_Name>.png`.
6. Export a tournament with no teams → expect 404 JSON.
7. Stop local backend. Optionally delete the test team from local Mongo (collection `productionteams`).

- [ ] **Step 5: Commit**

```bash
$env:GIT_MASTER='1'; git add backend/src/controllers/productionController.ts backend/src/routes/productionRoutes.ts; git commit -m "feat(backend): production roster ZIP export"
```

---

### Task 5: Frontend production API client + `/production` login page

**Files:**
- Modify: `frontend/src/services/api/client.ts:11` (export API_BASE_URL)
- Create: `frontend/src/services/api/production.ts`
- Create: `frontend/src/app/production/page.tsx`

**Interfaces:**
- Consumes: `ApiError` class and `API_BASE_URL` from `./client`, existing design tokens (`bg-bg-primary`, `text-text-primary`, `border-border`, `bg-accent`, etc.), `useRouter` from `next/navigation`
- Produces:
  - `productionLogin(username: string, password: string): Promise<{ token: string }>` (throws `ApiError`)
  - `createProductionTeam(payload: { tournamentId: string; teamName: string; teamLogo: string; players: { uid: string; photo: string }[] }): Promise<{ id: string; teamName: string }>`
  - `listProductionTeams(tournamentId: string): Promise<ProductionTeam[]>`
  - `downloadProductionRoster(tournamentId: string): Promise<void>` (fetches ZIP blob and triggers browser download `production-<id>.zip`)
  - Type `ProductionTeam = { id: string; tournamentId: string; teamName: string; teamLogo: string; players: { uid: string; photo: string }[]; createdAt?: string }`
  - `productionToken(): string | null`, `setProductionToken(token: string): void`, `clearProductionToken(): void` (sessionStorage key `"production_token"`)
  - Page `/production` — login form; on success stores token and `router.push("/production/add-team")`

- [ ] **Step 1: Export API base**

In `frontend/src/services/api/client.ts` change line 11 to:

```ts
export const API_BASE_URL = getApiBaseUrl();
```

- [ ] **Step 2: Create production API helper**

Create `frontend/src/services/api/production.ts`:

```ts
import { ApiError, API_BASE_URL } from "./client";

const TOKEN_KEY = "production_token";

export interface ProductionPlayer {
  uid: string;
  photo: string;
}

export interface ProductionTeam {
  id: string;
  tournamentId: string;
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
  createdAt?: string;
}

export function productionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setProductionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearProductionToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function productionFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = productionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // not JSON
    }
    if (response.status === 401) {
      clearProductionToken();
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/production") &&
        window.location.pathname !== "/production"
      ) {
        window.location.assign("/production");
      }
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export async function productionLogin(
  username: string,
  password: string,
): Promise<{ token: string }> {
  return productionFetch<{ token: string }>("/production/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function createProductionTeam(payload: {
  tournamentId: string;
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
}): Promise<ProductionTeam> {
  return productionFetch<ProductionTeam>("/production/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listProductionTeams(
  tournamentId: string,
): Promise<ProductionTeam[]> {
  return productionFetch<ProductionTeam[]>(
    `/production/teams?id=${encodeURIComponent(tournamentId)}`,
  );
}

export async function downloadProductionRoster(tournamentId: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = productionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(
    `${API_BASE_URL}/production/teams/export?id=${encodeURIComponent(tournamentId)}`,
    { headers },
  );
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // not JSON
    }
    if (response.status === 401) clearProductionToken();
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `production-${tournamentId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Create the login page**

Create `frontend/src/app/production/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/services/api";
import {
  productionLogin,
  productionToken,
  setProductionToken,
} from "@/services/api/production";

export default function ProductionLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (productionToken()) {
      router.replace("/production/add-team");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await productionLogin(username.trim(), password);
      setProductionToken(res.token);
      router.push("/production/add-team");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-secondary p-8 shadow-2xl shadow-accent/10">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
            Organizer &amp; Crew Portal
          </span>
          <h1 className="text-2xl font-black uppercase tracking-wider text-text-primary">
            Production Desk
          </h1>
          <p className="mt-2 text-sm text-text-primary/60">
            Sign in to manage tournament teams and roster exports.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              autoComplete="username"
              className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-xl bg-accent px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign In to Production Workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-primary/40">
          EPIX PRODUCTION · Tournament teams, organized.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit` in `frontend/`
Expected: no output (success)

- [ ] **Step 5: Commit**

```bash
$env:GIT_MASTER='1'; git add frontend/src/services/api/client.ts frontend/src/services/api/production.ts frontend/src/app/production/page.tsx; git commit -m "feat(frontend): production desk login page and API client"
```

---

### Task 6: `/production/add-team` page

**Files:**
- Create: `frontend/src/app/production/add-team/page.tsx`

**Interfaces:**
- Consumes: `createProductionTeam`, `downloadProductionRoster`, `productionToken`, `clearProductionToken`, `ProductionTeam` from `@/services/api/production`; `getTournaments` from `@/services/api` (public endpoint); `ApiError` from `@/services/api`; `Tournament` type from `@/types/tournament`
- Produces: page `/production/add-team` (query `?id=<tournamentId>`); exports nothing else

- [ ] **Step 1: Create the page**

Create `frontend/src/app/production/add-team/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ApiError, getTournaments } from "@/services/api";
import {
  clearProductionToken,
  createProductionTeam,
  downloadProductionRoster,
  productionToken,
  type ProductionTeam,
} from "@/services/api/production";
import type { Tournament } from "@/types/tournament";

const MAX_PLAYERS = 16;

interface PlayerRow {
  key: string;
  uid: string;
  photoDataUrl: string;
  fileName: string;
}

function rowKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function ProductionAddTeamPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [savedTeam, setSavedTeam] = useState<ProductionTeam | null>(null);
  const [teamCount, setTeamCount] = useState<number | null>(null);
  const photoPickerRef = useRef<HTMLInputElement>(null);
  const logoPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!productionToken()) {
      router.replace("/production");
      return;
    }
    const fromUrl = new URLSearchParams(window.location.search).get("id") || "";
    setTournamentId(fromUrl);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    getTournaments()
      .then((list) => {
        setTournaments(list);
        setTournamentId((current) => current || list[0]?.id || "");
      })
      .catch(() => setError("Failed to load tournaments."));
  }, [ready]);

  const refreshCount = useCallback(async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/production/teams?id=${encodeURIComponent(id)}`,
      );
      if (res.ok) {
        const list = (await res.json()) as ProductionTeam[];
        setTeamCount(list.length);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (ready && tournamentId) refreshCount(tournamentId);
  }, [ready, tournamentId, refreshCount]);

  const handleLogout = () => {
    clearProductionToken();
    router.replace("/production");
  };

  const handleTournamentChange = (value: string) => {
    setTournamentId(value);
    setSavedTeam(null);
    setError("");
    const url = value
      ? `/production/add-team?id=${encodeURIComponent(value)}`
      : "/production/add-team";
    window.history.replaceState(null, "", url);
  };

  const handleLogoPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      setLogoDataUrl(await fileToDataUrl(file));
      setLogoFileName(file.name);
      setError("");
    } catch {
      setError("Could not read the logo file.");
    }
  };

  const handlePhotosPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PLAYERS - players.length;
    if (room <= 0) {
      setError(`Maximum ${MAX_PLAYERS} players allowed.`);
      return;
    }
    const chosen = Array.from(files).slice(0, room);
    try {
      const rows: PlayerRow[] = [];
      for (const file of chosen) {
        rows.push({
          key: rowKey(),
          uid: "",
          photoDataUrl: await fileToDataUrl(file),
          fileName: file.name,
        });
      }
      setPlayers((prev) => [...prev, ...rows]);
      setError("");
    } catch {
      setError("Could not read one of the photos.");
    }
  };

  const updatePlayerUid = (key: string, uid: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.key === key ? { ...p, uid: uid.replace(/\D/g, "").slice(0, 32) } : p)),
    );
  };

  const replacePlayerPhoto = async (key: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setPlayers((prev) =>
        prev.map((p) => (p.key === key ? { ...p, photoDataUrl: dataUrl, fileName: file.name } : p)),
      );
    } catch {
      setError("Could not read the replacement photo.");
    }
  };

  const removePlayer = (key: string) => {
    setPlayers((prev) => prev.filter((p) => p.key !== key));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSavedTeam(null);
    if (!tournamentId) {
      setError("Choose a tournament first.");
      return;
    }
    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }
    if (!logoDataUrl) {
      setError("Team logo is required.");
      return;
    }
    for (const p of players) {
      if (!/^\d{1,32}$/.test(p.uid)) {
        setError("Every player photo needs a numeric UID.");
        return;
      }
    }
    setBusy(true);
    try {
      const team = await createProductionTeam({
        tournamentId,
        teamName: teamName.trim(),
        teamLogo: logoDataUrl,
        players: players.map((p) => ({ uid: p.uid, photo: p.photoDataUrl })),
      });
      setSavedTeam(team);
      setTeamName("");
      setLogoDataUrl("");
      setLogoFileName("");
      setPlayers([]);
      if (photoPickerRef.current) photoPickerRef.current.value = "";
      if (logoPickerRef.current) logoPickerRef.current.value = "";
      refreshCount(tournamentId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearProductionToken();
        router.replace("/production");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to save the team.");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!tournamentId || downloading) return;
    setDownloading(true);
    setError("");
    try {
      await downloadProductionRoster(tournamentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
              EPIX Production
            </span>
            <h1 className="text-xl font-black uppercase tracking-wider text-text-primary">
              Add Team Manually
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-primary/50">
              {teamCount != null ? `${teamCount} team${teamCount === 1 ? "" : "s"} saved` : ""}
            </span>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!tournamentId || downloading || (teamCount != null && teamCount === 0)}
              className="cursor-pointer rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {downloading ? "Preparing..." : "Download roster ZIP"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-primary/70 transition-colors hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </header>

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

        {savedTeam && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              ✓ Team added successfully
            </p>
            <h2 className="mt-2 text-lg font-bold text-text-primary">
              Team &quot;{savedTeam.teamName}&quot; is saved!
            </h2>
            <p className="mt-1 text-sm text-text-primary/60">
              This team is stored in the production list only.
            </p>
            <button
              type="button"
              onClick={() => setSavedTeam(null)}
              className="mt-4 cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-bold text-text-primary hover:bg-accent-hover"
            >
              + Add Another Team
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl border border-border bg-bg-secondary p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-text-primary">
              01 Team essentials
            </h2>
            <div className="space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => logoPickerRef.current?.click()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-sm font-semibold text-text-primary/70 transition-colors hover:border-accent/50"
                >
                  {logoDataUrl ? `Logo: ${logoFileName || "selected"}` : "↑ Upload team logo"}
                </button>
                <p className="mt-1.5 text-xs text-text-primary/40">
                  Choose PNG, JPG, or WebP. Required.
                </p>
                <input
                  ref={logoPickerRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleLogoPick(e.target.files)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
                  Team name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Falcon Esports"
                  className="w-full rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-bg-secondary p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">
                02 Player media &amp; UIDs
              </h2>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-primary/40">
                Optional
              </span>
            </div>
            <p className="mb-3 text-xs text-text-primary/50">
              Add player photos. Each photo needs its numeric Game UID. Up to {MAX_PLAYERS} players.
            </p>
            <button
              type="button"
              onClick={() => photoPickerRef.current?.click()}
              disabled={players.length >= MAX_PLAYERS}
              className="mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-bg-primary px-4 py-6 text-sm font-semibold text-text-primary/70 transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Choose player photos
            </button>
            <input
              ref={photoPickerRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePhotosPick(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="space-y-3">
              {players.map((p) => (
                <div
                  key={p.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-primary p-3"
                >
                  <Image
                    src={p.photoDataUrl}
                    alt={p.fileName}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-lg object-cover"
                    unoptimized
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-text-primary/50">{p.fileName}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.uid}
                      onChange={(e) => updatePlayerUid(p.key, e.target.value)}
                      placeholder="Player UID (required)"
                      className="mt-1 w-full rounded-lg border border-border bg-bg-secondary px-3 py-1.5 font-mono text-sm text-text-primary placeholder:text-text-primary/25 focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-lg border border-border px-2 py-1 text-xs font-semibold text-text-primary/60 hover:bg-white/5">
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          replacePlayerPhoto(p.key, e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.key)}
                      className="cursor-pointer rounded-lg border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !tournamentId}
            className="w-full cursor-pointer rounded-xl bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save team to tournament →"}
          </button>
        </form>

        <footer className="mt-8 text-center text-xs text-text-primary/40">
          EPIX PRODUCTION · Tournament teams, organized.
        </footer>
      </div>
    </div>
  );
}
```

Note: `refreshCount` intentionally uses raw fetch only for the count badge to avoid over-fetching complexity; it goes through the same API base env var. If preferred, replace with `listProductionTeams(tournamentId)` from the production helper (also fine).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` in `frontend/`
Expected: no output (success)

- [ ] **Step 3: Local UI check (optional but recommended)**

1. `npm run dev` in `backend/` and `npm run dev` in `frontend/` (separate terminals)
2. Open `http://localhost:3000/production` → login with `epixprod`/`epixprod` → lands on add-team
3. Without token, opening `/production/add-team` directly bounces to `/production`
4. Add a team (1×1 PNG logo + one photo + UID) against a local tournament → success panel shows
5. Click Download roster ZIP → file `production-<id>.zip` downloads with expected structure

- [ ] **Step 4: Commit**

```bash
$env:GIT_MASTER='1'; git add frontend/src/app/production/add-team/page.tsx; git commit -m "feat(frontend): production add-team page with roster download"
```

---

### Task 7: Deploy, env, smoke test, push

**Files:**
- No code files; deployment only

**Interfaces:**
- Consumes: Tasks 1–6 deployed; Vercel project `epix-backend` (aliases `api.epixesports.com`) and `frontend` (alias `www.epixesports.com`)
- Produces: live `/production` and `/production/add-team` on `www.epixesports.com`

- [ ] **Step 1: Pre-deploy verification**

Run: `npx tsc --noEmit` in `backend/` AND `frontend/`
Expected: both silent success

- [ ] **Step 2: Deploy backend**

```powershell
npx vercel --prod --yes   # run in backend/
npx vercel ls             # confirm newest deployment Ready, Production
```

- [ ] **Step 3: Set production env credentials**

Choose final creds with the site owner (placeholder until then: `epixprod`/`epixprod`). Set on Vercel backend project (production env):

```powershell
# from backend/ — paste value when prompted, or pipe:
"epixprod" | npx vercel env add PRODUCTION_USERNAME production
"epixprod" | npx vercel env add PRODUCTION_PASSWORD production
```

Redeploy backend so env takes effect: `npx vercel --prod --yes` again.

- [ ] **Step 4: Deploy frontend**

```powershell
npx vercel --prod --yes   # run in frontend/
npx vercel ls             # confirm Ready
```

- [ ] **Step 5: Prod smoke test**

```powershell
# login page exists
(Invoke-WebRequest -Uri "https://www.epixesports.com/production" -UseBasicParsing).StatusCode   # expect 200
# add-team without token redirects client-side (page itself 200)
(Invoke-WebRequest -Uri "https://www.epixesports.com/production/add-team" -UseBasicParsing).StatusCode  # expect 200
# API login with prod creds
Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/login" -Method Post -ContentType "application/json" -Body '{"username":"<PROD_USER>","password":"<PROD_PASS>"}'
# no token -> 401
Invoke-RestMethod -Uri "https://api.epixesports.com/api/production/teams?id=t-l2cqhxnks" -ErrorAction SilentlyContinue
```

Expected: pages 200; login returns `{ success: true, token }`; list without token 401.

- [ ] **Step 6: Manual browser check on prod**

1. Open `https://www.epixesports.com/production` → sign in with prod creds
2. Tournament dropdown shows "Epix Invitational League"
3. Add one real test team (use a throwaway logo/photo) → success panel
4. Download roster ZIP → unzip and confirm `roster.csv` + `Player Pics/` + `Teams Logos/` match the reference layout
5. Confirm the team does NOT appear on the public tournament page or in the admin registrations list
6. Keep or remove the test team at owner's discretion (removal: delete docs from Atlas `productionteams` collection)

- [ ] **Step 7: Push**

```powershell
$env:GIT_MASTER='1'; git push
```

Expected: all Task 1–6 commits land on `origin/master`.

---

## Self-Review Notes (plan author)

1. **Spec coverage:** login env creds (T1+T3+T7), separate collection (T1+T3), add-team form +16 limit + replace/remove (T6), success panel + add another (T6), per-tournament select + `?id=` (T6), ZIP layout matching reference (T4), not linked in nav (no task touches nav — T6 page is standalone), 401 → `/production` (T5 helper), empty export 404 (T4).
2. **Placeholders:** none — every step has full code or exact commands. Prod credential values are owner-chosen by design (spec).
3. **Type consistency:** `requireProduction` defined T1, used T3; `ProductionTeamModel` T1 → T3/T4; `sanitizePathSegment`/`fetchImageBuffer` T2 → T4; `productionToken`/`createProductionTeam`/`downloadProductionRoster` T5 → T6; `ProductionTeam` interface T5 → T6.
