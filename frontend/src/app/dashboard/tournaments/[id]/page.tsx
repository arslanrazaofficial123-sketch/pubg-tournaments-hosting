"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getSessionUser, isLoggedIn as checkLoggedIn } from "@/lib/auth";
import { getTournamentById, fetchAllRegistrations, type Registration } from "@/services/api/tournaments";
import { fetchMatches, type Match } from "@/services/api/matches";
import type { Tournament } from "@/types/tournament";
import { cn } from "@/lib/utils";
import { Info, Calendar, Trophy } from "lucide-react";

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

interface DetailedRegistration extends Registration {
  tournamentTitle: string;
  tournamentFormat: string;
  tournamentPrize: string;
  numDays: number;
}

function MatchCountdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex gap-2 sm:gap-4 text-center">
      {timeLeft.days > 0 && (
        <div className="flex flex-col p-2 bg-white/5 border border-white/10 rounded-xl min-w-[65px] sm:min-w-[70px]">
          <span className="text-lg sm:text-xl font-black text-accent">{timeLeft.days}</span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-text-primary/40 font-bold">Days</span>
        </div>
      )}
      <div className="flex flex-col p-2 bg-white/5 border border-white/10 rounded-xl min-w-[65px] sm:min-w-[70px]">
        <span className="text-lg sm:text-xl font-black text-accent">{timeLeft.hours}</span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-text-primary/40 font-bold">Hours</span>
      </div>
      <div className="flex flex-col p-2 bg-white/5 border border-white/10 rounded-xl min-w-[65px] sm:min-w-[70px]">
        <span className="text-lg sm:text-xl font-black text-accent">{timeLeft.minutes}</span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-text-primary/40 font-bold">Minutes</span>
      </div>
      <div className="flex flex-col p-2 bg-white/5 border border-white/10 rounded-xl min-w-[65px] sm:min-w-[70px]">
        <span className="text-lg sm:text-xl font-black text-accent">{timeLeft.seconds}</span>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-text-primary/40 font-bold">Seconds</span>
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

