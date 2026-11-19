"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { Tournament } from "@/types/tournament";
import { CarouselControls, SectionHeader } from "@/components/ui";
import { TOURNAMENT_CARD } from "@/lib/constants";
import { Gamepad2 } from "lucide-react";
import { TournamentCard } from "./TournamentCard";

interface TournamentCarouselProps {
  title: string;
  subtitle: string;
  tournaments: Tournament[];
  sectionId: string;
  onSelectTournament: (tournament: Tournament) => void;
}

export function TournamentCarousel({
  title,
  subtitle,
  tournaments,
  sectionId,
  onSelectTournament,
}: TournamentCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (tournaments.length === 0) {
    return (
      <section id={sectionId} className="scroll-mt-24">
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-[#223158] bg-[#0d1426]/60 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(300px_160px_at_50%_-20%,rgba(59,130,246,.12),transparent_65%)]" />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#f2b84b]/30 bg-[#f2b84b]/10 text-[#f2b84b]">
            <Gamepad2 size={28} />
          </div>
          <p className="text-lg font-bold text-text-primary/70">
            No tournaments in this category right now.
          </p>
          <p className="mt-1 max-w-xs text-xs text-text-primary/40">
            New events open every week — check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} className="scroll-mt-24">
      <div className="mb-6 flex items-end justify-between gap-4">
        <SectionHeader title={title} subtitle={subtitle} />
        <CarouselControls
          onPrev={scrollPrev}
          onNext={scrollNext}
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
        />
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-xl" ref={emblaRef}>
          <div className="flex gap-4 py-2">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="shrink-0"
                style={{ width: TOURNAMENT_CARD.width }}
              >
                <TournamentCard
                  tournament={tournament}
                  onClick={() => onSelectTournament(tournament)}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-linear-to-r from-[#070b16] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-linear-to-l from-[#070b16] to-transparent" />
      </div>
    </section>
  );
}
