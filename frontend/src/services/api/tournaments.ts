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
    teamLogo?: string;
    whatsapp: string;
    receiptImage?: string;
    transactionId?: string;
    paymentMethod?: "manual" | "wallet";
    members: Array<{ uid: string; inGameName: string; picture?: string }>;
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
  teamLogo?: string;
  group: string;
  whatsapp: string;
  receiptImage: string;
  transactionId: string;
  status: "pending" | "approved" | "rejected";
  members: Array<{ uid: string; inGameName: string; picture?: string }>;
  createdAt: string;
  kills?: number;
  chickenDinner?: number;
  totalPoints?: number;
  rank?: number;
  slotNumber?: number | null;
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

export async function sendTournamentNotifications(
  tournamentId: string,
): Promise<{ success: boolean; message: string; sent: number; failed: number; total: number }> {
  return apiClient(`/tournaments/${tournamentId}/notify`, {
    method: "POST",
  });
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

export async function updateRegistrationSlot(
  registrationId: string,
  slotNumber: number | null,
): Promise<Registration> {
  return apiClient<Registration>(`/tournaments/registrations/${registrationId}/slot`, {
    method: "PUT",
    body: JSON.stringify({ slotNumber }),
  });
}

export async function exportRegistrations(tournamentId?: string): Promise<Blob> {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined"
      ? `http://${window.location.hostname}:5000/api`
      : "http://localhost:5000/api");

  const qs = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : "";
  const headers: Record<string, string> = {};

  if (typeof window !== "undefined") {
    const adminToken = sessionStorage.getItem("admin_token");
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    } else {
      const session = sessionStorage.getItem("epix_session_user");
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.token) headers["Authorization"] = `Bearer ${parsed.token}`;
        } catch {}
      }
    }
  }

  const response = await fetch(`${base}/tournaments/registrations/export${qs}`, {
    headers,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* not JSON */
    }
    throw new Error(message || "Export failed");
  }

  return response.blob();
}
