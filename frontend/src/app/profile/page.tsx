"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertProvider";
import { getSessionUser, isLoggedIn as checkLoggedIn, setSession } from "@/lib/auth";
import {
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
