# Registrations ZIP Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin/partner downloads tournament registrations as a ZIP containing `registrations.json` plus team logos and member pictures (Cloudinary URLs downloaded into per-team folders).

**Architecture:** Backend streams a ZIP via `GET /api/tournaments/registrations/export` (`requireStaff`). Controller reuses `getAllRegistrations`, fetches image URLs with timeout, appends buffers with `archiver`. Frontend adds an Export ZIP button on the Admin Registrations tab that fetches the blob and triggers a browser download.

**Tech Stack:** Express 4, TypeScript (NodeNext ESM), `archiver`, Next.js 16 App Router, existing `apiClient` auth pattern.

## Global Constraints

- Repo root: `D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master`
- Every git command MUST be prefixed `$env:GIT_MASTER='1';` (PowerShell). Work on master.
- Stage only task files. Leave pre-existing dirty files untouched: `backend/src/data/seed.ts`, `backend/src/data/seedReviews.ts`(deleted), `backend/src/utils/email.ts`, frontend batch (about/, contact/, dashboard/, globals.css, rules-terms/, HeroSection.tsx, CarouselControls.tsx, SectionHeader.tsx, StatusBadge.tsx, TournamentCard.tsx, TournamentCarousel.tsx, TournamentFilters.tsx), untracked: `.firecrawl/`, `backend/.gitignore`, `backend/scripts/sync-atlas-to-local.cjs`, `frontend/public/images/shop/`, `frontend/src/app/wallet/`, `frontend/src/features/wallet/`, `frontend/src/services/api/admin.ts`, `frontend/src/services/api/wallet.ts`, `start-local.ps1`.
- No automated test framework in backend or frontend. Verification gate is `npx tsc --noEmit` plus manual curl/UI checks.
- Backend package is ESM (`"type": "module"`) with `moduleResolution: NodeNext` — relative imports must use `.js` suffix.
- Deploy backend with `vercel --prod --yes` from `backend/` after backend tasks. Frontend deploys on Vercel push (or `vercel --prod` from `frontend/` if needed).
- API base: `https://api.epixesports.com/api`. Admin token from `sessionStorage.admin_token`.
- ZIP root folder name: `registrations-export/`.
- Image fetch timeout: 10 seconds. On failure: skip file, keep URL in JSON.

---

### Task 1: Add `archiver` dependency

**Files:**
- Modify: `backend/package.json`
- Modify: `package-lock.json` (repo root — lockfile is at root)

**Interfaces:**
- Produces: `archiver` available for `import archiver from "archiver"` in Task 2.

- [x] **Step 1: Install archiver**

Run from repo root (PowerShell):

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
npm install archiver --workspace=backend
npm install -D @types/archiver --workspace=backend
```

If workspace install fails, run inside `backend/`:

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\backend"
npm install archiver
npm install -D @types/archiver
```

- [x] **Step 2: Verify package.json**

Expected in `backend/package.json` dependencies:

```json
"archiver": "^7.0.1"
```

and in devDependencies (or dependencies if types land there):

```json
"@types/archiver": "^6.0.3"
```

(Exact semver may differ slightly; package must be present.)

- [x] **Step 3: Typecheck still passes**

Run:

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\backend"
npx tsc --noEmit
```

Expected: no errors (archiver not imported yet).

- [x] **Step 4: Commit**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
$env:GIT_MASTER='1'
git add backend/package.json package-lock.json
git commit -m "chore(backend): Add archiver for ZIP export"
```

If `backend/package-lock.json` exists and changed, add it too. Do not stage other dirty files.

---

### Task 2: Backend export controller + route

**Files:**
- Modify: `backend/src/controllers/tournamentController.ts` (append new export; leave existing handlers unchanged)
- Modify: `backend/src/routes/tournamentRoutes.ts` (add one route line before `/:id`)

**Interfaces:**
- Consumes: `getAllRegistrations(tournamentId?: string, memberUid?: string): Promise<any[]>` from `../services/tournamentService.js` (already imported in controller).
- Consumes: `requireStaff` from `../middleware/auth.js` (already imported in routes).
- Produces: `GET /api/tournaments/registrations/export` → `200` `application/zip` body; optional `?tournamentId=`.
- Produces: named export `exportRegistrations` from controller module.

- [x] **Step 1: Add controller handler**

Append to `backend/src/controllers/tournamentController.ts` (after existing exports; add imports at top as needed):

