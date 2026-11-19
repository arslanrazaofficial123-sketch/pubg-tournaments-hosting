import Image from "next/image";
import { Calendar, Trophy, Users } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const slotPct = Math.min(
    100,
    Math.round((tournament.registeredTeams / Math.max(1, tournament.maxTeams)) * 100),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-[295px] w-[240px] shrink-0 flex-col overflow-hidden rounded-[20px] border border-[#223158] bg-gradient-to-b from-[#12204f] to-[#0a1020] text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-[#4d7cff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b84b] sm:h-[320px] sm:w-[300px]"
    >
      <span className="pointer-events-none absolute inset-x-4 top-0 z-10 h-px bg-linear-to-r from-transparent via-[#f2b84b]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-[#070b16]/40">
        <Image
          src={tournament.images.card}
          alt={tournament.title}
          fill
          sizes="(max-width: 640px) 240px, 300px"
          className="object-contain transition-transform duration-500 group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0a1020] via-[#0a1020]/10 to-transparent" />

        <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#f2b84b]/40 bg-[#070b16]/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#f2b84b] backdrop-blur-sm">
          <Trophy size={11} />
          {tournament.prizePool}
        </div>
        <div className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#070b16]/85 px-2.5 py-1 text-[10px] font-bold text-[#e8eefc]/85 backdrop-blur-sm">
          <Users size={11} />
          {tournament.registeredTeams}/{tournament.maxTeams}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <StatusBadge status={tournament.status} />
        </div>
        <h3
          className="truncate text-xs font-semibold leading-snug text-[#e8eefc] transition-colors group-hover:text-[#f2b84b] sm:text-sm"
          title={tournament.title}
        >
          {tournament.title}
        </h3>
        <p className="flex items-center gap-1.5 truncate text-[10px] text-[#8da0c4] sm:text-xs">
          <Calendar size={12} className="shrink-0 text-[#f2b84b]/70" />
          Deadline: {tournament.registrationDeadline}
        </p>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  slotPct >= 100
                    ? "bg-linear-to-r from-emerald-400 to-emerald-500"
                    : "bg-linear-to-r from-[#2f5bff] to-[#f2b84b]",
                )}
                style={{ width: `${slotPct}%` }}
              />
            </div>
            <span
              className={cn(
                "text-[9px] font-bold tabular-nums",
                slotPct >= 100 ? "text-emerald-400" : "text-[#f2b84b]/80",
              )}
            >
              {slotPct}%
            </span>
          </div>

          {tournament.status === "ongoing" ? (
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 whitespace-nowrap cursor-not-allowed sm:px-3.5 sm:py-1.5 sm:text-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Tournament Live
            </span>
          ) : tournament.status === "upcoming" ? (
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#f2b84b]/25 bg-[#f2b84b]/10 px-2.5 py-1 text-[10px] font-semibold text-[#f2b84b] whitespace-nowrap cursor-not-allowed sm:px-3.5 sm:py-1.5 sm:text-xs">
              Registrations Open Soon
            </span>
          ) : tournament.status === "ended" ? (
            <span className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-text-primary/40 whitespace-nowrap cursor-not-allowed sm:px-3.5 sm:py-1.5 sm:text-xs">
              Registrations Closed
            </span>
          ) : (
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2f5bff] px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-[#2f5bff]/30 transition-all group-hover:shadow-[#2f5bff]/60 whitespace-nowrap cursor-pointer sm:px-3.5 sm:py-1.5 sm:text-xs">
              Register Now
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
