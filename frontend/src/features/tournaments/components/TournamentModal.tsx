import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Tournament } from "@/types/tournament";
import { TOURNAMENT_MODAL } from "@/lib/constants";
import { Button, Modal, useAlert } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import { isLoggedIn } from "@/lib/auth";
import { RegisterTournamentModal } from "./RegisterTournamentModal";
import { X, Trophy, Gamepad2, Calendar, Clock, LayoutGrid, Users, CreditCard } from "lucide-react";

interface TournamentModalProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TournamentModal({
  tournament,
  isOpen,
  onClose,
  onSuccess,
}: TournamentModalProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  if (!tournament) return null;

  const handleRegisterClick = () => {
    if (!isLoggedIn()) {
      router.push("/link-uid");
      return;
    }
    setIsRegisterOpen(true);
  };

  const registrationPercent = Math.round(
    (tournament.registeredTeams / tournament.maxTeams) * 100,
  );

  const isSolo = tournament.format.toLowerCase().includes("solo");
  const isDuo = tournament.format.toLowerCase().includes("duo");
  const isSquad = tournament.format.toLowerCase().includes("squad");

  let slotsLabel = "Slots Filled";
  let countLabel = `${tournament.registeredTeams} / ${tournament.maxTeams} Teams`;

  if (isSolo) {
    slotsLabel = "Solo Slots Filled";
    countLabel = `${tournament.registeredTeams} / ${tournament.maxTeams} Players`;
  } else if (isDuo) {
    slotsLabel = "Duo Slots Filled";
    countLabel = `${tournament.registeredTeams} / ${tournament.maxTeams} Teams`;
  } else if (isSquad) {
    slotsLabel = "Squad Slots Filled";
    countLabel = `${tournament.registeredTeams} / ${tournament.maxTeams} Teams`;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tournament.title}
      width={TOURNAMENT_MODAL.width}
      hideHeader
    >
      {/* Banner & Header Image Container */}
      <div className="relative w-full overflow-hidden aspect-video">
        <Image
          src={tournament.images.modal}
          alt={tournament.title}
          fill
          sizes={`${TOURNAMENT_MODAL.width}px`}
          priority
          className="object-contain"
        />

        {/* Ambient Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-bg-secondary/40 to-black/30" />

        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-text-primary/80 backdrop-blur-md transition-all hover:bg-black/60 hover:text-accent hover:border-accent/40"
          aria-label="Close modal"
        >
          <X size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>

        {/* Floating Title & Status */}
        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 flex flex-col gap-1.5 sm:gap-2">
          <div>
            <StatusBadge status={tournament.status} />
          </div>
          <h2 className="text-base sm:text-2xl font-bold uppercase tracking-wide text-text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {tournament.title}
          </h2>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Dynamic Theme-Colored Detail Grid (No Emojis) */}
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5 sm:grid-cols-2">
          {/* Prize Pool */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Trophy size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Prize Pool</span>
              <span className="text-xs sm:text-sm font-semibold text-accent">{tournament.prizePool}</span>
            </div>
          </div>

          {/* Format / Type */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Gamepad2 size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Type</span>
              <span className="text-xs sm:text-sm font-semibold text-text-primary">{tournament.format}</span>
            </div>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Calendar size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Start Date</span>
              <span className="text-xs sm:text-sm font-semibold text-text-primary/90">{tournament.startDate}</span>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Clock size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Duration</span>
              <span className="text-xs sm:text-sm font-semibold text-text-primary/90">{tournament.numDays} Days</span>
            </div>
          </div>

          {/* Groups */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <LayoutGrid size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Groups</span>
              <span className="text-xs sm:text-sm font-semibold text-text-primary/90">{tournament.numGroups} Groups</span>
            </div>
          </div>

          {/* Teams per Group */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Users size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Teams Per Group</span>
              <span className="text-xs sm:text-sm font-semibold text-text-primary/90">{tournament.teamsPerGroup} Teams</span>
            </div>
          </div>

          {/* Registration Fee */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <CreditCard size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Registration Fee</span>
              <span className="text-xs sm:text-sm font-semibold text-text-primary">{tournament.registrationFee}</span>
            </div>
          </div>

          {/* Registration Deadline */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:p-3.5 transition-colors hover:border-accent/20 hover:bg-white/[0.04]">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Clock size={16} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Registration Deadline</span>
              <span className="text-sm font-semibold text-text-primary">{tournament.registrationDeadline}</span>
            </div>
          </div>
        </div>

        {/* Glowing Progress bar */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
          <div className="mb-2.5 flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold uppercase tracking-wider text-text-primary/45">
              {slotsLabel}
            </span>
            <span className="font-bold text-text-primary bg-white/5 px-2 py-0.5 rounded text-xs">
              {countLabel}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-bg-primary">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] transition-all duration-500 ease-out"
              style={{ width: `${registrationPercent}%` }}
            />
          </div>
        </div>

        {/* Description (shown at the end of the modal) */}
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-text-primary/45">Description</span>
          <p className="text-sm leading-relaxed text-text-primary/70 whitespace-pre-line">
            {tournament.description}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {tournament.status === "registration_open" && (
            <Button
              onClick={handleRegisterClick}
              fullWidth
              size="lg"
              className="shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.01] active:scale-100 transition-all duration-200 py-3.5"
            >
              Register
            </Button>
          )}

          {tournament.status === "upcoming" && (
            <Button
              fullWidth
              size="lg"
              disabled
              className="py-3.5"
            >
              Registrations Open Soon
            </Button>
          )}

          {tournament.status === "ongoing" && (
            <Button
              fullWidth
              size="lg"
              disabled
              variant="outline"
              className="py-3.5"
            >
              Tournament Live
            </Button>
          )}

          {tournament.status === "ended" && (
            <Button fullWidth size="lg" variant="ghost" className="hover:bg-white/5 text-text-primary/60 hover:text-text-primary py-3.5">
              View Final Standings
            </Button>
          )}
        </div>
      </div>
      <RegisterTournamentModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        tournament={tournament}
        onSuccess={() => {
          showAlert("Registration submitted successfully!", "success");
          if (onSuccess) onSuccess();
          onClose();
        }}
      />
    </Modal>
  );
}