```typescript
import archiver from "archiver";
import type { Response } from "express";

function sanitizePathSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "team";
}

function extFromUrlOrType(url: string, contentType: string | null): string {
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

async function fetchImageBuffer(
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

export const exportRegistrations = asyncHandler(
  async (req: Request, res: Response) => {
    const tournamentId = req.query.tournamentId
      ? String(req.query.tournamentId)
      : undefined;
    const regs = await getAllRegistrations(tournamentId);

    const filename = tournamentId
      ? `registrations-${tournamentId}.zip`
      : "registrations-export.zip";

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
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

    const jsonEntries: any[] = [];
    const usedFolders = new Set<string>();

    for (const reg of regs) {
      const baseTeam =
        sanitizePathSegment(reg.teamName || "") !== "team" &&
        reg.teamName
          ? sanitizePathSegment(reg.teamName)
          : `team-${sanitizePathSegment(reg.id || "unknown")}`;
      let folder = baseTeam;
      let n = 2;
      while (usedFolders.has(folder)) {
        folder = `${baseTeam}-${n++}`;
      }
      usedFolders.add(folder);

      const entry: any = {
        teamName: reg.teamName || "",
        teamLogo: reg.teamLogo || "",
        group: reg.group || "",
        status: reg.status || "",
        whatsapp: reg.whatsapp || "",
        tournamentId: reg.tournamentId || "",
        members: [],
      };

      if (reg.teamLogo) {
        const img = await fetchImageBuffer(reg.teamLogo);
        if (img) {
          const rel = `${folder}/team-logo${img.ext}`;
          archive.append(img.buffer, { name: rel });
          entry.teamLogoFile = rel;
        }
      }

      for (const m of reg.members || []) {
        const member: any = {
          uid: m.uid || "",
          inGameName: m.inGameName || "",
          picture: m.picture || "",
        };
        if (m.picture) {
          const img = await fetchImageBuffer(m.picture);
          if (img) {
            const safeName = sanitizePathSegment(m.inGameName || "player");
            const safeUid = sanitizePathSegment(m.uid || "uid");
            const rel = `${folder}/${safeUid}-${safeName}${img.ext}`;
            archive.append(img.buffer, { name: rel });
            member.pictureFile = rel;
          }
        }
        entry.members.push(member);
      }

      jsonEntries.push(entry);
    }

    archive.append(JSON.stringify(jsonEntries, null, 2), {
      name: "registrations-export/registrations.json",
    });
    // Also place team folders under the same root:
    // archiver paths above use bare team folders — fix by rewriting names.
    // NOTE: appends above used `${folder}/...`; wrap root in finalize below
    // by having used `registrations-export/${folder}/...` instead.
    await archive.finalize();
  },
);
```

**Important correction — use root-prefixed paths for images.** Replace every image `name:` in Step 1 with `registrations-export/${folder}/...`:

```typescript
const rel = `registrations-export/${folder}/team-logo${img.ext}`;
// ...
const rel = `registrations-export/${folder}/${safeUid}-${safeName}${img.ext}`;
// and store entry.teamLogoFile / member.pictureFile as `${folder}/team-logo${img.ext}` etc.
// (relative inside the registrations-export/ root, matching the spec)
```

Spec JSON paths are relative to `registrations-export/` (e.g. `FURIOUS4T7/team-logo.png`). ZIP entry paths are full (`registrations-export/FURIOUS4T7/team-logo.png`).

Ensure top of file has:

```typescript
import type { Request, Response } from "express";
```

(`Request` already imported; extend the existing import line to include `Response` if not present. `asyncHandler`, `getAllRegistrations` already imported.)

- [x] **Step 2: Add route**

In `backend/src/routes/tournamentRoutes.ts`, import `exportRegistrations` and insert **before** `router.get("/:id", getTournamentById)`:

```typescript
import {
  getTournamentById,
  getTournaments,
  createTournament,
  deleteTournament,
  updateTournament,
  registerTournament,
  getRegistrations,
  exportRegistrations,
  updateRegStatus,
  deleteRegistration,
  updateRegStats,
  updateRegSlot,
  notifyTournament,
} from "../controllers/tournamentController.js";
```

Route (after existing `GET /registrations` line is fine, but MUST be before `/:id`):

```typescript
router.get("/registrations/export", requireStaff, exportRegistrations);
router.get("/registrations", requireAuth, getRegistrations);
```

Final order near registrations:

```typescript
router.get("/registrations/export", requireStaff, exportRegistrations);
router.get("/registrations", requireAuth, getRegistrations);
router.put("/registrations/:id/status", requireStaff, updateRegStatus);
// ... existing ...
router.get("/:id", getTournamentById);
```

- [x] **Step 3: Typecheck**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\backend"
npx tsc --noEmit
```

Expected: PASS.

- [x] **Step 4: Commit**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
$env:GIT_MASTER='1'
git add backend/src/controllers/tournamentController.ts backend/src/routes/tournamentRoutes.ts
git commit -m "feat(backend): ZIP export of registrations with team images"
```

