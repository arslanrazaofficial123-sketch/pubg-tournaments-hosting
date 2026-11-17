import { apiClient } from "./client";

export interface ShowcaseItem {
  id: string;
  tournamentName: string;
  winnerTeam: string;
  dateLabel: string;
  organizer: string;
  championUrl: string;
  rankingsUrl: string;
  youtubeUrl: string;
  order: number;
  active: boolean;
}

export async function fetchShowcase(all = false): Promise<ShowcaseItem[]> {
  try {
    return await apiClient<ShowcaseItem[]>(`/showcase${all ? "?all=1" : ""}`);
  } catch {
    return [];
  }
}

type Draft = Partial<Omit<ShowcaseItem, "id" | "championUrl" | "rankingsUrl">> & { champion?: string; rankings?: string };

export const createShowcase = (p: Draft) =>
  apiClient<ShowcaseItem>("/showcase", { method: "POST", body: JSON.stringify(p) });

export const updateShowcase = (id: string, p: Draft) =>
  apiClient<ShowcaseItem>(`/showcase/${id}`, { method: "PUT", body: JSON.stringify(p) });

export const deleteShowcase = (id: string) =>
  apiClient<{ ok: boolean }>(`/showcase/${id}`, { method: "DELETE" });
