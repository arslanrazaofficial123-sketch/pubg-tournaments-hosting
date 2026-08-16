# EPIX Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/profile` page to EPIX Esports mirroring 4HM's team profile page — editable profile details with avatar upload, career stats, change password, and teammates list — adapted to the player-centric registration model.

**Architecture:** New backend endpoints (`PUT /auth/profile`, `PUT /auth/password`, `POST /auth/avatar`) on the existing Express+Mongoose API; new Next.js App Router page at `frontend/src/app/profile/page.tsx` using the existing `PageShell`, `Input`, `Button`, and `useAlert` UI. Stats and teammates are computed client-side from existing `fetchAllRegistrations` + `fetchMatches` + `getTournaments` APIs. Avatar stored as base64 data URL in the User document (same pattern as `receiptImage`/`teamLogo`).

**Tech Stack:** Express 4 + Mongoose (backend), Next.js 15 App Router + Tailwind (frontend), bcryptjs, JSON Web Tokens.

## Global Constraints

- Repo root: `C:\Users\Sunny\Documents\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master`
- PowerShell execution policy blocks `.ps1` shims — always use `npm.cmd` / `vercel.cmd`
- All backend source uses `.js` extension on relative imports (`import { x } from "../models/User.js"`)
- Backend: TypeScript strict, build via `npm.cmd run build` (tsc)
- Frontend: `npm.cmd run build` must pass; lint errors are pre-existing (54) — do NOT fix unrelated lint
- AGENTS.md: "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` guides before Next.js-specific code
- Local MongoDB is STOPPED — local backend tests must override `MONGODB_URI` with the Atlas URI (stored in `%LOCALAPPDATA%\epix-sync\atlas-uri.txt`) and use a non-default port (e.g. `PORT=5099`)
- User model unique fields: `uid`, `inGameName` (sparse), `whatsapp` (sparse) — profile updates must respect uniqueness with `_id: { $ne: doc._id }`
- Password hashing: bcrypt `SALT_ROUNDS = 10` (already in authService)
- Google users (`googleId` set / uid starts with `g-`) have no password — change-password hidden on frontend, rejected on backend
- Do not commit unrelated uncommitted files (seed.ts, admin.ts, design files) — only stage plan-related files

---

### Task 1: User model + types — avatar and bio fields

**Files:**
- Modify: `backend/src/models/User.ts`
- Modify: `backend/src/types/user.ts`
- Test: `backend/src/types/user.ts` (type check via build)

**Interfaces:**
- Consumes: existing `UserProfile` interface
- Produces: `UserProfile` gains `avatar?: string` and `bio?: string`; `UserModel` schema gains `avatar` and `bio` fields

- [ ] **Step 1: Add fields to the User schema**

In `backend/src/models/User.ts`, after the `name` line (line 12), add:

```typescript
    avatar: { type: String, required: false },
    bio: { type: String, required: false, maxlength: 500 },
```

- [ ] **Step 2: Extend the UserProfile type**

In `backend/src/types/user.ts`, add to the `UserProfile` interface:

```typescript
  avatar?: string;
  bio?: string;
```

- [ ] **Step 3: Build to verify**