---

### Task 3: Deploy backend + curl verify

**Files:**
- None (deploy only)

**Interfaces:**
- Consumes: Task 2 route on production `https://api.epixesports.com`.

- [x] **Step 1: Deploy**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\backend"
npx tsc --noEmit
if ($?) { npx vercel --prod --yes }
```

Expected: aliased to `https://api.epixesports.com`.

- [x] **Step 2: Unauthenticated → 401**

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
  Invoke-WebRequest -Uri "https://api.epixesports.com/api/tournaments/registrations/export" -UseBasicParsing
  Write-Host "UNEXPECTED 200"
} catch {
  Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}
```

Expected: `401`.

- [x] **Step 3: Authenticated export → ZIP bytes**

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
# Admin verify to get token (password: use env admin password; if unknown, use known working admin login from earlier session)
$login = Invoke-RestMethod -Uri "https://api.epixesports.com/api/auth/login" -Method Post -Body '{"uid":"5123456789"}' -ContentType "application/json"
# Regular user token is NOT staff — export should 403. Confirm staff path with admin token below if available.
```

If admin password known:

```powershell
$adm = Invoke-RestMethod -Uri "https://api.epixesports.com/api/auth/verify-admin" -Method Post -Body '{"password":"<ADMIN_PASSWORD>"}' -ContentType "application/json"
$hdr = @{ Authorization = "Bearer $($adm.token)" }
$out = Join-Path $env:TEMP "registrations-export.zip"
Invoke-WebRequest -Uri "https://api.epixesports.com/api/tournaments/registrations/export" -Headers $hdr -OutFile $out
Write-Host "Saved: $out size=$((Get-Item $out).Length)"
# Inspect:
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($out)
$zip.Entries | ForEach-Object { $_.FullName }
$zip.Dispose()
```

Expected: ZIP contains `registrations-export/registrations.json` and team folders with images (when Cloudinary URLs exist). Non-staff token → `403`.

- [x] **Step 4: No code commit** (deploy only)

---

### Task 4: Frontend `exportRegistrations` API helper

**Files:**
- Modify: `frontend/src/services/api/tournaments.ts`

**Interfaces:**
- Consumes: `getApiBaseUrl` is **not** exported from `client.ts`. Use same relative-endpoint pattern: export will call `fetch` with full base. Prefer adding a small export that reuses fetch + sessionStorage token like `apiClient`, but returns Blob.

**Produces:** `exportRegistrations(tournamentId?: string): Promise<Blob>` in `@/services/api/tournaments`.

- [x] **Step 1: Add function to `frontend/src/services/api/tournaments.ts`**

Append:

```typescript
export async function exportRegistrations(tournamentId?: string): Promise<Blob> {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined"
      ? `http://${window.location.hostname}:5000/api`
      : "http://localhost:5000/api");

  const qs = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : "";
  const headers: Record<string, string> = {};

  if (typeof window !== "undefined") {
    const adminToken = sessionStorage.getItem("admin_token");
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    } else {
      const session = sessionStorage.getItem("epix_session_user");
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.token) headers["Authorization"] = `Bearer ${parsed.token}`;
        } catch {}
      }
    }
  }

  const response = await fetch(`${base}/tournaments/registrations/export${qs}`, {
    headers,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* not JSON */
    }
    throw new Error(message || "Export failed");
  }

  return response.blob();
}
```

- [x] **Step 2: Typecheck frontend**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\frontend"
npx tsc --noEmit
```

Expected: PASS.

