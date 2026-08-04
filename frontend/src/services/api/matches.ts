import { apiClient } from "./client";

export interface Match {
  id: string;
  tournamentId: string;
  day: number;
  title: string;
  map: "Erangel" | "Miramar" | "Sanhok" | "Vikendi" | "Nusa" | "Karakin" | "Rondo";
  time: string;
  date: string;
  groups: string[];
  roomId?: string;
  roomPassword?: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchMatches(tournamentId?: string, day?: number): Promise<Match[]> {
  try {
    let url = "/matches";
    const params: string[] = [];
    if (tournamentId) params.push(`tournamentId=${tournamentId}`);
    if (day !== undefined) params.push(`day=${day}`);

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    return await apiClient<Match[]>(url);
  } catch {
    return [];
  }
}

export async function createMatch(payload: {
  tournamentId: string;
  day: number;
  title: string;
  map: string;
  time: string;
  date: string;
  groups: string[];
  roomId?: string;
  roomPassword?: string;
}): Promise<Match> {
  return apiClient<Match>("/matches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteMatch(matchId: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(`/matches/${matchId}`, {
    method: "DELETE",
  });
}

export async function updateMatch(
  matchId: string,
  payload: Partial<{
    title: string;
    map: string;
    time: string;
    date: string;
    groups: string[];
    roomId?: string;
    roomPassword?: string;
  }>
): Promise<Match> {
  return apiClient<Match>(`/matches/${matchId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
