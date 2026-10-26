import { ApiError, API_BASE_URL } from "./client";

const TOKEN_KEY = "production_token";

export interface ProductionPlayer {
  uid: string;
  photo: string;
}

export type ProductionTeamSource = "organizer" | "link";

export interface ProductionTeam {
  id: string;
  tournamentId: string;
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
  source: ProductionTeamSource;
  bytes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionTournament {
  id: string;
  name: string;
  slug: string | null;
  acceptingUploads: boolean;
  deadline: string | null;
  isOpen: boolean;
  teamCount: number;
  photoCount: number;
  bytes: number;
  createdAt?: string;
}

export interface TeamPayload {
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
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

async function readError(response: Response): Promise<string> {
  if (response.status === 413) {
    return "Upload is too large. Use smaller images or fewer photos at once.";
  }
  let message = response.statusText || "Request failed";
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    // not JSON
  }
  return message;
}

function handleUnauthorized(): void {
  clearProductionToken();
  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/production") &&
    window.location.pathname !== "/production"
  ) {
    window.location.assign("/production");
  }
}

async function productionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = productionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const message = await readError(response);
    if (response.status === 401) handleUnauthorized();
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameFrom(response: Response, fallback: string): string {
  const cd = response.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="?([^";]+)"?/i);
  return m ? m[1] : fallback;
}

async function downloadAuthed(endpoint: string, fallbackName: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = productionToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
  if (!response.ok) {
    const message = await readError(response);
    if (response.status === 401) handleUnauthorized();
    throw new ApiError(message, response.status);
  }
  saveBlob(await response.blob(), filenameFrom(response, fallbackName));
}

// ── organizer ──

export async function productionLogin(username: string, password: string): Promise<{ token: string }> {
  return productionFetch<{ token: string }>("/production/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function listProductionTournaments(): Promise<ProductionTournament[]> {
  return productionFetch<ProductionTournament[]>("/production/tournaments");
}

export async function getProductionTournament(id: string): Promise<ProductionTournament> {
  return productionFetch<ProductionTournament>(`/production/tournaments/${encodeURIComponent(id)}`);
}

export async function createProductionTournament(name: string): Promise<ProductionTournament> {
  return productionFetch<ProductionTournament>("/production/tournaments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateProductionTournament(
  id: string,
  patch: { name?: string; acceptingUploads?: boolean; deadline?: string | null },
): Promise<ProductionTournament> {
  return productionFetch<ProductionTournament>(`/production/tournaments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteProductionTournament(
  id: string,
): Promise<{ success: boolean; deletedTeams: number }> {
  return productionFetch<{ success: boolean; deletedTeams: number }>(
    `/production/tournaments/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function createProductionTeam(
  payload: TeamPayload & { tournamentId: string },
): Promise<ProductionTeam> {
  return productionFetch<ProductionTeam>("/production/teams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listProductionTeams(tournamentId: string): Promise<ProductionTeam[]> {
  return productionFetch<ProductionTeam[]>(`/production/teams?id=${encodeURIComponent(tournamentId)}`);
}

export async function deleteProductionTeam(teamId: string): Promise<void> {
  await productionFetch<{ success: boolean }>(`/production/teams/${encodeURIComponent(teamId)}`, {
    method: "DELETE",
  });
}

export async function downloadProductionRoster(tournamentId: string): Promise<void> {
  await downloadAuthed(
    `/production/teams/export?id=${encodeURIComponent(tournamentId)}`,
    `production-${tournamentId}.zip`,
  );
}

export async function downloadProductionTeamZip(teamId: string): Promise<void> {
  await downloadAuthed(`/production/teams/${encodeURIComponent(teamId)}/export`, `${teamId}.zip`);
}

/** Saves an image by URL; falls back to opening it in a new tab if the browser blocks the fetch. */
export async function downloadImage(url: string, baseName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("fetch failed");
    const blob = await response.blob();
    const ext =
      blob.type === "image/png" ? ".png"
      : blob.type === "image/webp" ? ".webp"
      : blob.type === "image/gif" ? ".gif"
      : ".jpg";
    saveBlob(blob, `${baseName.replace(/[^a-zA-Z0-9_-]/g, "_") || "image"}${ext}`);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

// ── public share link (no account) ──

export interface PublicTournament {
  name: string;
  isOpen: boolean;
  acceptingUploads: boolean;
  deadline: string | null;
  maxPlayers: number;
}

export interface PublicTeam {
  teamName: string;
  teamLogo: string;
  players: ProductionPlayer[];
  updatedAt?: string;
}

async function publicFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers as Record<string, string>) },
  });
  if (!response.ok) throw new ApiError(await readError(response), response.status);
  return response.json() as Promise<T>;
}

export async function getPublicTournament(slug: string): Promise<PublicTournament> {
  return publicFetch<PublicTournament>(`/production/public/${encodeURIComponent(slug)}`);
}

export async function submitPublicTeam(
  slug: string,
  payload: TeamPayload,
): Promise<{ editToken: string; teamName: string }> {
  return publicFetch(`/production/public/${encodeURIComponent(slug)}/teams`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPublicTeam(
  slug: string,
  token: string,
): Promise<{ tournament: PublicTournament; team: PublicTeam }> {
  return publicFetch(`/production/public/${encodeURIComponent(slug)}/teams/${encodeURIComponent(token)}`);
}

export async function updatePublicTeam(
  slug: string,
  token: string,
  payload: TeamPayload,
): Promise<{ team: PublicTeam }> {
  return publicFetch(`/production/public/${encodeURIComponent(slug)}/teams/${encodeURIComponent(token)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