- [x] **Step 3: Commit**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
$env:GIT_MASTER='1'
git add frontend/src/services/api/tournaments.ts
git commit -m "feat(frontend): exportRegistrations ZIP download helper"
```

---

### Task 5: Admin Export ZIP button

**Files:**
- Modify: `frontend/src/app/admin/page.tsx`
  - Import: add `exportRegistrations` to existing tournaments import (line ~5)
  - State: near other useState in component (~line 135+)
  - Handler: near other handlers
  - UI: Registrations List header (~lines 1923–1932)

**Interfaces:**
- Consumes: `exportRegistrations(tournamentId?: string): Promise<Blob>` from Task 4.
- Consumes: `showAlert` from `useAlert()` (already in component).
- Consumes: `activeRegTournamentId` state (already exists).
- Produces: button with text `Export ZIP`; download file `registrations-<id>.zip` or `registrations-export.zip`.

- [x] **Step 1: Extend import**

Change line 5 import from `@/services/api/tournaments` to include `exportRegistrations`:

```typescript
import { getTournaments, createTournament, deleteTournament, updateTournament, fetchAllRegistrations, updateRegistrationStatus, eliminateRegistration, updateRegistrationStats, updateRegistrationSlot, sendTournamentNotifications, exportRegistrations, type Registration } from "@/services/api/tournaments";
```

- [x] **Step 2: Add state + handler**

After existing state declarations (e.g. near `const [registrations, setRegistrations] = useState<Registration[]>([]);`):

```typescript
const [isExporting, setIsExporting] = useState(false);
```

Add handler with other handlers (e.g. after `handleEliminateTeam`):

```typescript
const handleExportZip = async () => {
  if (isExporting) return;
  setIsExporting(true);
  try {
    const blob = await exportRegistrations(activeRegTournamentId || undefined);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeRegTournamentId
      ? `registrations-${activeRegTournamentId}.zip`
      : "registrations-export.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showAlert("Export downloaded.", "success");
  } catch (err: any) {
    console.error("Export failed:", err);
    showAlert(err.message || "Failed to export registrations.", "error");
  } finally {
    setIsExporting(false);
  }
};
```

Verify `activeRegTournamentId` exists in scope (it does — used for tab selection). If export should always include **all** registrations regardless of tab filter, call `exportRegistrations()` with no args; **per design, pass active tournament id** for scoped export.

- [x] **Step 3: Add button in header**

In the Registrations List card header, next to the count badge (~line 1923):

Current:

```tsx
<div className="p-6 border-b border-border bg-gradient-to-r from-accent/10 to-transparent flex items-center justify-between">
  <div>
    <h3 className="font-bold admin-section-title">Registrations List</h3>
    <p className="text-xs text-text-primary/40 mt-1">
      Viewing registered teams and solo players for the selected tournament
    </p>
  </div>
  <span className="px-3 py-1 rounded-lg bg-white/5 border border-border text-xs font-semibold text-text-primary/60">
    {selectedTournRegistrations.length} Teams/Players
  </span>
</div>
```

Replace the right-side wrapper to hold badge + button:

```tsx
<div className="flex items-center gap-3">
  <span className="px-3 py-1 rounded-lg bg-white/5 border border-border text-xs font-semibold text-text-primary/60">
    {selectedTournRegistrations.length} Teams/Players
  </span>
  <button
    type="button"
    onClick={handleExportZip}
    disabled={isExporting}
    className="px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/40 text-accent text-xs font-semibold hover:bg-accent/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
  >
    {isExporting ? "Exporting…" : "Export ZIP"}
  </button>
</div>
```

- [x] **Step 4: Typecheck + lint**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\frontend"
npx tsc --noEmit
npm run lint
```

Expected: PASS (lint may warn on pre-existing issues in this large file — no new errors).

- [x] **Step 5: Commit**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
$env:GIT_MASTER='1'
git add frontend/src/app/admin/page.tsx
git commit -m "feat(admin): Export ZIP button for registrations"
```

---

### Task 6: Deploy frontend + manual UI verify

**Files:**
- None (deploy only)

**Interfaces:**
- Consumes: Tasks 1–5.

- [x] **Step 1: Push + deploy frontend**

If frontend is on Vercel Git integration, push master. Otherwise:

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
$env:GIT_MASTER='1'
git push origin master
cd frontend
npx vercel --prod --yes
```

- [x] **Step 2: Manual UI check**

1. Open `https://www.epixesports.com/admin`
2. Log in as admin
3. Registrations tab → select a tournament
4. Click **Export ZIP**
5. Browser downloads `registrations-<id>.zip` to Downloads
6. Unzip: confirm `registrations.json` + `registrations-export/<Team>/` images (or JSON-only if no image URLs)

- [x] **Step 3: Final status**

```powershell
cd "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master"
$env:GIT_MASTER='1'
git status -sb
git log --oneline -6
```

Expected: feature commits pushed; pre-existing dirty files still uncommitted.

---

## Self-Review notes (plan writer)

- Spec coverage: ZIP structure ✓ Task 2; JSON fields + `*File` paths ✓ Task 2; route/auth/filter ✓ Task 2–3; frontend blob download ✓ Task 4–5; error handling (skip images, empty array, alerts) ✓ Task 2/5; testing steps ✓ Task 3/6 (tsc + manual; no unit test runner in repo).
- Placeholders: admin password in Task 3 Step 3 marked `<ADMIN_PASSWORD>` — operator supplies; curl 401/403 checks work without it.
- Type consistency: `exportRegistrations` name used in controller, route, frontend helper, and UI import — same spelling throughout.
