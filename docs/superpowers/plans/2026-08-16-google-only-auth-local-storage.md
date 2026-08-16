# Google-Only Sign-In + Local D: Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove UID sign-in from the UI (Google-only), move UID entry to the profile page, and migrate all storage (MongoDB data files + pictures) to the PC's D: drive, served to the live Render backend through a Cloudflare Tunnel.

**Architecture:** Frontend (Vercel) and backend (Render) stay as-is. The PC runs a local MongoDB (data on `D:\epix-data\db`) and a small file server (port 8081, files on `D:\epix-data\files`, one folder per team containing all players' pictures). A Cloudflare Tunnel exposes `files.epixesports.com → localhost:8081` (HTTP) and `mongo.epixesports.com → localhost:27017` (TCP). The Render backend writes images to the file server and reads/writes MongoDB through the tunnel.

**Tech Stack:** Node 24 (PC), Express 4 + Mongoose 8 (backend), Next.js 16 (frontend), MongoDB 8.3 (local, reinstall needed), cloudflared 2026.8.2 (installed at `C:\Program Files (x86)\cloudflared\cloudflared.exe`), Render + Vercel (hosting).

## Global Constraints

- **DO NOT commit unrelated dirty files** — repo has pre-existing uncommitted changes (backend/src/data/seed.ts, seedReviews.ts, several frontend files, untracked frontend/src/services/api/admin.ts). Each commit below stages ONLY the files listed in its task.
- **Comment hook**: keep comments only where they explain a non-obvious decision; no filler comments.
- **AGENTS.md**: read Next.js docs in `node_modules/next/dist/docs/` before writing frontend code.
- **PowerShell 5.1 quirks**: no `&&`; use `; if ($?) { ... }`; `Start-Process` has no `-Environment` (set `$env:` in-session first); shell is NOT elevated (UAC scripts needed for service installs).
- **Backend entry**: `backend/dist/server.js` after `npm run build`.
- **Midasbuy lookup is BROKEN** (page redesign, no JWT token in HTML) — verified against live backend. In-game picture feature must degrade gracefully; fixing the scraper is OUT OF SCOPE.
- **Credentials**: local Mongo app password `kKQYbcpo58NyOIeaZh1i` in `%LOCALAPPDATA%\epix-sync\local-app-pass.txt`; Atlas URI in `%LOCALAPPDATA%\epix-sync\atlas-uri.txt`. Tunnel secrets must NOT be committed.
- **Existing local Mongo data** (16 docs, auth-enabled) lives at `C:\Program Files\MongoDB\Server\8.3\data` — **MongoDB binaries are MISSING** (no mongod.exe, no service, no mongosh). Reinstall required before moving data.

---

### Task 1: Reinstall MongoDB on PC + move data to D: + re-enable auth

**Files:**
- Create: `D:\epix-data\db\` (data dir), `D:\epix-data\mongod.cfg`
- System: MongoDB 8.3 service (via elevated install script)
- Test: `D:\epix-data\db\` contains WiredTiger files; mongod accepts authenticated connection

**Interfaces:**
- Produces: local MongoDB reachable at `mongodb://127.0.0.1:27017/pubg-tournaments` with auth, data on D:

- [ ] **Step 1: Reinstall MongoDB 8.3 via winget**

```powershell
winget install MongoDB.Server --version 8.3 --accept-source-agreements --accept-package-agreements
```

Expected: install completes; verify:
```powershell
Get-ChildItem "C:\Program Files\MongoDB\Server\8.3\bin" | Select-Object Name
```
Expected: `mongod.exe` present. (If winget version unavailable, download MSI from https://www.mongodb.com/try/download/community and install with default path.)

- [ ] **Step 2: Stop any mongod and copy data to D:**

MongoDB is NOT currently running (no service). Copy the existing data directory:

```powershell
New-Item -ItemType Directory -Path "D:\epix-data" -Force | Out-Null
Copy-Item "C:\Program Files\MongoDB\Server\8.3\data\*" "D:\epix-data\db" -Recurse -Force
Get-ChildItem "D:\epix-data\db" | Measure-Object | Select-Object Count
```

Expected: same file set as source (WiredTiger files, collection-*.wt, index-*.wt, storage.bson).

- [ ] **Step 3: Create mongod.cfg on D:**

```yaml
systemLog:
  destination: file
  path: D:\epix-data\mongod.log
  logAppend: true
storage:
  dbPath: D:\epix-data\db
net:
  bindIp: 127.0.0.1
  port: 27017
security:
  authorization: enabled
```

- [ ] **Step 4: Install and start MongoDB as a Windows service (elevated)**

Create `D:\epix-data\install-mongo.ps1` (run via UAC since shell is not elevated):

```powershell
& "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --config "D:\epix-data\mongod.cfg" --install --serviceName "MongoDB"
Start-Service MongoDB
Get-Service MongoDB
```

Run it elevated:
```powershell
Start-Process powershell -Verb RunAs -ArgumentList '-File','D:\epix-data\install-mongo.ps1'
```

Expected: service "MongoDB" status Running.

- [ ] **Step 5: Verify auth + data survived the move**

Create the admin user first if it doesn't exist. Since the DB already has auth enabled and the previous admin credentials may be recoverable from `%LOCALAPPDATA%\epix-sync\sync.log` (grep for "mongodb://"), try connecting:

```powershell
# from backend dir (mongodb driver available):
node -e "const {MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://admin:<PASS_FROM_LOG>@127.0.0.1:27017/pubg-tournaments?authSource=admin');await c.connect();console.log('users:',await c.db().collection('users').countDocuments());await c.close()})().catch(e=>console.error(e.message))"
```

If the old username/password cannot be found, create a fresh admin (temporary `--noauth` start, create user, restart with auth):

```powershell
# Stop service, start noauth once
Stop-Service MongoDB
Start-Process "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" -ArgumentList '--dbpath','D:\epix-data\db','--port','27017','--bind_ip','127.0.0.1'
Start-Sleep 5
& "C:\Program Files\MongoDB\Server\8.3\bin\mongo.exe" --eval "db.getSiblingDB('admin').createUser({user:'epixAdmin',pwd:'kKQYbcpo58NyOIeaZh1i',roles:['root']})" 2>&1
Stop-Process -Name mongod -Force
Start-Service MongoDB
```

Expected: `users: 16` (or same count as Atlas — data preserved). Record the working credentials for Task 5.

- [ ] **Step 6: Verify C: data dir can be archived (do not delete yet)**

```powershell
Compress-Archive "C:\Program Files\MongoDB\Server\8.3\data\*" "D:\epix-data\mongodb-data-backup.zip"
```

Expected: zip created on D:. C: cleanup happens after Task 8 live verification.

- [ ] **Step 7: Commit**

No repo files changed in this task — skip commit. Note: `D:\epix-data\mongod.cfg` contains no secrets; it is NOT part of the repo.

---

### Task 2: File server on PC (port 8081) — uploads + serving from D:\epix-data\files

**Files:**
- Create: `file-server/package.json`, `file-server/server.mjs`, `file-server/.gitignore` (repo root — new standalone folder)
- Test: `file-server/` served on `http://127.0.0.1:8081`

**Interfaces:**
- Produces: `POST /api/upload` → `{ url }`; `GET /files/*` static. Auth via `x-files-token` header. URL shape: `/files/avatars/<uid>.png`, `/files/teams/<TeamName>/logo.png`, `/files/teams/<TeamName>/players/<uid>.png`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Create `file-server/package.json`**

```json
{
  "name": "epix-file-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "server.mjs",
  "scripts": { "start": "node server.mjs" },
  "dependencies": { "express": "^4.21.2" }
}
```

- [ ] **Step 2: Create `file-server/server.mjs`**

```js
import express from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const ROOT = "D:\\epix-data\\files";
const PORT = 8081;
const TOKEN = process.env.FILES_TOKEN || "epix-local-files-token";

const app = express();
app.use(express.json({ limit: "10mb" }));

function requireToken(req, res, next) {
  if (req.headers["x-files-token"] !== TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  return { ext, buffer: Buffer.from(match[2], "base64") };
}

app.post("/api/upload", requireToken, async (req, res) => {
  try {
    const { kind, uid, teamName, dataUrl } = req.body || {};
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ message: "Valid image data URL required (png, jpg, webp)." });
    }

    let relDir;
    let fileName;
    if (kind === "avatar") {
      relDir = join("avatars");
      fileName = `${safeName(uid || "anon")}.${parsed.ext}`;
    } else if (kind === "team-logo") {
      relDir = join("teams", safeName(teamName || "team"));
      fileName = `logo.${parsed.ext}`;
    } else if (kind === "player-picture") {
      relDir = join("teams", safeName(teamName || "team"), "players");
      fileName = `${safeName(uid || "player")}.${parsed.ext}`;
    } else {
      return res.status(400).json({ message: "Unknown kind" });
    }

    const absDir = join(ROOT, relDir);
    await mkdir(absDir, { recursive: true });
    const absPath = join(absDir, fileName);
    await writeFile(absPath, parsed.buffer);

    const urlPath = normalize(join("/files", relDir, fileName)).replace(/\\/g, "/");
    res.json({ url: urlPath });
  } catch (err) {
    console.error("upload failed:", err);
    res.status(500).json({ message: "Storage failed" });
  }
});

app.use("/files", express.static(ROOT));

app.listen(PORT, () => console.log(`epix file server listening on :${PORT} root=${ROOT}`));
```

- [ ] **Step 3: Create `file-server/.gitignore`**

```
node_modules/
```

- [ ] **Step 4: Install deps and start locally**

```powershell
cd file-server; npm install
Start-Process node -ArgumentList 'server.mjs' -WindowStyle Hidden
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8081/api/upload -Headers @{ 'x-files-token' = 'epix-local-files-token' } -ContentType 'application/json' -Body '{"kind":"avatar","uid":"test-user","dataUrl":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="}'
```

Expected: `{ "url": "/files/avatars/test-user.png" }` and file exists at `D:\epix-data\files\avatars\test-user.png`.

- [ ] **Step 5: Set up auto-start (hidden, at logon)**

Create `%LOCALAPPDATA%\epix-sync\start-file-server.vbs`:

```vbs
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Sunny\Documents\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\file-server"
sh.Run "node server.mjs", 0, False
```

Create shortcut in Startup folder:
```powershell
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\epix-file-server.lnk")
$lnk.TargetPath = "wscript.exe"
$lnk.Arguments = '"%LOCALAPPDATA%\epix-sync\start-file-server.vbs"'
$lnk.Save()
```

Expected: after re-login (or `wscript` run now), port 8081 responds.

- [ ] **Step 6: Commit**

```bash
git add file-server/package.json file-server/server.mjs file-server/.gitignore
git commit -m "feat: standalone file server for D: picture storage (avatars, team folders)"
```

---

### Task 3: Cloudflare Tunnel — files (HTTP) + mongo (TCP)

**Files:**
- Create: `D:\epix-data\tunnel\config.yml` (outside repo — contains tunnel secret references)
- System: cloudflared service auto-start
- Test: `curl https://files.epixesports.com/files/avatars/test-user.png` returns the file; `cloudflared access tcp --hostname mongo.epixesports.com` reaches MongoDB

**Interfaces:**
- Produces: public URLs `https://files.epixesports.com/...` (files) and `mongo.epixesports.com:443` (TCP tunnel for MongoDB). Used by Task 4 (FILES_BASE_URL) and Task 5 (MONGODB_URI).
- **User action required**: domain `epixesports.com` must be added to the Cloudflare account and its nameservers updated at Hostinger (currently `dns-parking.com`). Without this, custom hostnames cannot be created.

- [ ] **Step 1: User — add domain to Cloudflare and update nameservers**

Instruct the user:
1. Create/login Cloudflare account → Add site `epixesports.com` (Free plan).
2. Cloudflare shows two nameservers (e.g. `xxx.ns.cloudflare.com`).
3. At Hostinger DNS management, replace the current nameservers with Cloudflare's.
4. Wait for propagation (Cloudflare dashboard shows "Active").

Verify:
```powershell
Resolve-DnsName epixesports.com -Type NS
```
Expected: nameservers end in `ns.cloudflare.com`.

- [ ] **Step 2: Login cloudflared and create tunnel**

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel login
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel create epix
```

Expected: browser auth completes; `~/.cloudflared/` contains cert.pem + `epix.json` (tunnel credentials). Record the tunnel ID.

- [ ] **Step 3: Create `D:\epix-data\tunnel\config.yml`**

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\Sunny\.cloudflared\<TUNNEL_ID>.json
ingress:
  - hostname: files.epixesports.com
    service: http://127.0.0.1:8081
  - hostname: mongo.epixesports.com
    service: tcp://127.0.0.1:27017
  - service: http_status:404
```

- [ ] **Step 4: Create DNS routes**

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel route dns epix files.epixesports.com
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel route dns epix mongo.epixesports.com
```

- [ ] **Step 5: Install tunnel as Windows service and start**

```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" service install
Start-Service cloudflared
```

(If `service install` needs elevation, run via UAC `Start-Process ... -Verb RunAs`.)

Expected: service `cloudflared` Running; `cloudflared tunnel list` shows `epix` with active connection.

- [ ] **Step 6: Verify files endpoint from the internet**

```powershell
curl.exe -s "https://files.epixesports.com/files/avatars/test-user.png" -o "$env:TEMP\probe.png"
(Get-Item "$env:TEMP\probe.png").Length
```

Expected: file downloads (~68 bytes for the 1x1 test PNG). HTTP 404 returns for missing files (not tunnel error).

- [ ] **Step 7: Verify mongo TCP endpoint**

Test with a short-lived `cloudflared access tcp` client (temporary, on the PC — proves the TCP route works before wiring Render):

```powershell
Start-Process "C:\Program Files (x86)\cloudflared\cloudflared.exe" -ArgumentList 'access','tcp','--hostname','mongo.epixesports.com','--url','127.0.0.1:27018'
Start-Sleep 8
node -e "const {MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://<AUTH>@127.0.0.1:27018/pubg-tournaments');await c.connect();console.log('OK users:',await c.db().collection('users').countDocuments());await c.close()})().catch(e=>console.error(e.message))"
```

Expected: `OK users: 16`. **NOTE**: Cloudflare Access may require an Access application for `mongo.epixesports.com` before `access tcp` works. If it fails with an auth error, create one in Cloudflare dashboard (Zero Trust → Access → Applications → Self-hosted, hostname `mongo.epixesports.com`, policy "Everyone", no auth method) and retry. Also create a **service token** (Zero Trust → Access → Service Tokens) and record `CLIENT_ID`/`CLIENT_SECRET` for Task 5.

- [ ] **Step 8: Commit**

No repo files changed — skip commit. Record in `%LOCALAPPDATA%\epix-sync\tunnel-info.txt`: tunnel ID, mongo hostname, service token ID/secret (if created), files hostname.

---

### Task 4: Backend — store images via file server (URLs instead of base64)

**Files:**
- Create: `backend/src/services/storageService.ts`
- Modify: `backend/src/config/env.ts`, `backend/src/controllers/authController.ts` (uploadAvatarHandler), `backend/src/services/tournamentService.ts` (registerPlayerForTournament)
- Test: local backend against local file server; avatar upload returns `/files/...` URL; registration writes team folder

**Interfaces:**
- Consumes: file server `POST /api/upload` (Task 2), env `FILES_BASE_URL` + `FILES_TOKEN` (created here)
- Produces: `storageService.uploadImage({kind, uid, teamName, dataUrl}) → Promise<string>` (absolute URL). Avatar endpoint returns `{ avatarUrl: "<absolute URL>" }`. Registration stores teamLogo/pictures as URLs.

- [ ] **Step 1: Add env fields to `backend/src/config/env.ts`**

```ts
filesBaseUrl: process.env.FILES_BASE_URL || "http://127.0.0.1:8081",
filesToken: process.env.FILES_TOKEN || "epix-local-files-token",
```

- [ ] **Step 2: Create `backend/src/services/storageService.ts`**

```ts
import { env } from "../config/env.js";

export interface UploadImageParams {
  kind: "avatar" | "team-logo" | "player-picture";
  uid?: string;
  teamName?: string;
  dataUrl: string;
}

export async function uploadImage(params: UploadImageParams): Promise<string> {
  const response = await fetch(`${env.filesBaseUrl}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-files-token": env.filesToken,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("FILE_STORE_FAILED");
  }

  const body = (await response.json()) as { url: string };
  return `${env.filesBaseUrl}${body.url}`;
}
```

- [ ] **Step 3: Rewrite `uploadAvatarHandler` in `backend/src/controllers/authController.ts`**

Replace the current echo-back implementation:

```ts
export async function uploadAvatarHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { dataUrl } = req.body || {};
    if (!dataUrl || !/^data:image\/(png|jpe?g|webp);base64,/.test(String(dataUrl))) {
      return res.status(400).json({ message: "Valid image data URL required (png, jpg, or webp)." });
    }
    if (dataUrl.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Image too large (max 5MB)." });
    }
    const authReq = req as AuthenticatedRequest;
    const avatarUrl = await uploadImage({
      kind: "avatar",
      uid: authReq.user?.uid,
      dataUrl,
    });
    res.json({ avatarUrl });
  } catch {
    res.status(502).json({ message: "Picture storage is temporarily unavailable." });
  }
}
```

Add the import:
```ts
import { uploadImage } from "../services/storageService.js";
```

- [ ] **Step 4: Update `registerPlayerForTournament` in `backend/src/services/tournamentService.ts`**

Before `RegistrationModel.create`, store images (only if present):

```ts
let teamLogoUrl: string | undefined;
if (payload.teamLogo) {
  teamLogoUrl = await uploadImage({
    kind: "team-logo",
    teamName: payload.teamName,
    dataUrl: payload.teamLogo,
  });
}

const membersWithPictures = await Promise.all(
  payload.members.map(async (m) => {
    if (!m.picture) return m;
    const pictureUrl = await uploadImage({
      kind: "player-picture",
      teamName: payload.teamName,
      uid: m.uid,
      dataUrl: m.picture,
    });
    return { ...m, picture: pictureUrl };
  })
);
```

Then change `RegistrationModel.create` to use:
```ts
teamLogo: teamLogoUrl,
...
members: membersWithPictures.map((m) => ({
  uid: m.uid,
  inGameName: m.inGameName,
  picture: m.picture,
})),
```

Add import: `import { uploadImage } from "./storageService.js";`

- [ ] **Step 5: Write the test harness (temp script, not committed)**

Create `backend/tmp-upload-test.mjs` (delete after; mirrors the JWT format used in previous sessions' `tmp-del-test.mjs` — HS256, header/body base64url + HMAC-SHA256 with the dev secret, `exp` in payload):

```js
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const DEV_SECRET = "test-jwt-secret";
const MONGODB_URI = "mongodb://<AUTH>@127.0.0.1:27017/pubg-tournaments";
const API = "http://127.0.0.1:5000/api";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}
function signToken(uid) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ uid, role: "user", exp: Math.floor(Date.now() / 1000) + 3600 }));
  const sig = crypto.createHmac("sha256", DEV_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

const uid = "upload-test-" + Date.now();
const client = new MongoClient(MONGODB_URI);
await client.connect();
await client.db().collection("users").insertOne({ uid, inGameName: "upload-test" });
await client.close();

const token = signToken(uid);
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const res = await fetch(`${API}/auth/avatar`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ dataUrl: PNG }),
});
console.log("status:", res.status, await res.text());
```

Expected: FAIL (connection refused) until the local backend is running — run it in Step 6.

- [ ] **Step 6: Run local backend and test the full flow**

```powershell
# Terminal 1: ensure file server running (Task 2)
# Terminal 2:
cd backend
$env:MONGODB_URI = "mongodb://<AUTH>@127.0.0.1:27017/pubg-tournaments"
$env:JWT_SECRET = "test-jwt-secret"
npm run build
node dist/server.js
```

Then (PowerShell):
1. `POST /api/auth/avatar` with a small PNG data URL → expect `{ avatarUrl: "http://127.0.0.1:8081/files/avatars/upload-test-...png" }`
2. `GET <avatarUrl>` → expect 200 image bytes
3. Register a tournament + `POST /api/tournaments/:id/register` with `teamName: "Plan Test Team"`, `teamLogo`, and 4 members with pictures → expect 200; verify `D:\epix-data\files\teams\Plan_Test_Team\logo.png` and 4 files in `D:\epix-data\files\teams\Plan_Test_Team\players\`
4. Clean up: remove temp user + registration; delete test files from D:.

Expected: all pass. If the in-game lookup is called during registration and fails — that's the KNOWN Midasbuy breakage; it must not block the flow (verify no 500 is returned from lookup errors).

- [ ] **Step 7: Commit (only backend files)**

```bash
git add backend/src/config/env.ts backend/src/services/storageService.ts backend/src/controllers/authController.ts backend/src/services/tournamentService.ts
git commit -m "feat: store avatars and registration pictures as files on D: via file server"
```

---

### Task 5: Switch live backend to tunneled MongoDB + file server

**Files:**
- Modify: `render.yaml` (env var placeholders), Render dashboard env vars (MONGODB_URI, FILES_BASE_URL, FILES_TOKEN)
- Test: live site still healthy; avatar upload works from live frontend

**Interfaces:**
- Consumes: tunnel endpoints (Task 3), storage env (Task 4)
- Produces: production `MONGODB_URI` pointing at the PC through the tunnel; production file URLs `https://files.epixesports.com/...`

- [ ] **Step 1: Ensure Render can reach TCP mongo through Cloudflare**

Render free/standard instances cannot run arbitrary `cloudflared access tcp` sidecars without custom start commands. **Decision point**: two viable options —

**Option A (recommended): keep MONGODB_URI on Atlas for now.** Move DB to local MongoDB in a later dedicated migration (large risk, needs scheduled downtime). Files go to D: now (low risk). Document this as the chosen path for this plan.

**Option B (full switch now):** change `render.yaml` `startCommand` to run `cloudflared access tcp` in background:

```yaml
startCommand: sh -c "cloudflared access tcp --hostname mongo.epixesports.com --url 127.0.0.1:27018 --service-token-id $CF_ACCESS_CLIENT_ID --service-token-secret $CF_ACCESS_CLIENT_SECRET & node dist/server.js"
```

and set `MONGODB_URI=mongodb://<user>:<pass>@127.0.0.1:27018/pubg-tournaments?authSource=admin`. This requires installing cloudflared in the Render image (`buildCommand` add `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared`).

- [ ] **Step 2: Apply chosen option**

If Option A: set Render env vars only:
```
FILES_BASE_URL=https://files.epixesports.com
FILES_TOKEN=<epix-local-files-token>
```

If Option B: apply full render.yaml changes + env vars, deploy, and verify health + auth flows.

Record the decision in the task notes.

- [ ] **Step 3: Deploy backend to Render and verify**

```powershell
# push branch to master (already committed in Task 4)
git push origin master
```

Trigger Render deploy via API (Render API key `rnd_LhgiPZVdGU67oxQgg1eP6IJxsQDj`, service `srv-d9p9f8f10e5c73cqg15g`) or dashboard. Wait for deploy live.

Verify:
```powershell
curl.exe -s "https://pubg-tournaments-backend.onrender.com/api/health"
```
Expected: 200. Then upload avatar through the live API with a real token (temp script) — expect `avatarUrl` starting with `https://files.epixesports.com/files/avatars/`.

- [ ] **Step 4: Commit render.yaml changes (if Option B) and record**

```bash
git add render.yaml
git commit -m "chore: tunnel MongoDB + file server through cloudflared on Render"
```

---

### Task 6: Frontend — Google-only sign-in

**Files:**
- Modify: `frontend/src/features/auth/components/SignInForm.tsx` (remove UID form, keep Google), `frontend/src/features/auth/components/AuthModal.tsx` (sign-in only), `frontend/src/app/link-uid/page.tsx` (redirect to /profile)
- Test: login modal shows ONLY Google button; /link-uid redirects

**Interfaces:**
- Consumes: nothing new (uses existing `googleSignIn` API)
- Produces: Google-only login UI; `/link-uid` → `/profile` redirect

- [ ] **Step 1: Rewrite `SignInForm.tsx` to Google-only**

Remove: `loginAccount` import, `isIntegerOnly`/`sanitizeIntegerInput` imports, `INITIAL_FORM`, `form`/`errors`/`validate`/`handleSubmit`/`updateField`, the UID + Player Name inputs, the "or with UID" divider, the `Link UID` submit button, and `SignInFormData` typing for the form. Keep `handleGoogleSuccess` and the `useEffect` logged-in redirect. Final render:

```tsx
return (
  <AuthFormLayout
    title="Sign in with Google"
    subtitle="Sign in to link your PUBG Mobile UID and access the tournament portal"
    footerText=""
    footerLinkText=""
    footerLinkHref=""
    isModal={isModal}
    onFooterLinkClick={undefined}
  >
    {GOOGLE_CLIENT_ID && (
      <div className="mb-5 space-y-4">
        <GoogleSignInButton
          clientId={GOOGLE_CLIENT_ID}
          onSuccess={handleGoogleSuccess}
          onError={(message) => setSubmitError(message)}
        />
      </div>
    )}

    {submitError && (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {submitError}
      </p>
    )}
  </AuthFormLayout>
);
```

Remove the now-unused `Button`, `Input` imports if no longer used anywhere in the file.

- [ ] **Step 2: Simplify `AuthModal.tsx` to sign-in only**

Remove `SignUpForm` import, the `view` state, and the `initialView` prop usage (keep prop optional for callers or remove callers' usage):

```tsx
"use client";

import { Modal } from "@/components/ui";
import { SignInForm } from "./SignInForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign In" width={480} hideHeader>
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg text-text-primary/60 transition-colors hover:bg-bg-primary hover:text-accent"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <SignInForm isModal onSuccess={onClose} />
      </div>
    </Modal>
  );
}
```

Check all callers of `AuthModal` for `initialView` usage and remove the prop from call sites (grep `AuthModal` in `frontend/src`).

- [ ] **Step 3: Redirect `/link-uid` to `/profile`**

Replace `frontend/src/app/link-uid/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function LinkUidPage() {
  redirect("/profile");
}
```

- [ ] **Step 4: Check profile page redirect target**

`frontend/src/app/profile/page.tsx` currently pushes unauthenticated users to `/link-uid` (which now redirects back → loop). Change to push to `/`:

```tsx
router.push("/");
```

- [ ] **Step 5: Local verification**

Run frontend locally (`npm run dev` in `frontend`), open the site:
1. Click Sign In → modal shows ONLY Google button (no UID fields, no divider).
2. Visit `/link-uid` → lands on `/profile` (redirects; profile then redirects to `/` when logged out — no loop).
3. `npm run build` passes with no type errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/auth/components/SignInForm.tsx frontend/src/features/auth/components/AuthModal.tsx frontend/src/app/link-uid/page.tsx frontend/src/app/profile/page.tsx
git commit -m "feat: Google-only sign-in; UID linking moves to profile page"
```

---

### Task 7: Frontend — UID linking section on profile page

**Files:**
- Modify: `frontend/src/app/profile/page.tsx` (add "Link Your UID" section)
- Test: logged-in user links a UID; UID + in-game name display; in-game picture fallback

**Interfaces:**
- Consumes: `linkUidToAccount`, `lookupPlayerByUid` from `@/services/api` (already exported); `setSession` from `@/lib/auth`
- Produces: profile UI section; no new API

- [ ] **Step 1: Add UID section state + handlers in `profile/page.tsx`**

Add to imports: `import { linkUidToAccount, lookupPlayerByUid } from "@/services/api";`

Add state:
```tsx
const [uidInput, setUidInput] = useState("");
const [isLinkingUid, setIsLinkingUid] = useState(false);
const [uidError, setUidError] = useState("");
const [isEditingUid, setIsEditingUid] = useState(false);
const [inGameNameLookup, setInGameNameLookup] = useState<string | null>(null);
const [lookupUnavailable, setLookupUnavailable] = useState(false);
```

Handler:
```tsx
const handleLinkUid = async () => {
  if (!user) return;
  const uid = uidInput.trim();
  if (!uid || !/^\d+$/.test(uid)) {
    setUidError("UID must contain numbers only.");
    return;
  }
  setIsLinkingUid(true);
  setUidError("");
  setLookupUnavailable(false);
  try {
    const updated = await linkUidToAccount(uid);
    setSession(updated);
    setUser(updated);
    setUidInput("");
    // Best-effort in-game name lookup; lookup can be unavailable (Midasbuy redesign) — degrade gracefully.
    try {
      const result = await lookupPlayerByUid(uid);
      setInGameNameLookup(result.found ? result.inGameName : null);
    } catch {
      setLookupUnavailable(true);
    }
    showAlert("UID linked successfully.", "success");
  } catch (error) {
    setUidError(error instanceof Error ? error.message : "Failed to link UID.");
  } finally {
    setIsLinkingUid(false);
  }
};
```

- [ ] **Step 2: Render the UID section in the profile layout**

Place it as a card/section near the profile details form. Show the current UID (from `user.uid`), an input when the account has no numeric UID yet, and the linked UID + in-game name when present:

```tsx
{user && (
  <section className="rounded-2xl border border-border bg-bg-secondary p-6">
    <h2 className="text-lg font-semibold text-text-primary">Link Your UID</h2>
    <p className="mt-1 text-sm text-text-primary/60">
      Your PUBG Mobile UID lets tournaments identify you. Sign in with Google and link it here.
    </p>

    {user.uid && /^\d+$/.test(user.uid) && !isEditingUid ? (
      <div className="mt-4">
        <p className="text-sm text-text-primary">
          Linked UID: <span className="font-mono font-semibold">{user.uid}</span>
        </p>
        {user.inGameName && (
          <p className="mt-1 text-sm text-text-primary/70">In-game name: {user.inGameName}</p>
        )}
        {inGameNameLookup && (
          <p className="mt-1 text-sm text-accent">In-game name: {inGameNameLookup}</p>
        )}
        {lookupUnavailable && (
          <p className="mt-1 text-sm text-text-primary/50">
            In-game name lookup is currently unavailable — you can still play.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setUidInput(user.uid);
            setIsEditingUid(true);
          }}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Change UID
        </button>
      </div>
    ) : (
      <div className="mt-4 space-y-3">
        <Input
          label="PUBG Mobile UID *"
          name="uid"
          inputMode="numeric"
          placeholder="Enter your PUBG UID"
          value={uidInput}
          onChange={(e) => {
            setUidInput(e.target.value.replace(/\D/g, ""));
            setUidError("");
          }}
          error={uidError}
        />
        <Button
          type="button"
          variant="primary"
          disabled={isLinkingUid || !uidInput.trim()}
          onClick={handleLinkUid}
        >
          {isLinkingUid ? "Linking..." : "Link UID"}
        </Button>
      </div>
    )}
  </section>
)}
```

Also reset `setIsEditingUid(false)` at the start of `handleLinkUid` (after a successful link the account has a numeric UID, so the display view returns automatically).

- [ ] **Step 3: Local verification**

1. Log in with Google locally (or seed a user with googleId + token), go to `/profile`.
2. Enter a UID → link succeeds → "Linked UID" shows; in-game lookup shows either the name or the graceful "unavailable" message.
3. Reload → UID persists.
4. Enter a non-numeric UID → inline error.
5. `npm run build` passes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat: link PUBG UID from profile page with in-game name lookup"
```

---

### Task 8: Deploy + full live verification + C: cleanup

**Files:** none (deployment + verification)
**Test:** live site end-to-end after all changes

- [ ] **Step 1: Deploy backend + frontend**

```powershell
git push origin master
```

Backend: trigger Render deploy (dashboard or API). Frontend:
```powershell
# from frontend dir
vercel.cmd --prod --yes
```

Expected: both deploys Ready; `https://pubg-tournaments-backend.onrender.com/api/health` OK; www.epixesports.com loads.

- [ ] **Step 2: Live verification checklist**

1. Login modal shows ONLY Google button.
2. Google sign-in works → dashboard/profile loads.
3. Profile page: link a fresh test UID → success; in-game name lookup degrades gracefully (or shows name).
4. Upload profile picture → file appears at `D:\epix-data\files\avatars\<uid>.png` (check on PC) and image loads at `https://files.epixesports.com/files/avatars/<uid>.png` from the live site.
5. Register for a tournament with team logo + player pictures → files land in `D:\epix-data\files\teams\<TeamName>\` and admin panel shows the thumbnails (URLs).
6. If Option B was chosen (tunneled Mongo): create a test user through the live API → verify it appears in LOCAL Mongo on D: (`users` count increments). If Option A: DB remains Atlas — document as the follow-up migration.
7. `/link-uid` redirects to `/profile` (logged-out → `/`).

- [ ] **Step 3: C: drive cleanup (only after live verification passes)**

```powershell
Remove-Item "C:\Program Files\MongoDB\Server\8.3\data" -Recurse -Force
```

Keep `D:\epix-data\mongodb-data-backup.zip` for 2 weeks as rollback.

- [ ] **Step 4: Final commit if any verification fixes were made**

```bash
git add -A -- frontend/src backend/src render.yaml
git commit -m "fix: post-deploy verification fixes"
```

(Stage ONLY files that actually changed; do not sweep unrelated dirty files.)

---

## Rollback Plan

- **Auth UI**: revert Task 6 commit (`git revert <sha>`), redeploy frontend.
- **Storage (backend)**: revert Task 4 commit, redeploy backend → avatars return to base64-in-DB behavior.
- **Tunnel**: `Stop-Service cloudflared` — site unaffected except D: files unreachable (uploads fail with 502 "storage temporarily unavailable").
- **DB (Option B only)**: revert `MONGODB_URI` to Atlas value in Render dashboard; local Mongo data remains safe on D:.

## Open Questions / Risks

1. **Option A vs B for MONGODB_URI** — must be decided in Task 5. Recommendation: A (files to D: now, DB migration as a separate scheduled plan with downtime window). The user explicitly wants DB files on D:, so B is the eventual end state — but doing both at once doubles the blast radius of a tunnel failure.
2. **Cloudflare Access for TCP** — `cloudflared access tcp` may require an Access app + service token (documented in Task 3 Step 7).
3. **Midasbuy lookup remains broken** — in-game picture/name shows graceful fallback; scraper fix deferred (out of scope).
4. **PC uptime** — D: storage is unavailable whenever the PC is off; the file server + tunnel auto-start at logon (Task 2/3).
5. **Team name sanitization** — file server replaces unsafe chars with `_` (e.g. `Team Nova` → `Team_Nova`); admin thumbnails use stored URLs so display is unaffected.