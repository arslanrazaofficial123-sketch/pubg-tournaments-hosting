import type { TournamentStatus } from "../types/tournament.js";

export const seedTournaments: any[] = [];

export function isValidStatus(status: string): status is TournamentStatus {
  return ["registration_open", "upcoming", "ongoing", "ended"].includes(status as any);
}

