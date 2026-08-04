export type TournamentStatus = "registration_open" | "upcoming" | "ongoing" | "ended";

export interface TournamentImages {
  card: string;
  modal: string;
}

export interface Tournament {
  id: string;
  title: string;
  status: TournamentStatus;
  description: string;
  prizePool: string;
  format: string;
  startDate: string;
  endDate: string;
  region: string;
  maxTeams: number;
  registeredTeams: number;
  registrationDeadline: string;
  registrationFee: string;
  numDays: number;
  numGroups: number;
  teamsPerGroup: number;
  tournamentId: string;
  images: TournamentImages;
}