Run: `npm.cmd run build` in `backend/`
Expected: `✓` compile success, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/models/User.ts backend/src/types/user.ts
git commit -m "feat(backend): add avatar and bio fields to user model"
```

---

### Task 2: Backend service functions — updateProfile + changePassword

**Files:**
- Modify: `backend/src/services/authService.ts`
- Test: `backend/src/services/authService.ts` (compile + Task 3 runtime check)

**Interfaces:**
- Consumes: `UserModel`, `UserProfile`, `toUserProfile`, `SALT_ROUNDS`, bcrypt
- Produces: `updateUserProfile(uid: string, patch: { inGameName?: string; whatsapp?: string; bio?: string; avatar?: string }): Promise<UserProfile>`; `changeUserPassword(uid: string, currentPassword: string, newPassword: string): Promise<boolean>` — throws Error with codes `USER_NOT_FOUND`, `INGAMENAME_REQUIRED`, `INGAMENAME_ALREADY_EXISTS`, `WHATSAPP_ALREADY_EXISTS`, `PASSWORD_NOT_SET`, `CURRENT_PASSWORD_WRONG`

- [ ] **Step 1: Add updateUserProfile**

Append to `backend/src/services/authService.ts` (after `linkUidToUser`):

```typescript
export async function updateUserProfile(
  uid: string,
  patch: { inGameName?: string; whatsapp?: string; bio?: string; avatar?: string },
): Promise<UserProfile> {
  const doc = await UserModel.findOne({ uid });
  if (!doc) throw new Error("USER_NOT_FOUND");

  if (patch.inGameName !== undefined) {
    const name = patch.inGameName.trim();
    if (name === "") throw new Error("INGAMENAME_REQUIRED");
    const taken = await UserModel.findOne({
      inGameName: name,
      _id: { $ne: doc._id },
    }).lean();
    if (taken) throw new Error("INGAMENAME_ALREADY_EXISTS");
    doc.inGameName = name;
  }

  if (patch.whatsapp !== undefined) {
    const wa = patch.whatsapp.trim();
    if (wa !== "") {
      const taken = await UserModel.findOne({
        whatsapp: wa,
        _id: { $ne: doc._id },
      }).lean();
      if (taken) throw new Error("WHATSAPP_ALREADY_EXISTS");
    }
    doc.whatsapp = wa;
  }

  if (patch.bio !== undefined) doc.bio = patch.bio.slice(0, 500);
  if (patch.avatar !== undefined) doc.avatar = patch.avatar;

  await doc.save();
  return toUserProfile(doc);
}
```

- [ ] **Step 2: Add changeUserPassword**

Append after `updateUserProfile`:

```typescript
export async function changeUserPassword(
  uid: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const doc = await UserModel.findOne({ uid });
  if (!doc) throw new Error("USER_NOT_FOUND");
  if (!doc.password) throw new Error("PASSWORD_NOT_SET");

  const isValid = await bcrypt.compare(currentPassword, doc.password);
  if (!isValid) throw new Error("CURRENT_PASSWORD_WRONG");

  doc.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await doc.save();
  return true;
}
```

- [ ] **Step 3: Update toUserProfile**

`toUserProfile` already returns the doc fields; add avatar/bio passthrough:

```typescript
    avatar: doc.avatar || undefined,
    bio: doc.bio || undefined,
```

- [ ] **Step 4: Build to verify**

Run: `npm.cmd run build` in `backend/`
Expected: compile success.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/authService.ts
git commit -m "feat(backend): add profile update and password change services"
```

---

### Task 3: Backend controller + routes — profile, password, avatar

**Files:**
- Modify: `backend/src/controllers/authController.ts`
- Modify: `backend/src/routes/authRoutes.ts`
- Possibly modify: `backend/src/app.ts` or `backend/src/index.ts` (json body limit — verify first)

**Interfaces:**
- Consumes: `updateUserProfile`, `changeUserPassword` from Task 2; `requireAuth` middleware; existing `env`
- Produces: Routes `PUT /api/auth/profile`, `PUT /api/auth/password`, `POST /api/auth/avatar` (all requireAuth); error mapping: `USER_NOT_FOUND`→404, `INGAMENAME_REQUIRED`→400, `INGAMENAME_ALREADY_EXISTS`/`WHATSAPP_ALREADY_EXISTS`→409, `PASSWORD_NOT_SET`→400, `CURRENT_PASSWORD_WRONG`→400

- [ ] **Step 1: Check json body size limit**

Read `backend/src/index.ts` (or `app.ts`) and find the `express.json(...)` call. If no limit is specified, note it. Then verify avatar base64 (up to ~2MB) will pass — if the limit is default (100kb), raise it:

```typescript
app.use(express.json({ limit: "10mb" }));
```

If the server already sets a limit ≥ 10mb (receipt images are uploaded as base64 already), skip this step.

- [ ] **Step 2: Add controller handlers**

Append to `backend/src/controllers/authController.ts`:

