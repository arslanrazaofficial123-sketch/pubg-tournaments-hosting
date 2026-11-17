import { apiClient } from "./client";

export interface Match {
  id: string;
  tournamentId: string;
  day: number;
  stage?: number;
  title: string;
  map: "Erangel" | "Miramar" | "Sanhok" | "Vikendi" | "Nusa" | "Karakin" | "Rondo";
  time: string;
  date: string;
  groups: string[];
  roomId?: string;
  roomPassword?: string;
  revealAt?: string;
  autoSend?: boolean;
  locked?: boolean;
  serverNow?: number;
  credentialsSentAt?: string;
  lastSendReport?: { at: string; by: string; total: number; sent: number; failed: number; noNumber: number } | null;
  createdAt: string;
  updatedAt: string;
}

/** How far this device's clock is from the server's, so the reveal countdown is the same for everyone. */
let serverOffsetMs = 0;
export function getServerOffset(): number { return serverOffsetMs; }

export async function fetchMatches(tournamentId?: string, day?: number): Promise<Match[]> {
  try {
    let url = "/matches";
    const params: string[] = [];
    if (tournamentId) params.push(`tournamentId=${tournamentId}`);
    if (day !== undefined) params.push(`day=${day}`);

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    const data = await apiClient<Match[]>(url);
    const sn = data.find((m) => typeof m.serverNow === "number")?.serverNow;
    if (sn) serverOffsetMs = sn - Date.now();
    return data;
  } catch {
    return [];
  }
}

export async function createMatch(payload: {
  tournamentId: string;
  day: number;
  stage?: number;
  title: string;
  map: string;
  time: string;
  date: string;
  groups: string[];
  roomId?: string;
  roomPassword?: string;
  revealAt?: string;
  autoSend?: boolean;
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
    stage: number;
    title: string;
    map: string;
    time: string;
    date: string;
    groups: string[];
    roomId: string;
    roomPassword: string;
    revealAt: string;
    autoSend: boolean;
  }>
): Promise<Match> {
  return apiClient<Match>(`/matches/${matchId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface SendCredentialsResult {
  success: boolean;
  message: string;
  code?: "too-early" | "already-sent" | "no-teams" | "no-credentials" | "not-found" | "no-tournament";
  revealAt?: string;
  sentAt?: string;
  sent: number;
  failed: number;
  noNumber: number;
  total: number;
  waLinks: Array<{ teamName: string; phone: string; link: string }>;
  results?: Array<{ teamName: string; phone: string; slotNumber?: number | null; status: "sent" | "link" | "no-number" }>;
}

/** force: send even before the reveal time. resend: send again after it already went out. */
export async function sendMatchCredentials(
  matchId: string,
  opts: { force?: boolean; resend?: boolean } = {},
): Promise<SendCredentialsResult> {
  return apiClient(`/matches/${matchId}/send-credentials`, {
    method: "POST",
    body: JSON.stringify({ force: !!opts.force, resend: !!opts.resend }),
  });
}
