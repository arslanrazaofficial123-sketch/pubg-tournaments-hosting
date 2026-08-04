"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { Tournament } from "@/types/tournament";
import { CarouselControls, SectionHeader } from "@/components/ui";
import { TOURNAMENT_CARD } from "@/lib/constants";
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
            No tournaments in this category right now.
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

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
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
    </section>
  );
}
