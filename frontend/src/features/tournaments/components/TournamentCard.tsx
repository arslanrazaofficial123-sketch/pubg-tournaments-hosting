import Image from "next/image";
import type { Tournament } from "@/types/tournament";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
  index?: number;
}

const BG = [
  "from-[#16286a]",
  "from-[#2a1e55]",
  "from-[#17325c]",
] as const;

/** Poster-style tournament card. Same data and click behaviour as before. */
export function TournamentCard({ tournament, onClick, index = 1 }: TournamentCardProps) {
  const slotPct = Math.min(
    100,
    Math.round((tournament.registeredTeams / Math.max(1, tournament.maxTeams)) * 100),
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[440px] w-full flex-col justify-between overflow-hidden rounded-[20px] border border-[#223158] bg-gradient-to-b to-[#0a1020] p-6 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-[#4d7cff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2b84b]",
        BG[(index - 1) % BG.length],
      )}
    >
      <Image
        src={tournament.images.card}
        alt=""
        fill
        sizes="320px"
        className="object-cover opacity-30 transition-transform duration-700 group-hover:scale-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#0a1020]/40 to-[#0a1020]" />
      <span
        aria-hidden="true"
        className="epx-ghost absolute -right-2 -top-1 text-[150px]"
      >
        {String(index).padStart(2, "0")}
      </span>

      <div className="relative flex items-start justify-between gap-2">
        <StatusBadge status={tournament.status} />
      </div>

      <div className="relative">
        <h3
          className="epx-hd text-[26px] font-bold leading-[1.08] text-[#e8eefc]"
          title={tournament.title}
        >
          {tournament.title}
        </h3>
        <p className="mt-2 text-sm capitalize text-[#a4b3d1]">
          {tournament.format} · {tournament.registeredTeams}/{tournament.maxTeams} teams
        </p>

        <div className="mt-4 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                slotPct >= 100 ? "bg-emerald-400" : "bg-gradient-to-r from-[#2f5bff] to-[#f2b84b]",
              )}
              style={{ width: `${slotPct}%` }}
            />
          </div>
          <span className={cn("text-[11px] font-bold tabular-nums", slotPct >= 100 ? "text-emerald-400" : "text-[#f2b84b]")}>
            {slotPct}%
          </span>
        </div>

        <div className="mt-4 flex justify-between gap-3 border-t border-white/15 pt-4 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-[#8da0c4]">Deadline</div>
            <div className="mt-0.5 font-semibold text-[#e8eefc]">{tournament.registrationDeadline}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.1em] text-[#8da0c4]">Prize pool</div>
            <div className="mt-0.5 font-semibold text-[#f2b84b]">{tournament.prizePool}</div>
          </div>
        </div>

        {tournament.status === "ongoing" ? (
          <span className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-sm font-semibold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Tournament Live
          </span>
        ) : tournament.status === "upcoming" ? (
          <span className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full border border-[#f2b84b]/30 bg-[#f2b84b]/10 text-sm font-semibold text-[#f2b84b]">
            Registrations Open Soon
          </span>
        ) : tournament.status === "ended" ? (
          <span className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-[#e8eefc]/40">
            Registrations Closed
          </span>
        ) : (
          <span className="epx-hd mt-5 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[#2f5bff] text-base font-semibold text-white shadow-lg shadow-[#2f5bff]/30 transition-all group-hover:shadow-[#2f5bff]/60">
            Register squad
          </span>
        )}
      </div>
    </button>
  );
}