```typescript
export async function updateProfileHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { inGameName, whatsapp, bio, avatar } = req.body || {};
    const updated = await updateUserProfile(req.user!.uid, { inGameName, whatsapp, bio, avatar });
    res.json(updated);
  } catch (err: any) {
    const code = err?.message || "";
    if (code === "USER_NOT_FOUND") return res.status(404).json({ message: "User not found." });
    if (code === "INGAMENAME_REQUIRED") return res.status(400).json({ message: "In-game name is required." });
    if (code === "INGAMENAME_ALREADY_EXISTS") return res.status(409).json({ message: "In-game name is already taken." });
    if (code === "WHATSAPP_ALREADY_EXISTS") return res.status(409).json({ message: "WhatsApp number is already registered." });
    res.status(500).json({ message: "Failed to update profile." });
  }
}

export async function changePasswordHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    await changeUserPassword(req.user!.uid, currentPassword, newPassword);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    const code = err?.message || "";
    if (code === "USER_NOT_FOUND") return res.status(404).json({ message: "User not found." });
    if (code === "PASSWORD_NOT_SET") return res.status(400).json({ message: "This account uses Google login and has no password." });
    if (code === "CURRENT_PASSWORD_WRONG") return res.status(400).json({ message: "Current password is incorrect." });
    res.status(500).json({ message: "Failed to change password." });
  }
}

export async function uploadAvatarHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { dataUrl } = req.body || {};
    if (!dataUrl || !/^data:image\/(png|jpe?g|webp);base64,/.test(String(dataUrl))) {
      return res.status(400).json({ message: "Valid image data URL required (png, jpg, or webp)." });
    }
    if (dataUrl.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Image too large (max 5MB)." });
    }
    res.json({ avatarUrl: dataUrl });
  } catch {
    res.status(500).json({ message: "Failed to process avatar." });
  }
}
```

Note: check the file's existing imports — add `updateUserProfile`, `changeUserPassword` from the service, and confirm `AuthenticatedRequest` / `Response` are already imported (match existing handler style; the file may already import these for `linkUid`).

- [ ] **Step 3: Register routes**

In `backend/src/routes/authRoutes.ts`, after the existing `/link-uid` route:

```typescript
router.put("/profile", requireAuth, updateProfileHandler);
router.put("/password", requireAuth, changePasswordHandler);
router.post("/avatar", requireAuth, uploadAvatarHandler);
```

Import the three new handlers at the top of the file (match existing import style).

- [ ] **Step 4: Build to verify**

