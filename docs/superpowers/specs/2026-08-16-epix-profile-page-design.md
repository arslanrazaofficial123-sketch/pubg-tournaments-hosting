# EPIX Esports Profile Page Design

**Date:** 2026-08-16  
**Status:** Approved for implementation  
**Approach:** Full 4HM Parity (Approach 1)

---

## 1. Overview

Build a new `/profile` page for EPIX Esports that mirrors the 4HM Esports team profile page structure and functionality, adapted for EPIX's player-centric tournament registration model.

**Reference:** https://team4hm.com/team/profile.php (requires login — HTML provided by user)

**Key Adaptation:** 4HM = persistent team account with members. EPIX = player account (UID login) with per-tournament team registrations. Profile aggregates career data across all registrations.

---

## 2. User Model Extensions

### New Fields (backend/src/models/User.ts)
```typescript
avatar: { type: String, required: false },      // base64 data URL or external URL
bio: { type: String, required: false, maxlength: 500 },
```

- `avatar`: store base64 data URL directly in MongoDB (like receiptImage/teamLogo)
- `bio`: optional short description

---

## 3. Backend API Endpoints

### 3.1 `PUT /api/auth/profile`
**Auth:** requireAuth (user token)  
**Body:** `{ inGameName?, whatsapp?, bio?, avatar? }`  
**Validation:**
- `inGameName`: unique if provided, trim, max 50 chars
- `whatsapp`: unique if provided, trim, basic phone format
- `bio`: max 500 chars
- `avatar`: base64 data URL (max ~2MB) or external HTTPS URL

**Response:** Updated UserProfile (includes avatar, bio)

### 3.2 `PUT /api/auth/password`
**Auth:** requireAuth (user token)  
**Body:** `{ currentPassword, newPassword, confirmPassword }`  
**Validation:**
- User must have `password` field (Google users excluded)
- `currentPassword` matches stored hash
- `newPassword` === `confirmPassword`, min 6 chars
- Hash new password with bcrypt (SALT_ROUNDS = 10)

**Response:** `{ success: true, message: "Password updated" }`

### 3.3 `POST /api/auth/avatar`
**Auth:** requireAuth (user token)  
**Content-Type:** multipart/form-data  
**Field:** `avatar_file` (image: jpg, jpeg, png, webp, max 5MB)  
**Processing:**
- Read file buffer, convert to base64 data URL
- Optionally compress/resize (sharp if available) to max 800px width
- Return base64 data URL for frontend preview
- Frontend then calls `PUT /api/auth/profile` with avatar

**Response:** `{ avatarUrl: "data:image/...base64..." }`

---

## 4. Frontend Page Structure

### Route: `/app/profile/page.tsx`

**Layout:** Uses existing `PageShell` (header, nav, footer). Protected route — redirects to `/link-uid` if not authenticated.

### Sections (in order, matching 4HM):

#### 4.1 Header Card
- Title: "Player Profile" with user icon
- Subtitle: "Manage your identity, stats, and teammates"
- Action buttons (anchor links): Profile Details, Career Stats, Change Password, Teammates

#### 4.2 Profile Details Card (`#profile-details`)
- **Avatar:** Large clickable circle showing:
  - Uploaded avatar (if exists)
  - Fallback: inGameName initials (e.g., "JS" for "John Smith") or UID first 2 chars
  - Pencil icon overlay on hover
  - Click → file input → preview → auto-upload via `/api/auth/avatar` → save via `/api/auth/profile`
- **Fields (editable form):**
  - In-Game Name (required, unique)
  - WhatsApp Contact (optional, unique)
  - Bio (optional, textarea, max 500 chars)
- **Save button** → `PUT /api/auth/profile`

#### 4.3 Career Stats Card (`#career-stats`)
**Computed client-side from:**
- `fetchAllRegistrations(undefined, userUid)` → all registrations for this user
- `fetchMatches(tournamentId)` for each approved registration

**Stats tiles:**
| Stat | Calculation |
|------|-------------|
| Tournaments | Count of unique tournamentIds in registrations |
| Matches Played | Count of matches where user's group was included AND match date < now |
| Total Kills | Sum of `registration.kills` across all approved registrations |
| Best Rank | Min of `registration.rank` (where rank > 0) |
| Total Points | Sum of `registration.totalPoints` across approved registrations |
| Chicken Dinners | Sum of `registration.chickenDinner` across approved registrations |

