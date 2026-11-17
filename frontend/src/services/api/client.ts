const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:5000/api`;
  }
  return "http://localhost:5000/api";
};

export const API_BASE_URL = getApiBaseUrl();

let apiWarmedUp = false;

/**
 * The backend runs as a serverless function, so the first request after idle can
 * take several seconds while the function boots and Mongo connects. Pinging the
 * health route ahead of time (on page load, or when the user heads for /login)
 * makes the actual sign-in request land on a warm instance.
 */
export function warmUpApi() {
  if (apiWarmedUp || typeof window === "undefined") return;
  apiWarmedUp = true;
  fetch(`${API_BASE_URL}/health`, { cache: "no-store" }).catch(() => {});
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (typeof window !== "undefined") {
    const adminToken = sessionStorage.getItem("admin_token");
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    } else {
      const session = sessionStorage.getItem("epix_session_user");
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.token) {
            headers["Authorization"] = `Bearer ${parsed.token}`;
          }
        } catch {}
      }
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Response body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
