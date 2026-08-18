import { apiClient } from "./client";

export interface TeamPlayer {
  uid: string;
  inGameName: string;
  picture: string;
}

export interface TeamData {
  teamName: string;
  teamLogo: string;
  format: "solo" | "duo" | "squad";
  players: TeamPlayer[];
}

export async function getTeamData(): Promise<TeamData | null> {
  try {
    return await apiClient<TeamData>("/team-data");
  } catch {
    return null;
  }
}

export async function saveTeamData(data: TeamData): Promise<TeamData | null> {
  try {
    return await apiClient<TeamData>("/team-data", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
}