export default function TournamentTeamPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [registration, setRegistration] = useState<DetailedRegistration | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "leaderboard">("overview");
  const [activeDay, setActiveDay] = useState(1);
  const [nextMatch, setNextMatch] = useState<any | null>(null);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!checkLoggedIn() || !sessionUser) {
      router.push("/link-uid");
      return;
    }
    const userUid = sessionUser.uid;

    // Read from cache first to avoid 2-5s blank screen/loader
    if (typeof window !== "undefined" && tournamentId) {
      const cached = localStorage.getItem(`epix_tournament_${tournamentId}_${userUid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.tournament) setTournament(parsed.tournament);
          if (parsed.registration) setRegistration(parsed.registration);
          if (parsed.matches) setMatches(parsed.matches);
          if (parsed.allRegistrations) setAllRegistrations(parsed.allRegistrations);
          if (parsed.nextMatch) setNextMatch(parsed.nextMatch);
          setIsLoading(false);
        } catch {}
      }
    }

    async function loadData() {
      try {
        const [tournament, regs, allMatches] = await Promise.all([
          getTournamentById(tournamentId),
          fetchAllRegistrations(tournamentId),
          fetchMatches(tournamentId),
        ]);

        const myReg = regs.find(
          (reg) =>
            reg.tournamentId === tournamentId &&
            reg.status === "approved" &&
            reg.members.some((m: any) => m.uid === userUid)
        );

        if (!myReg) {
          router.push("/dashboard");
          return;
        }

        if (tournament) {
          setTournament(tournament);
        }

        const mappedReg = {
          ...myReg,
          tournamentTitle: tournament?.title || "Unknown Tournament",
          tournamentFormat: tournament?.format || "unknown",
          tournamentPrize: tournament?.prizePool || "N/A",
          numDays: tournament?.numDays || 1,
        };

        setRegistration(mappedReg);

        const groupMatches = allMatches.filter((m) => m.groups && m.groups.includes(myReg.group));
        setMatches(groupMatches);

        const approvedRegs = regs.filter(
          (reg) => reg.tournamentId === tournamentId && reg.status === "approved"
        );
        setAllRegistrations(approvedRegs);

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
        const futureMatches = groupMatches
          .map((m) => ({ ...m, dateTime: getMatchDateTime(m.date, m.time) }))
          .filter((m) => m.dateTime.getTime() > now.getTime())
          .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

        let resolvedNextMatch: any = null;
        if (futureMatches.length > 0) {
          resolvedNextMatch = futureMatches[0];
          setNextMatch(futureMatches[0]);
        } else {
          setNextMatch(null);
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(
            `epix_tournament_${tournamentId}_${userUid}`,
            JSON.stringify({
              tournament,
              registration: mappedReg,
              matches: groupMatches,
              allRegistrations: approvedRegs,
              nextMatch: resolvedNextMatch,
            })
          );
        }
      } catch (err) {
        console.error("Failed to load registration details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (tournamentId) {
      loadData();
    }
  }, [router, tournamentId]);

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in-up">
        {isLoading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          </div>
        ) : !registration ? (
          <div className="text-center py-12 text-text-primary/50">
            Registration details not found.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header section - Standalone Card */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-bg-secondary p-5 sm:p-6 shadow-xl">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-green-500/5 blur-3xl" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 mb-2">
                    Approved & Verified
                  </span>
                  <h1 className="text-xl font-black text-text-primary uppercase tracking-tight">
                    {registration.tournamentTitle}
                  </h1>
                  <p className="text-xs text-text-primary/40 mt-1">
                    Format: <span className="text-accent font-bold uppercase">{registration.tournamentFormat}</span> · Allocated: <span className="text-text-primary/70 font-semibold">{registration.group}</span>
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[9px] uppercase font-bold text-text-primary/30 block tracking-widest">Prize Pool</span>
                  <span className="text-xl font-black text-accent">{registration.tournamentPrize}</span>
                </div>
              </div>
            </div>

            {/* Next Match Countdown Banner - Standalone Card */}
            {nextMatch && (
              <div className="relative overflow-hidden rounded-xl border border-border bg-bg-secondary p-5 sm:p-6 shadow-xl animate-fade-in-up">
                <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-accent/5 blur-2xl" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                  <div className="space-y-1 relative">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/25">
                      Next Match Starts In
                    </span>
                    <h3 className="font-extrabold text-sm text-text-primary uppercase tracking-tight mt-1">
                      {nextMatch.title} ({nextMatch.map})
                    </h3>
                    <span className="text-[11px] text-text-primary/50 block">Day {nextMatch.day} · Date: {nextMatch.date} · Time: {nextMatch.time}</span>
                  </div>
                  <div className="relative shrink-0 flex justify-start md:justify-end">
                    <MatchCountdown targetDate={nextMatch.dateTime} />
                  </div>
                </div>
              </div>
            )}

            {/* Tab navigation */}
            <div className="border-b border-border/40 px-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={cn(
                    "relative px-3 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === "overview"
                      ? "text-text-primary font-semibold"
                      : "text-text-primary/60 hover:text-text-primary/95"
                  )}
                >
                  <Info size={14} className="sm:w-4 sm:h-4" />
                  <span>Overview</span>
                  <span
                    className={cn(
                      "absolute bottom-0 left-2 right-2 sm:left-4 sm:right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                      activeTab === "overview" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    )}
                  />
                </button>
                <button
                  onClick={() => setActiveTab("matches")}
                  className={cn(
                    "relative px-3 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === "matches"
                      ? "text-text-primary font-semibold"
                      : "text-text-primary/60 hover:text-text-primary/95"
                  )}
                >
                  <Calendar size={14} className="sm:w-4 sm:h-4" />
                  <span>Match Schedule</span>
                  <span
                    className={cn(
                      "absolute bottom-0 left-2 right-2 sm:left-4 sm:right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                      activeTab === "matches" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    )}
                  />
                </button>
                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className={cn(
                    "relative px-3 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === "leaderboard"
                      ? "text-text-primary font-semibold"
                      : "text-text-primary/60 hover:text-text-primary/95"
                  )}
                >
                  <Trophy size={14} className="sm:w-4 sm:h-4" />
                  <span>Leaderboards</span>
                  <span
                    className={cn(
                      "absolute bottom-0 left-2 right-2 sm:left-4 sm:right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                      activeTab === "leaderboard" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-6 relative min-h-[300px]">
              <div
                className={cn(
                  "space-y-6 transition-all duration-300 ease-out",
                  activeTab === "overview"
                    ? "block opacity-100 translate-y-0 animate-fade-in-up"
                    : "hidden opacity-0 translate-y-4"
                )}
              >
                {/* Registration Details Card */}
                <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-border bg-white/[0.01]">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Registration Details</h3>
                  </div>
                  <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-text-primary/30 tracking-widest block">Team / Solo Name</span>
                      <span className="text-base font-bold text-text-primary">{registration.teamName || "Solo Player"}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-text-primary/30 tracking-widest block">Contact (WhatsApp)</span>
                      <span className="text-base font-mono text-text-primary">{registration.whatsapp}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-text-primary/30 tracking-widest block">Transaction Reference ID</span>
                      <span className="text-base font-mono text-text-primary/80">{registration.transactionId}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-text-primary/30 tracking-widest block">Registration Date</span>
                      <span className="text-base text-text-primary/80">
                        {new Date(registration.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "medium"
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Members List Card */}
                <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-border bg-white/[0.01]">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Squad Members</h3>
                  </div>
                  <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {registration.members.map((member, i) => (
                      <div
                        key={member.uid}
                        className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-accent/15 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                            P{i + 1}
                          </div>
                          <div>
                            <span className="block font-semibold text-xs text-text-primary">
                              {member.inGameName}
                            </span>
                            <span className="block text-[9px] font-mono text-text-primary/40">
                              UID: {member.uid}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tournament Groups & Teams List Card */}
                <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-border bg-white/[0.01]">
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Tournament Groups & Opponents</h3>
                  </div>
                  <div className="p-5 sm:p-6">
                    {(() => {
                      const groupsMap: { [key: string]: any[] } = {};
                      allRegistrations.forEach((reg) => {
                        const gName = reg.group || "Unassigned";
                        if (!groupsMap[gName]) {
                          groupsMap[gName] = [];
                        }
                        groupsMap[gName].push(reg);
                      });

                      const groupNames = Array.from(
                        { length: tournament?.numGroups || 1 },
                        (_, i) => `Group ${String.fromCharCode(65 + i)}`
                      );

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {groupNames.map((gName) => {
                            const groupRegs = groupsMap[gName] || [];
                            return (
                              <div key={gName} className="rounded-xl border border-white/5 bg-white/[0.005] overflow-hidden">
                                <div className="bg-white/5 px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                                  <span className="font-bold text-xs text-accent uppercase tracking-wider">{gName}</span>
                                  <span className="text-[10px] font-semibold text-text-primary/50">{groupRegs.length} {groupRegs.length === 1 ? "Team" : "Teams"}</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                  {groupRegs.length > 0 ? (
                                    groupRegs.map((reg) => (
                                      <div key={reg.id} className="p-3 flex items-center justify-between hover:bg-white/[0.01] transition-all">
                                        <span className="font-bold text-xs text-text-primary">
                                          {reg.teamName || "Solo Player"}
                                        </span>
                                        {reg.id === registration.id && (
                                          <span className="px-2 py-0.5 rounded bg-accent/15 border border-accent/25 text-[8px] font-bold text-accent uppercase tracking-wider">
                                            My Team
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-text-primary/30 text-xs font-semibold">
                                      No teams registered in this group yet.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "space-y-6 bg-bg-secondary border border-border rounded-xl p-5 sm:p-6 shadow-xl transition-all duration-300 ease-out",
                  activeTab === "matches"
                    ? "block opacity-100 translate-y-0 animate-fade-in-up"
                    : "hidden opacity-0 translate-y-4"
                )}
              >
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto border-b border-border/40 pb-2">
                  {Array.from({ length: Math.max(registration.numDays || 1, ...matches.map((m) => m.day), 1) }, (_, i) => i + 1).map((day) => {
                    const isActive = activeDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setActiveDay(day)}
                        className={cn(
                          "relative block px-5 py-3.5 text-sm font-medium transition-all duration-300 cursor-pointer",
                          isActive
                            ? "text-text-primary font-semibold"
                            : "text-text-primary/60 hover:text-text-primary/95"
                        )}
                      >
                        Day {day}
                        <span
                          className={cn(
                            "absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                            isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Matches list for selected day */}
                <div key={activeDay} className="animate-fade-in-up">
                  {(() => {
                    const dayMatches = matches.filter((m) => m.day === activeDay);
                    return dayMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayMatches.map((match) => (
                          <div
                            key={match.id}
                            className="p-5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between min-h-[140px] relative overflow-hidden break-words max-w-md w-full"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-bold text-sm text-text-primary leading-tight">{match.title}</span>
                              <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-xs font-bold text-text-primary/85 uppercase shrink-0">
                                {match.map}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs text-text-primary/60 border-t border-white/5 pt-3 mt-3">
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Date</span>
                                <span className="font-semibold text-text-primary">{match.date}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Time</span>
                                <span className="font-semibold text-text-primary">{match.time}</span>
                              </div>
                              {(() => {
                                const canShow = canShowRoomDetails(match.date, match.time);
                                if (canShow) {
                                  return (
                                    <>
                                      {match.roomId && (
                                        <div>
                                          <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Room ID</span>
                                          <span className="font-mono font-bold text-emerald-400">{match.roomId}</span>
                                        </div>
                                      )}
                                      {match.roomPassword && (
                                        <div>
                                          <span className="block text-[9px] uppercase font-bold text-text-primary/30 tracking-widest">Room Password</span>
                                          <span className="font-mono font-bold text-emerald-400">{match.roomPassword}</span>
                                        </div>
                                      )}
                                    </>
                                  );
                                } else {
                                  return (
                                    <div className="col-span-2 mt-1">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                        Room info 15m before start
                                      </span>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message={`No matches scheduled for Day ${activeDay} yet.`} />
                    );
                  })()}
                </div>
              </div>

              <div
                className={cn(
                  "space-y-6 transition-all duration-300 ease-out",
                  activeTab === "leaderboard"
                    ? "block opacity-100 translate-y-0 animate-fade-in-up"
                    : "hidden opacity-0 translate-y-4"
                )}
              >
                {(() => {
                  const grouped = allRegistrations.reduce((acc, reg) => {
                    const groupName = reg.group || "Unassigned";
                    if (!acc[groupName]) acc[groupName] = [];
                    acc[groupName].push(reg);
                    return acc;
                  }, {} as Record<string, typeof allRegistrations>);

                  const groupNames = Array.from(
                    { length: tournament?.numGroups || 1 },
                    (_, i) => `Group ${String.fromCharCode(65 + i)}`
                  );

                  return (
                    <div className="space-y-8">
                      {groupNames.map((gName) => {
                        const sortedRegs = grouped[gName]
                          ? [...grouped[gName]].sort((a, b) => {
                              const rankA = a.rank || 999999;
                              const rankB = b.rank || 999999;
                              if (rankA !== rankB) return rankA - rankB;
                              return (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
                            })
                          : [];

                        return (
                          <div key={gName} className="rounded-xl border border-border bg-bg-secondary overflow-hidden shadow-xl">
                            <div className="bg-white/5 px-5 py-3.5 border-b border-border flex items-center justify-between">
                              <span className="font-bold text-sm text-accent uppercase tracking-wider">{gName} Standings</span>
                              <span className="text-[10px] font-bold text-text-primary/50 uppercase tracking-widest">{sortedRegs.length} Teams</span>
                            </div>
                            <div className="overflow-x-auto">
                              {sortedRegs.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-border bg-white/[0.005] text-[10px] font-bold uppercase tracking-wider text-text-primary/40">
                                      <th className="px-5 py-3 w-16 text-center">Rank</th>
                                      <th className="px-5 py-3">Team/Player</th>
                                      <th className="px-5 py-3 w-20 text-center">Kills</th>
                                      <th className="px-5 py-3 w-24 text-center">Chicken Dinners</th>
                                      <th className="px-5 py-3 w-20 text-center">Points</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60 text-xs">
                                    {sortedRegs.map((reg) => {
                                      const rank = reg.rank;
                                      let rankBadge = null;
                                      if (rank === 1) {
                                        rankBadge = <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-black text-[10px] border border-yellow-500/30">1</span>;
                                      } else if (rank === 2) {
                                        rankBadge = <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300/20 text-slate-300 font-black text-[10px] border border-slate-300/30">2</span>;
                                      } else if (rank === 3) {
                                        rankBadge = <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600/20 text-amber-500 font-black text-[10px] border border-amber-600/30">3</span>;
                                      } else if (rank > 3) {
                                        rankBadge = <span className="text-text-primary/60 font-bold">#{rank}</span>;
                                      } else {
                                        rankBadge = <span className="text-text-primary/30">-</span>;
                                      }

                                      return (
                                        <tr key={reg.id} className={cn(
                                          "hover:bg-white/[0.005] transition-colors",
                                          reg.id === registration?.id ? "bg-accent/5 font-semibold" : ""
                                        )}>
                                          <td className="px-5 py-3 text-center font-bold">
                                            {rankBadge}
                                          </td>
                                          <td className="px-5 py-3 font-bold text-text-primary">
                                            <div className="flex flex-col gap-0.5">
                                              <span>{reg.teamName || "Solo Player"}</span>
                                              {reg.id === registration?.id && (
                                                <span className="text-[8px] text-accent uppercase font-bold tracking-wider">My Team</span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-5 py-3 text-center text-text-primary/80">
                                            {reg.kills ?? 0}
                                          </td>
                                          <td className="px-5 py-3 text-center text-text-primary/80">
                                            {reg.chickenDinner ?? 0}
                                          </td>
                                          <td className="px-5 py-3 text-center font-bold text-accent">
                                            {reg.totalPoints ?? 0}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="p-6 text-center text-text-primary/30 text-xs font-semibold">
                                  No teams registered in this group yet.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
