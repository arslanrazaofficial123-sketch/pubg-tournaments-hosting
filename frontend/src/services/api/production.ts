import { ApiError, API_BASE_URL } from "./client";

const TOKEN_KEY = "production_token";

export interface ProductionPlayer {
  uid: string;
  photo: string;
}

export interface ProductionTeam {
  id: string;
  tournamentId: string;
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
  createdAt?: string;
}

export function productionToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setProductionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearProductionToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function productionFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = productionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // not JSON
    }
    if (response.status === 401) {
      clearProductionToken();
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/production") &&
        window.location.pathname !== "/production"
      ) {
        window.location.assign("/production");
      }
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export async function productionLogin(
  username: string,
  password: string,
): Promise<{ token: string }> {
  return productionFetch<{ token: string }>("/production/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function createProductionTeam(payload: {
  tournamentId: string;
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
}): Promise<ProductionTeam> {
  return productionFetch<ProductionTeam>("/production/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listProductionTeams(
  tournamentId: string,
): Promise<ProductionTeam[]> {
  return productionFetch<ProductionTeam[]>(
    `/production/teams?id=${encodeURIComponent(tournamentId)}`,
  );
}

export async function downloadProductionRoster(tournamentId: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = productionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(
    `${API_BASE_URL}/production/teams/export?id=${encodeURIComponent(tournamentId)}`,
    { headers },
  );
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // not JSON
    }
    if (response.status === 401) clearProductionToken();
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `production-${tournamentId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface ProductionTournament {
  id: string;
  name: string;
  createdAt?: string;
}

export async function listProductionTournaments(): Promise<ProductionTournament[]> {
  return productionFetch<ProductionTournament[]>("/production/tournaments");
}

export async function createProductionTournament(name: string): Promise<ProductionTournament> {
  return productionFetch<ProductionTournament>("/production/tournaments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
