"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertProvider";
import { getSessionUser, isLoggedIn as checkLoggedIn, logout, setSession } from "@/lib/auth";
import {
  changePassword,
  fetchAllRegistrations,
  getTournaments,
  updateProfile,
  uploadAvatar,
} from "@/services/api";
import { fetchMatches } from "@/services/api/matches";
import { deleteAccount } from "@/services/api/auth";
import type { UserProfile } from "@/types/auth";
import type { Registration } from "@/services/api/tournaments";
import type { Tournament } from "@/types/tournament";

function getInitials(name: string, uid: string): string {
  const source = name.trim() || uid.trim() || "EP";
  return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Profile details form
  const [inGameName, setInGameName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  // Career stats data
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matchesPlayed, setMatchesPlayed] = useState(0);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!checkLoggedIn() || !sessionUser) {
      router.push("/");
      return;
    }
    setUser(sessionUser);
    setInGameName(sessionUser.inGameName || "");
    setWhatsapp(sessionUser.whatsapp || "");
    setBio(sessionUser.bio || "");
    setIsAuthorized(true);

    (async () => {
      const [regs, tns] = await Promise.all([
        fetchAllRegistrations(undefined, sessionUser.uid),
        getTournaments(),
      ]);
      setRegistrations(regs);
      setTournaments(tns);

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
    })();
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
    showConfirm("Are you sure you want to permanently delete your account?", async () => {
      try {
        await deleteAccount(user.uid);
        showAlert("Account deleted successfully.", "success");
        logout();
        router.push("/");
      } catch (error) {
        console.error("Failed to delete account:", error);
        showAlert("Failed to delete account. Please try again.", "error");
      }
    });
  };

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
            <Button variant="outline" onClick={handleDeleteAccount} className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60">
              Delete Account
            </Button>
          </div>
        </section>
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
      </div>
    </PageShell>
  );
}