Run: `npm.cmd run build` in `backend/`
Expected: compile success.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/authController.ts backend/src/routes/authRoutes.ts backend/src/index.ts
git commit -m "feat(backend): add profile, password, and avatar endpoints"
```

---

### Task 4: Backend runtime verification with curl

**Files:**
- None (verification only)

**Interfaces:**
- Verifies: all Task 1-3 output

- [ ] **Step 1: Start backend locally against Atlas**

```powershell
$atlas = Get-Content "$env:LOCALAPPDATA\epix-sync\atlas-uri.txt"
$env:MONGODB_URI = $atlas
$env:PORT = "5099"
$env:GOOGLE_CLIENT_ID = ""
npm.cmd run dev  # or node dist/index.js after build
```

Leave it running in a separate terminal.

- [ ] **Step 2: Verify auth guard on new routes**

```powershell
Invoke-RestMethod -Uri "http://localhost:5099/api/auth/profile" -Method PUT -Body '{"inGameName":"x"}' -ContentType "application/json"
```

Expected: `401 Access denied. No token provided.`

- [ ] **Step 3: Verify avatar validation**

```powershell
$body = '{"dataUrl":"not-an-image"}'
Invoke-RestMethod -Uri "http://localhost:5099/api/auth/avatar" -Method POST -Body $body -ContentType "application/json"
```

Expected: `400 Valid image data URL required`

- [ ] **Step 4: Stop the test server**

Kill the node process on port 5099.

---

### Task 5: Frontend API service + types

**Files:**
- Modify: `frontend/src/types/auth.ts`
- Modify: `frontend/src/services/api/auth.ts`

**Interfaces:**
- Consumes: `apiClient`, `UserProfile`
- Produces: `updateProfile(payload: { inGameName?: string; whatsapp?: string; bio?: string; avatar?: string }): Promise<UserProfile>`; `changePassword(payload: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<{ success: boolean; message: string }>`; `uploadAvatar(dataUrl: string): Promise<{ avatarUrl: string }>`; `UserProfile` gains `avatar?: string`, `bio?: string`

- [ ] **Step 1: Extend UserProfile type**

In `frontend/src/types/auth.ts`, add to `UserProfile`:

```typescript
  avatar?: string;
  bio?: string;
```

- [ ] **Step 2: Add API functions**

Append to `frontend/src/services/api/auth.ts`:

```typescript
export async function updateProfile(payload: {
  inGameName?: string;
  whatsapp?: string;
  bio?: string;
  avatar?: string;
}): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatar(dataUrl: string): Promise<{ avatarUrl: string }> {
  return apiClient<{ avatarUrl: string }>("/auth/avatar", {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
}
```

- [ ] **Step 3: Build to verify**

Run: `npm.cmd run build` in `frontend/`
Expected: compile success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/auth.ts frontend/src/services/api/auth.ts
git commit -m "feat(frontend): add profile update, password, and avatar API functions"
```

---

### Task 6: Profile page — header + Profile Details + avatar upload

**Files:**
- Create: `frontend/src/app/profile/page.tsx`
- Modify: `frontend/src/components/layout/SiteNavigation.tsx` (add Profile link when logged in)

**Interfaces:**
- Consumes: `PageShell`, `getSessionUser`, `isLoggedIn`, `setSession`, `Button`, `Input`, `useAlert`, `updateProfile`, `uploadAvatar`, `UserProfile`, `cn`
- Produces: `/profile` route (protected — redirects to `/link-uid` if not logged in); nav link "Profile" next to "Dashboard"

- [ ] **Step 1: Create the page with header + Profile Details section**

Create `frontend/src/app/profile/page.tsx` (client component) with this skeleton — the stats/password/teammates sections are stubbed with TODO comments to be filled in Task 7-9:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertProvider";
import { getSessionUser, isLoggedIn as checkLoggedIn, setSession } from "@/lib/auth";
import {
  changePassword,
  fetchAllRegistrations,
  getTournaments,
  updateProfile,
  uploadAvatar,
} from "@/services/api";
import type { UserProfile } from "@/types/auth";
import type { Registration } from "@/services/api/tournaments";
import type { Tournament } from "@/types/tournament";

function getInitials(name: string, uid: string): string {
  const source = name.trim() || uid.trim() || "EP";
  return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Profile details form
  const [inGameName, setInGameName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Career stats data
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!checkLoggedIn() || !sessionUser) {
      router.push("/link-uid");
      return;
    }
    setUser(sessionUser);
    setInGameName(sessionUser.inGameName || "");
    setWhatsapp(sessionUser.whatsapp || "");
    setBio(sessionUser.bio || "");
    setIsAuthorized(true);

    Promise.all([
      fetchAllRegistrations(undefined, sessionUser.uid),
      getTournaments(),
    ]).then(([regs, tns]) => {
      setRegistrations(regs);
      setTournaments(tns);
    });
  }, [router]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      showAlert("Please choose a PNG, JPG, or WEBP image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert("Image too large (max 5MB).", "error");
      return;
    }
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result);
        const { avatarUrl } = await uploadAvatar(dataUrl);
        const updated = await updateProfile({ avatar: avatarUrl });
        setSession(updated);
        setUser(updated);
        showAlert("Profile picture updated.", "success");
      };
      reader.readAsDataURL(file);
    } catch {
      showAlert("Failed to upload picture. Please try again.", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!inGameName.trim()) {
      showAlert("In-game name is required.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        inGameName: inGameName.trim(),
        whatsapp: whatsapp.trim(),
        bio: bio.trim(),
      });
      setSession(updated);
      setUser(updated);
      showAlert("Profile saved.", "success");
    } catch (error: any) {
      showAlert(error?.message || "Failed to save profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header card */}
        <section className="mb-6 rounded-2xl border border-border bg-bg-secondary p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Player Profile</h1>
              <p className="mt-1 text-sm text-text-primary/60">
                Manage your identity, career stats, and teammates.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#profile-details" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20">
                Profile Details
              </a>
              <a href="#career-stats" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20">
                Career Stats
              </a>
              <a href="#change-password" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20">
                Change Password
              </a>
              <a href="#teammates" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20">
                Teammates
              </a>
            </div>
          </div>
        </section>

        {/* Profile Details */}
        <section id="profile-details" className="mb-6 rounded-2xl border border-border bg-bg-secondary p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">Profile Details</h2>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent">Editable</span>
          </div>

          <div className="mb-6 flex items-center gap-4">
            <label className="relative block h-20 w-20 cursor-pointer">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-accent/40 bg-bg-primary text-2xl font-black text-accent">
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  getInitials(user?.inGameName || "", user?.uid || "")
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-accent/40 bg-bg-secondary text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleAvatarChange} disabled={avatarUploading} />
            </label>
            <div>
              <p className="text-sm font-semibold text-text-primary">Profile picture</p>
              <p className="text-xs text-text-primary/60">Click the circle to upload (PNG, JPG, WEBP, max 5MB).</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="In-Game Name *"
              name="inGameName"
              placeholder="Your PUBG in-game name"
              value={inGameName}
              onChange={(e) => setInGameName(e.target.value)}
            />
            <Input
              label="WhatsApp Contact"
              name="whatsapp"
              placeholder="+92300..."
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Bio</label>
              <textarea
                name="bio"
                rows={3}
                maxLength={500}
                placeholder="Tell players about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-primary/30 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-text-primary/40">{bio.length}/500</p>
            </div>
            <Button variant="primary" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </section>

        {/* Career Stats - Task 7 */}
        {/* Change Password - Task 8 */}
        {/* Teammates - Task 9 */}
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 2: Verify imports exist in the barrel**

Check `frontend/src/services/api/index.ts` exports `updateProfile`, `changePassword`, `uploadAvatar`. The file re-exports from `./auth` — verify the new functions are exported (earlier barrel edits were required for `googleSignIn`; do the same here if missing).

- [ ] **Step 3: Add Profile link to SiteNavigation**

In `frontend/src/components/layout/SiteNavigation.tsx`, find where the "Dashboard" link is rendered for logged-in users (near the auth-aware area) and add next to it:

```tsx
<Link href="/profile" className="...same classes as Dashboard link...">
  Profile
</Link>
```

Match the existing link styling exactly — copy the Dashboard link's className.

- [ ] **Step 4: Build to verify**

Run: `npm.cmd run build` in `frontend/`
Expected: compile success. The stubbed sections are just JSX comments so the page builds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/profile/page.tsx frontend/src/components/layout/SiteNavigation.tsx frontend/src/services/api/index.ts
git commit -m "feat(frontend): add profile page with editable details and avatar upload"
```

---

### Task 7: Career Stats section

**Files:**
- Modify: `frontend/src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `registrations` + `tournaments` state from Task 6; `fetchMatches` from `@/services/api/matches`
- Produces: `careerStats` memo: `{ tournaments: number; matches: number; kills: number; bestRank: number | null; points: number; chickenDinners: number }`

- [ ] **Step 1: Add stats computation**

Add `fetchMatches` to the imports. Add a `useMemo` that computes stats from registrations (approved only for kills/points/rank/chicken; matches require fetching per tournament — compute matches count inside the existing `Promise.all` in the `useEffect` instead, then store `matchesPlayed` in state):

Extend the `useEffect` in Task 6: after `setRegistrations(regs)`, add:

```tsx
      const approvedRegs = regs.filter((r) => r.status === "approved");
      const now = new Date();
      const matchResults = await Promise.all(
        approvedRegs.map((r) => fetchMatches(r.tournamentId))
      );
      let matchesPlayed = 0;
      approvedRegs.forEach((r, idx) => {
        const groupMatches = (matchResults[idx] || []).filter(
          (m) => m.groups && m.groups.includes(r.group)
        );
        matchesPlayed += groupMatches.filter((m) => {
          const d = new Date(m.date);
          const tp = m.time.match(/^(\d{1,2}):(\d{2})$/);
          if (tp) d.setHours(parseInt(tp[1], 10), parseInt(tp[2], 10), 0, 0);
          return d.getTime() < now.getTime();
        }).length;
      });
      setMatchesPlayed(matchesPlayed);
```

Add state `const [matchesPlayed, setMatchesPlayed] = useState(0);`

Then add the memo (after the handlers, before the early return):

```tsx
  const careerStats = useMemo(() => {
    const approved = registrations.filter((r) => r.status === "approved");
    const tournamentCount = new Set(registrations.map((r) => r.tournamentId)).size;
    const kills = approved.reduce((sum, r) => sum + (r.kills || 0), 0);
    const points = approved.reduce((sum, r) => sum + (r.totalPoints || 0), 0);
    const chickenDinners = approved.reduce((sum, r) => sum + (r.chickenDinner || 0), 0);
    const ranks = approved.map((r) => r.rank || 0).filter((rk) => rk > 0);
    const bestRank = ranks.length > 0 ? Math.min(...ranks) : null;
    return {
      tournaments: tournamentCount,
      matches: matchesPlayed,
      kills,
      points,
      chickenDinners,
      bestRank,
    };
  }, [registrations, matchesPlayed]);
```

- [ ] **Step 2: Render the stats grid**

Replace the `{/* Career Stats - Task 7 */}` comment with:

```tsx
        {/* Career Stats */}
        <section id="career-stats" className="mb-6 rounded-2xl border border-border bg-bg-secondary p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">Career Stats</h2>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-xs font-medium text-accent">All-Time</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Rank", value: careerStats.bestRank ? `#${careerStats.bestRank}` : "#-" },
              { label: "Total Points", value: String(careerStats.points) },
              { label: "Total Kills", value: String(careerStats.kills) },
              { label: "Events", value: String(careerStats.tournaments) },
              { label: "Matches", value: String(careerStats.matches) },
              { label: "Chicken Dinners", value: String(careerStats.chickenDinners) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-bg-primary p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-text-primary/50">{stat.label}</p>
                <p className="mt-1 text-xl font-black text-accent">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
```

- [ ] **Step 3: Build to verify**

Run: `npm.cmd run build` in `frontend/`
Expected: compile success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat(frontend): add career stats section to profile page"
```

---

### Task 8: Change Password + Delete Account section

**Files:**
- Modify: `frontend/src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `changePassword` from Task 5; `deleteAccount`, `logout` (already exist); `useAlert` confirm
- Produces: password form state; hidden when `user.googleId` is set

- [ ] **Step 1: Add password form state and handler**

Add state:

```tsx
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
```

Add handler:

```tsx
  const handleChangePassword = async () => {
    if (!user) return;
    if (newPassword.length < 6) {
      showAlert("New password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("Passwords do not match.", "error");
      return;
    }
    setIsChanging(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showAlert("Password updated successfully.", "success");
    } catch (error: any) {
      showAlert(error?.message || "Failed to change password.", "error");
    } finally {
      setIsChanging(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    // Reuse the pattern from dashboard: showConfirm then deleteAccount(user.uid)
    showAlert("Delete account is available in the dashboard.", "info");
  };
```

Note: dashboard's delete flow uses `showConfirm` from `useAlert` — import it (`const { showAlert, showConfirm } = useAlert();`) and copy the dashboard's `handleDeleteAccount` implementation (lines ~324-337 of `frontend/src/app/dashboard/page.tsx`) exactly, importing `deleteAccount` and `logout`.

- [ ] **Step 2: Render the section (conditional on !user.googleId for password form)**

Replace the `{/* Change Password - Task 8 */}` comment with:

```tsx
        {/* Change Password */}
        <section id="change-password" className="mb-6 rounded-2xl border border-border bg-bg-secondary p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">Change Password</h2>
            <span className="rounded-full border border-border bg-bg-primary/50 px-3 py-0.5 text-xs font-medium text-text-primary/60">Security</span>
          </div>

          {user?.googleId ? (
            <p className="text-sm text-text-primary/60">
              You signed in with Google — this account has no password.
            </p>
          ) : (
            <div className="space-y-4">
              <Input
                label="Current Password *"
                name="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                label="New Password *"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirm New Password *"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Button variant="primary" onClick={handleChangePassword} disabled={isChanging}>
                {isChanging ? "Updating..." : "Update Password"}
              </Button>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-6">
            <h3 className="mb-2 text-base font-bold text-text-primary">Account & Data</h3>
            <p className="mb-3 text-sm text-text-primary/60">
              Permanently delete your account and all data.
            </p>
            <Button variant="danger" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </div>
        </section>
```

Verify the `Button` component supports a `variant="danger"` (check `frontend/src/components/ui/Button.tsx`; if variants are only `primary`/`secondary`, use the dashboard's delete button styling instead).

- [ ] **Step 3: Build to verify**

Run: `npm.cmd run build` in `frontend/`
Expected: compile success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat(frontend): add change password and delete account to profile page"
```

---

### Task 9: Teammates section

**Files:**
- Modify: `frontend/src/app/profile/page.tsx`

**Interfaces:**
- Consumes: `registrations` + `tournaments` state from Task 6
- Produces: deduplicated teammate list with tournament badges

- [ ] **Step 1: Build teammates memo**

Add after `careerStats`:

```tsx
  const teammates = useMemo(() => {
    const byUid = new Map<string, {
      uid: string;
      inGameName: string;
      picture?: string;
      tournaments: string[];
    }>();
    registrations.forEach((reg) => {
      const title = tournaments.find((t) => t.id === reg.tournamentId)?.title || "Unknown Tournament";
      reg.members.forEach((m: any) => {
        const existing = byUid.get(m.uid);
        if (existing) {
          if (!existing.tournaments.includes(title)) existing.tournaments.push(title);
        } else {
          byUid.set(m.uid, {
            uid: m.uid,
            inGameName: m.inGameName || m.uid,
            picture: m.picture,
            tournaments: [title],
          });
        }
      });
    });
    return Array.from(byUid.values());
  }, [registrations, tournaments]);
```

- [ ] **Step 2: Render the teammates table**

Replace the `{/* Teammates - Task 9 */}` comment with:

```tsx
        {/* Teammates */}
        <section id="teammates" className="mb-6 rounded-2xl border border-border bg-bg-secondary p-6">
          <div className="mb-5 flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">Teammates</h2>
            <span className="rounded-full border border-border bg-bg-primary/50 px-3 py-0.5 text-xs font-medium text-text-primary/60">Members</span>
          </div>

          {teammates.length === 0 ? (
            <p className="text-sm text-text-primary/60">
              No teammates yet — register a team in a tournament to add members.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-text-primary/50">
                    <th className="pb-2 pr-4">Player</th>
                    <th className="pb-2 pr-4">UID</th>
                    <th className="pb-2">Played Together</th>
                  </tr>
                </thead>
                <tbody>
                  {teammates.map((tm) => (
                    <tr key={tm.uid} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-bg-primary text-xs font-bold text-accent">
                            {tm.picture ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={tm.picture} alt={tm.inGameName} className="h-full w-full object-cover" />
                            ) : (
                              getInitials(tm.inGameName, tm.uid)
                            )}
                          </div>
                          <span className="font-semibold text-text-primary">{tm.inGameName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-text-primary/70">{tm.uid}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {tm.tournaments.map((t) => (
                            <span key={t} className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
```

- [ ] **Step 3: Build to verify**

Run: `npm.cmd run build` in `frontend/`
Expected: compile success.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat(frontend): add teammates section to profile page"
```

---

### Task 10: Full verification + deploy

**Files:**
- None (verification + deployment)

- [ ] **Step 1: Full backend build + frontend build**

Run: `npm.cmd run build` in `backend/` then `npm.cmd run build` in `frontend/`
Expected: both compile.

- [ ] **Step 2: Local smoke test of new endpoints**

Repeat Task 4 steps against a local server (PORT=5099, Atlas URI) with a real user token:
1. Login as an existing UID → capture token: `POST /api/auth/login` with `{ uid, password: "", inGameName }` — check what the login response returns (it may not include a token — if not, skip authenticated checks; the 401 guard test from Task 4 is sufficient).
2. `PUT /api/auth/profile` with `{ bio: "test" }` → expect 401 without token (guard) and success path checked via frontend.

- [ ] **Step 3: Deploy backend**

```bash
git add -A -- backend/ docs/
git commit -m "feat: profile page (backend)"
git push origin master
```

Verify Render deploy starts: `https://api.render.com/v1/services/srv-d9p9f8f10e5c73cqg15g/deploys` (Bearer `rnd_LhgiPZVdGU67oxQgg1eP6IJxsQDj`). Wait for status `live`.

- [ ] **Step 4: Deploy frontend**

Run in `frontend/`: `vercel.cmd --prod`
Expected: production URL output.

- [ ] **Step 5: Verify live**

1. `POST https://pubg-tournaments-backend.onrender.com/api/auth/profile` with no token → expect 401.
2. Open `https://www.epixesports.com/profile` logged in → all 4 sections render; avatar upload works; profile saves persist after reload; stats compute; teammates list shows registration members.

- [ ] **Step 6: Update the dashboard's existing profile card**

Optional polish: in `frontend/src/app/dashboard/page.tsx`, add a "View Profile" button next to the existing "Unlink" button linking to `/profile`.

- [ ] **Step 7: Final commit**

```bash
git add -A -- frontend/ docs/
git commit -m "feat: profile page (frontend)"
git push origin master
```