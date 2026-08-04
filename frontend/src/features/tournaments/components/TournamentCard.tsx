import Image from "next/image";
import type { Tournament } from "@/types/tournament";
import { formatDateRange } from "@/lib/utils";
import { TOURNAMENT_CARD } from "@/lib/constants";
import { StatusBadge } from "./StatusBadge";

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-bg-secondary text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent w-[240px] sm:w-[300px] h-[280px] sm:h-[301px]"
    >
      <div className="relative w-full shrink-0 overflow-hidden aspect-video">
        <Image
          src={tournament.images.card}
          alt={tournament.title}
          fill
          sizes="(max-width: 640px) 240px, 300px"
          className="object-contain transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-bg-primary/80 via-transparent to-transparent" />
      </div>

      <div className="flex flex-col gap-1.5 p-3 sm:p-4 flex-1 justify-between">
        <div className="space-y-1">
          <StatusBadge status={tournament.status} />
          <h3 className="truncate text-xs sm:text-sm font-semibold leading-snug text-text-primary group-hover:text-accent" title={tournament.title}>
            {tournament.title}
          </h3>
          <p className="truncate text-[10px] sm:text-xs text-text-primary/60">
            Deadline: {tournament.registrationDeadline}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-sm font-medium text-accent truncate max-w-[120px]">
            Prize: {tournament.prizePool}
          </span>
          {tournament.status === "ongoing" ? (
            <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] sm:text-xs font-semibold text-text-primary/40 whitespace-nowrap cursor-not-allowed">
              Tournament Live
            </span>
          ) : tournament.status === "upcoming" ? (
            <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] sm:text-xs font-semibold text-text-primary/40 whitespace-nowrap cursor-not-allowed">
              Registrations Open Soon
            </span>
          ) : tournament.status === "ended" ? (
            <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] sm:text-xs font-semibold text-text-primary/40 whitespace-nowrap cursor-not-allowed">
              Registrations Closed
            </span>
          ) : (
            <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-accent text-[10px] sm:text-xs font-semibold text-text-primary hover:bg-accent/80 transition-colors shadow-sm cursor-pointer whitespace-nowrap">
              Register
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