**Display:** Grid of 6 tiles matching 4HM style, with icons.

#### 4.4 Change Password Card (`#change-password`)
**Conditional:** Only shown if `!user.googleId` (user has a password)
- Current Password (password input, required)
- New Password (password input, min 6, required)
- Confirm New Password (password input, required)
- Update Password button → `PUT /api/auth/password`
- Divider + **Delete Account** button (existing `deleteAccount` function, already in dashboard)

#### 4.5 Teammates Card (`#teammates`)
**Data:** From `fetchAllRegistrations(undefined, userUid)` → extract all members from all registrations
- Deduplicate by `uid` (same player across tournaments)
- For each teammate: name, inGameName, uid, list of tournaments played together (badge chips)
- If `member.picture` exists (base64), show as avatar; else initials

**Table columns:** Avatar, Name, In-Game Name, UID, Tournaments Together, Actions
- Actions: View profile (future), Copy UID

**Note:** No "Add Teammate" — teammates are added during tournament registration flow.

---

## 5. Frontend API Service Extensions

### New functions in `frontend/src/services/api/auth.ts`:
```typescript
export async function updateProfile(payload: {
  inGameName?: string;
  whatsapp?: string;
  bio?: string;
  avatar?: string;
}): Promise<UserProfile>

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }>

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }>
```

---

## 6. UI/UX Details

### Design Language
- EPIX dark theme: `bg-bg-primary`, `bg-bg-secondary`, `border-border`, `text-text-primary`, `text-accent`
- Cards: `rounded-2xl border border-border bg-bg-secondary p-6 shadow-xl`
- Section headers: `flex items-center gap-2` with icon + title + chip badge
- Inputs: existing `Input` component (label, error, dark styling)
- Buttons: existing `Button` component (primary, secondary, danger, ghost-neon variants)
- Chips: `rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent`

### Responsive
- Mobile: single column, cards stack
- Tablet+: stats grid 2-3 columns, teammates table with horizontal scroll

### Loading & Error States
- Skeleton loaders for stats/teammates while fetching
- Inline form validation (reuse existing patterns)
- Toast/alert for save success/error (reuse `useAlert`)

---

## 7. Data Flow

```
Page Load
  → getSessionUser() → setUser()
  → Parallel: fetchAllRegistrations(memberUid) + fetchAllUsers()
  → Compute stats from registrations
  → Build teammates map from registration.members
  → Render sections
```

```
Profile Save
  → validate form
  → PUT /api/auth/profile
  → On success: update local user state, update sessionStorage, show success toast
```

```
Avatar Upload
  → file input change
  → POST /api/auth/avatar (multipart)
  → Get avatarUrl (base64)
  → Preview in avatar circle
  → PUT /api/auth/profile with avatar
```

---

## 8. Security Considerations

- All endpoints require valid user JWT (requireAuth middleware)
- Users can only update their own profile (uid from token)
- Avatar stored as base64 in user document (consistent with receiptImage/teamLogo)
- Password change verifies current password before updating
- Google users (uid starts with `g-`) cannot change password (no password field)

---

## 9. Testing Checklist

- [ ] Profile page loads with authenticated user
- [ ] Profile Details: edit inGameName, whatsapp, bio → save → persists after reload
- [ ] Avatar: upload image → preview → save → shows on page and in session
- [ ] Career Stats: correctly computes from registrations/matches
- [ ] Change Password: works for UID users, hidden for Google users
- [ ] Teammates: lists all unique members across registrations with tournament badges
- [ ] Delete Account: works (existing functionality)
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Loading/error states display correctly

---

## 10. Out of Scope (Future)

- Player Pics separate page (merged into Teammates)
- Web push notifications (4HM feature, separate infrastructure)
- Chat system (4HM feature)
- Leaderboard page (separate feature)
- Wallet/Shop (4HM features, not in EPIX)

---

## 11. Implementation Priority

1. **Backend:** User model + 3 endpoints + tests
2. **Frontend API:** auth.ts new functions
3. **Frontend Page:** /app/profile/page.tsx with all 4 sections
4. **Integration:** Add Profile link to PageShell navigation (optional)
5. **Polish:** Responsive, loading states, error handling