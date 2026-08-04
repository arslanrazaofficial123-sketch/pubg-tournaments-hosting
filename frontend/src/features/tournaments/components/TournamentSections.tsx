"use client";

import { useEffect, useState } from "react";
import type { Tournament } from "@/types/tournament";
import { getTournamentsByStatus } from "@/services/api/tournaments";
import { TournamentCarousel } from "./TournamentCarousel";
import { TournamentModal } from "./TournamentModal";

interface TournamentSectionsProps {
  activeSize: string | null;
}

export function TournamentSections({ activeSize }: TournamentSectionsProps) {
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tournaments, setTournaments] = useState<{
    registration_open: Tournament[];
    upcoming: Tournament[];
    ongoing: Tournament[];
    ended: Tournament[];
  }>({ registration_open: [], upcoming: [], ongoing: [], ended: [] });

  useEffect(() => {
    async function loadTournaments() {
      const [registration_open, upcoming, ongoing, ended] = await Promise.all([
        getTournamentsByStatus("registration_open"),
        getTournamentsByStatus("upcoming"),
        getTournamentsByStatus("ongoing"),
        getTournamentsByStatus("ended"),
      ]);
      setTournaments({ registration_open, upcoming, ongoing, ended });
    }

    loadTournaments();
  }, []);

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTournament(null);
  };

  const filterByFormat = (list: Tournament[]) => {
    if (!activeSize) return list;
    return list.filter((t) => {
      const fmt = t.format.toLowerCase();
      if (activeSize === "1v1") return fmt === "solo";
      if (activeSize === "2v2") return fmt === "duo";
      if (activeSize === "4v4") return fmt === "squad";
      return true;
    });
  };

  const sections = [
    {
      id: "registration-open",
      title: "Registration Open",
      subtitle: "Tournaments accepting player registrations now",
      data: filterByFormat(tournaments.registration_open),
    },
    {
      id: "ongoing",
      title: "Ongoing",
      subtitle: "Live brackets and matches happening now",
      data: filterByFormat(tournaments.ongoing),
    },
    {
      id: "upcoming",
      title: "Upcoming",
      subtitle: "Upcoming battles and scrims coming soon",
      data: filterByFormat(tournaments.upcoming),
    },
    {
      id: "ended",
      title: "Ended",
      subtitle: "Past events, results, and highlights",
      data: filterByFormat(tournaments.ended),
    },
  ];

  const handleSuccessRegistration = async () => {
    const [registration_open, upcoming, ongoing, ended] = await Promise.all([
      getTournamentsByStatus("registration_open"),
      getTournamentsByStatus("upcoming"),
      getTournamentsByStatus("ongoing"),
      getTournamentsByStatus("ended"),
    ]);
    setTournaments({ registration_open, upcoming, ongoing, ended });
  };

  return (
    <>
      <div className="space-y-16">
        {sections.map((section) => (
          <TournamentCarousel
            key={section.id}
            sectionId={section.id}
            title={section.title}
            subtitle={section.subtitle}
            tournaments={section.data}
            onSelectTournament={handleSelectTournament}
          />
        ))}
      </div>

      <TournamentModal
        tournament={selectedTournament}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccessRegistration}
      />
    </>
  );
}
