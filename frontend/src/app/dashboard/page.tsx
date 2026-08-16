"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button, Input, useAlert } from "@/components/ui";
import { TournamentModal } from "@/features/tournaments/components/TournamentModal";
import { getSessionUser, isLoggedIn as checkLoggedIn, logout, setSession } from "@/lib/auth";
import { isIntegerOnly, sanitizeIntegerInput } from "@/lib/validation";
import { getTournaments, fetchAllRegistrations } from "@/services/api/tournaments";
import { fetchMatches } from "@/services/api/matches";
import { deleteAccount, linkUidToAccount } from "@/services/api/auth";
import type { UserProfile } from "@/types/auth";
import type { Tournament } from "@/types/tournament";
import { cn } from "@/lib/utils";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-lg font-bold text-text-primary/70">
        {message}
      </p>
    </div>
  );
}

function MatchCountdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      let newTime = { days: 0, hours: 0, minutes: 0, seconds: 0 };

      if (difference > 0) {
        newTime = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      setTimeLeft(newTime);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-2 text-center text-xs font-semibold sm:gap-4 sm:text-sm">
      <div className="flex flex-col rounded bg-accent/10 p-1.5 min-w-[3rem] sm:p-2">
        <span className="text-sm font-bold text-accent sm:text-lg">{timeLeft.days}</span>
        <span className="text-[10px] text-text-primary/60">Days</span>
      </div>
      <div className="flex flex-col rounded bg-accent/10 p-1.5 min-w-[3rem] sm:p-2">
        <span className="text-sm font-bold text-accent sm:text-lg">{timeLeft.hours}</span>
        <span className="text-[10px] text-text-primary/60">Hours</span>
      </div>
      <div className="flex flex-col rounded bg-accent/10 p-1.5 min-w-[3rem] sm:p-2">
        <span className="text-sm font-bold text-accent sm:text-lg">{timeLeft.minutes}</span>
        <span className="text-[10px] text-text-primary/60">Min</span>
      </div>
      <div className="flex flex-col rounded bg-accent/10 p-1.5 min-w-[3rem] sm:p-2">
        <span className="text-sm font-bold text-accent sm:text-lg">{timeLeft.seconds}</span>
        <span className="text-[10px] text-text-primary/60">Sec</span>
      </div>
    </div>
  );
}

const canShowRoomDetails = (dateStr: string, timeStr: string) => {
  const matchDate = new Date(dateStr);
  const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (timeParts) {
    matchDate.setHours(parseInt(timeParts[1], 10), parseInt(timeParts[2], 10), 0, 0);
  } else {
    const parsedWithTime = new Date(`${dateStr} ${timeStr}`);
    if (!isNaN(parsedWithTime.getTime())) {
      matchDate.setTime(parsedWithTime.getTime());
    }
  }
  const now = new Date().getTime();
  const timeDiff = matchDate.getTime() - now;
  return timeDiff <= 15 * 60 * 1000;
};

