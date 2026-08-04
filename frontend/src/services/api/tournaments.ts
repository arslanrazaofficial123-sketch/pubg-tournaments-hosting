import type { Tournament, TournamentStatus } from "@/types/tournament";
import { apiClient } from "./client";

export async function getTournaments(): Promise<Tournament[]> {
  try {
    return await apiClient<Tournament[]>("/tournaments");
  } catch {
    return [];
  }
}

export async function createTournament(
  payload: Omit<Tournament, "id">,
): Promise<Tournament> {
  const id = "t-" + Math.random().toString(36).substring(2, 11);
  return apiClient<Tournament>("/tournaments", {
    method: "POST",
    body: JSON.stringify({ ...payload, id }),
  });
}

export async function deleteTournament(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(`/tournaments/${id}`, {
    method: "DELETE",
  });
}

export async function getTournamentsByStatus(
  status: TournamentStatus,
): Promise<Tournament[]> {
  try {
    return await apiClient<Tournament[]>(`/tournaments?status=${status}`);
  } catch {
    return [];
  }
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  try {
    return await apiClient<Tournament>(`/tournaments/${id}`);
  } catch {
    return null;
  }
}

export async function updateTournament(
  id: string,
  payload: Partial<Tournament>,
): Promise<Tournament> {
  return apiClient<Tournament>(`/tournaments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function registerForTournament(
  tournamentId: string,
  payload: {
    teamName?: string;
    whatsapp: string;
    receiptImage: string;
    transactionId: string;
    members: Array<{ uid: string; inGameName: string }>;
    group?: string;
  },
): Promise<any> {
  return apiClient<any>(`/tournaments/${tournamentId}/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface Registration {
  id: string;
  tournamentId: string;
  teamName?: string;
  group: string;
  whatsapp: string;
  receiptImage: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  members: Array<{ uid: string; inGameName: string }>;
  createdAt: string;
  kills?: number;
  chickenDinner?: number;
  totalPoints?: number;
  rank?: number;
}

export async function updateRegistrationStatus(
  registrationId: string,
  status: "approved" | "rejected" | "pending",
): Promise<Registration> {
  return apiClient<Registration>(`/tournaments/registrations/${registrationId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function eliminateRegistration(
  registrationId: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(`/tournaments/registrations/${registrationId}`, {
    method: "DELETE",
  });
}

export async function fetchAllRegistrations(tournamentId?: string, memberUid?: string): Promise<Registration[]> {
  try {
    const params: string[] = [];
    if (tournamentId) params.push(`tournamentId=${tournamentId}`);
    if (memberUid) params.push(`memberUid=${memberUid}`);
    
    let url = "/tournaments/registrations";
    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }
    return await apiClient<Registration[]>(url);
  } catch {
    return [];
  }
}

export async function updateRegistrationStats(
  registrationId: string,
  stats: {
    kills: number;
    chickenDinner: number;
    totalPoints: number;
    rank: number;
  },
): Promise<Registration> {
  return apiClient<Registration>(`/tournaments/registrations/${registrationId}/stats`, {
    method: "PUT",
    body: JSON.stringify(stats),
  });
}