export default function DashboardPage() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [nextMatch, setNextMatch] = useState<any | null>(null);
  const [uidInput, setUidInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const isGoogleUser = user?.uid.startsWith("g-") ?? false;

  const handleLinkUid = async () => {
    setLinkError("");
    if (!isIntegerOnly(uidInput.trim())) {
      setLinkError("UID must contain integers only");
      return;
    }
    setIsLinking(true);
    try {
      const updatedUser = await linkUidToAccount(uidInput.trim());
      setSession(updatedUser);
      window.location.reload();
    } catch (error: any) {
      setLinkError(error?.message || "Failed to link UID. Please try again.");
      setIsLinking(false);
    }
  };

  const handleCopyName = () => {
    if (user?.inGameName) {
      navigator.clipboard.writeText(user.inGameName);
      setCopiedName(true);
      setTimeout(() => setCopiedName(false), 2000);
    }
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleSuccessRegistration = async () => {
    const sessionUser = getSessionUser();
    if (!sessionUser) return;
    const userUid = sessionUser.uid;
    try {
      const [tournamentsList, regs] = await Promise.all([
        getTournaments(),
        fetchAllRegistrations(undefined, userUid),
      ]);

      const myRegistrations = regs.filter((reg) =>
        reg.members.some((m: any) => m.uid === userUid)
      );

      const mappedRegs = myRegistrations.map((reg) => {
        const tournament = tournamentsList.find((t) => t.id === reg.tournamentId);
        return {
          ...reg,
          tournamentTitle: tournament?.title || "Unknown Tournament",
          tournamentStatus: tournament?.status || "unknown",
          tournamentFormat: tournament?.format || "unknown",
          tournamentPrize: tournament?.prizePool || "N/A",
          numDays: tournament?.numDays || 1,
        };
      });

      setUserRegistrations(mappedRegs);
    } catch (err) {
      console.error("Failed to refresh registrations:", err);
    }
  };

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!checkLoggedIn() || !sessionUser) {
      router.push("/link-uid");
      return;
    }
    const userUid = sessionUser.uid;
    setUser(sessionUser);
    setIsAuthorized(true);

    // Read from cache first to avoid 2-5s blank screen/loader
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`epix_dashboard_${userUid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.userRegistrations) {
            setUserRegistrations(parsed.userRegistrations);
          }
          if (parsed.nextMatch) {
            setNextMatch(parsed.nextMatch);
          }
        } catch {}
      }
    }

    async function loadDashboardData() {
      try {
        const [tournamentsList, regs] = await Promise.all([
          getTournaments(),
          fetchAllRegistrations(undefined, userUid),
        ]);

        const myRegistrations = regs.filter((reg) =>
          reg.members.some((m: any) => m.uid === userUid)
        );

        const mappedRegs = myRegistrations.map((reg) => {
          const tournament = tournamentsList.find((t) => t.id === reg.tournamentId);
          return {
            ...reg,
            tournamentTitle: tournament?.title || "Unknown Tournament",
            tournamentStatus: tournament?.status || "unknown",
            tournamentFormat: tournament?.format || "unknown",
            tournamentPrize: tournament?.prizePool || "N/A",
            numDays: tournament?.numDays || 1,
          };
        });

        setUserRegistrations(mappedRegs);

        let finalNextMatch: any = null;

        // Fetch matches for all approved tournament registrations
        const approvedRegs = mappedRegs.filter((reg) => reg.status === "approved");
        if (approvedRegs.length > 0) {
          const matchesResults = await Promise.all(
            approvedRegs.map((reg) => fetchMatches(reg.tournamentId))
          );

          const playerMatches: any[] = [];
          approvedRegs.forEach((reg, idx) => {
            const tournamentMatches = matchesResults[idx] || [];
            const filtered = tournamentMatches.filter(
              (m) => m.groups && m.groups.includes(reg.group)
            );
            filtered.forEach((m) => {
              playerMatches.push({
                ...m,
                tournamentTitle: reg.tournamentTitle,
              });
            });
          });

          // Find the next upcoming match
          const getMatchDateTime = (dateStr: string, timeStr: string) => {
            const matchDate = new Date(dateStr);
            const timeParts = timeStr.match(/^(\d{1,2}):(\d{2})$/);
            if (timeParts) {
              matchDate.setHours(parseInt(timeParts[1], 10), parseInt(timeParts[2], 10), 0, 0);
            } else {
              const parsedWithTime = new Date(`${dateStr} ${timeStr}`);
              if (!isNaN(parsedWithTime.getTime())) {
                matchDate.setTime(parsedWithTime.getTime());
              }
            }
            return matchDate;
          };

          const now = new Date();
          const futureMatches = playerMatches
            .map((m) => ({ ...m, dateTime: getMatchDateTime(m.date, m.time) }))
            .filter((m) => m.dateTime.getTime() > now.getTime())
            .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

          if (futureMatches.length > 0) {
            finalNextMatch = futureMatches[0];
            setNextMatch(futureMatches[0]);
          } else {
            setNextMatch(null);
          }
        } else {
          setNextMatch(null);
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(
            `epix_dashboard_${userUid}`,
            JSON.stringify({
              userRegistrations: mappedRegs,
              nextMatch: finalNextMatch,
            })
          );
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    }
    loadDashboardData();
  }, [router]);

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTournament(null);
  };

  const handleSignOut = () => {
    logout();
    router.push("/");
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

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const pendingOrRejectedRegs = userRegistrations.filter((reg) => reg.status !== "approved");

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Profile Card & Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-bg-secondary p-6 shadow-xl sm:p-8">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-accent/5 blur-3xl" />

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-text-primary sm:text-2xl">
                  {user?.inGameName ?? "Player"}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyName}
                  className="rounded-md p-1.5 text-text-primary/40 hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
                  title="Copy Name"
                >
                  {copiedName ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-text-primary/60">UID · {user?.uid}</p>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="rounded-md p-1 text-text-primary/40 hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
                  title="Copy UID"
                >
                  {copiedUid ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-500"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/profile")} className="py-2.5">
                View Profile
              </Button>
              <Button variant="secondary" onClick={handleSignOut} className="py-2.5">
                Unlink
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteAccount}
                className="py-2.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {/* Link PUBG UID (Google users) */}
        {isGoogleUser && (
          <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-6 shadow-xl sm:p-8">
            <h3 className="text-lg font-bold text-text-primary">
              Link your PUBG UID
            </h3>
            <p className="mt-1 text-xs text-text-primary/60">
              You signed in with Google. Enter your PUBG Mobile UID to link it to
              your account so your team registrations appear in this dashboard.
            </p>
            <div className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row">
              <Input
                label="PUBG UID"
                name="linkUid"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter your PUBG UID"
                value={uidInput}
                onChange={(event) => {
                  setUidInput(sanitizeIntegerInput(event.target.value));
                  setLinkError("");
                }}
                error={linkError}
              />
              <Button
                variant="primary"
                onClick={handleLinkUid}
                disabled={isLinking}
                className="sm:w-auto"
              >
                {isLinking ? "Linking..." : "Link UID"}
              </Button>
            </div>
          </div>
        )}

        {/* Next Match Countdown Card */}
        {nextMatch && (
          <div className="mt-8 relative overflow-hidden rounded-2xl border border-border bg-bg-secondary p-6 shadow-xl sm:p-8 animate-fade-in-up">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-accent/5 blur-3xl" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative">
              <div className="space-y-4">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20 mb-2">
                    Next Up
                  </span>
                  <h2 className="text-xl font-black text-text-primary uppercase sm:text-2xl tracking-tight">
                    {nextMatch.title}
                  </h2>
                  <p className="text-sm text-text-primary/60 mt-1">
                    Tournament: <span className="font-semibold text-text-primary">{nextMatch.tournamentTitle}</span> · Map: <span className="font-semibold text-text-primary uppercase">{nextMatch.map}</span> · Group: <span className="text-accent font-bold">{nextMatch.groups?.join(", ")}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-text-primary/70">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Date</span>
                    <span className="font-semibold text-text-primary">{nextMatch.date}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Time</span>
                    <span className="font-semibold text-text-primary">{nextMatch.time}</span>
                  </div>
                  {(() => {
                    const canShow = canShowRoomDetails(nextMatch.date, nextMatch.time);
                    if (canShow) {
                      return (
                        <>
                          {nextMatch.roomId && (
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Room ID</span>
                              <span className="font-mono font-bold text-emerald-400">{nextMatch.roomId}</span>
                            </div>
                          )}
                          {nextMatch.roomPassword && (
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Room Password</span>
                              <span className="font-mono font-bold text-emerald-400">{nextMatch.roomPassword}</span>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      return (
                        <div className="col-span-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            Room details 15m before start
                          </span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              <div className="flex flex-col items-center lg:items-end gap-2 shrink-0">
                <span className="text-[10px] uppercase font-extrabold text-text-primary/30 tracking-widest block mb-1">Countdown</span>
                <MatchCountdown targetDate={nextMatch.dateTime} />
              </div>
            </div>
          </div>
        )}

        {/* My Tournament Registrations Status */}
        <div className="mt-12">
          <div className="rounded-2xl border border-border bg-bg-secondary overflow-hidden shadow-xl">
            <div className="p-6 border-b border-border bg-white/[0.01]">
              <h3 className="text-lg font-bold text-text-primary">My Tournament Registrations</h3>
              <p className="text-xs text-text-primary/44 mt-1">
                Track verification progress and status of your team registrations
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-white/[0.01] text-xs font-bold uppercase tracking-wider text-text-primary/50">
                    <th className="px-6 py-4">Tournament</th>
                    <th className="px-6 py-4">Team/Solo Name</th>
                    <th className="px-6 py-4">Format & Group</th>
                    <th className="px-6 py-4">Members</th>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {pendingOrRejectedRegs.length > 0 ? (
                    pendingOrRejectedRegs.map((reg) => (
                      <tr key={reg.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 font-semibold text-text-primary">
                          {reg.tournamentTitle}
                        </td>
                        <td className="px-6 py-4 text-text-primary/80">
                          {reg.teamName || "Solo Player"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-accent font-semibold">{reg.tournamentFormat}</span>
                          <span className="text-text-primary/45 mx-2">·</span>
                          <span className="text-xs text-text-primary/60 font-medium">{reg.group}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {reg.members.map((m: any, idx: number) => (
                              <div key={m.uid} className="flex items-center gap-1.5 text-xs text-text-primary/80">
                                <span className="text-accent font-semibold">P{idx + 1}:</span>
                                <span>{m.inGameName}</span>
                                <span className="text-text-primary/40 font-mono">({m.uid})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-text-primary/60">
                          {reg.transactionId}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                              reg.status === "approved"
                                ? "bg-green-500/15 text-green-400"
                                : reg.status === "rejected"
                                  ? "bg-red-500/15 text-red-400"
                                  : "bg-yellow-500/15 text-yellow-400"
                            )}
                          >
                            {reg.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-primary/40">
                        You have no pending or rejected registrations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>



      </div>

      <TournamentModal
        tournament={selectedTournament}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccessRegistration}
      />
    </PageShell>
  );
}
