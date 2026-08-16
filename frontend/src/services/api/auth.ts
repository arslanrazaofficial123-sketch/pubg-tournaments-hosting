import type {
  LoginPayload,
  RegisterPayload,
  UserProfile,
} from "@/types/auth";
import { apiClient } from "./client";

export async function registerAccount(
  payload: RegisterPayload,
): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginAccount(
  payload: LoginPayload,
): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function googleSignIn(credential: string): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function linkUidToAccount(uid: string): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/link-uid", {
    method: "POST",
    body: JSON.stringify({ uid }),
  });
}

export async function checkUidAvailable(uid: string): Promise<boolean> {
  const result = await apiClient<{ available: boolean }>(
    `/auth/check-uid/${encodeURIComponent(uid)}`,
  );
  return result.available;
}

export interface PlayerLookupResult {
  found: boolean;
  inGameName: string | null;
}

export async function lookupPlayerByUid(
  uid: string,
): Promise<PlayerLookupResult> {
  return apiClient<PlayerLookupResult>(
    `/auth/lookup-player/${encodeURIComponent(uid)}`,
  );
}

export async function fetchUserByUid(uid: string): Promise<UserProfile | null> {
  try {
    return await apiClient<UserProfile>(`/auth/users/${encodeURIComponent(uid)}`);
  } catch {
    return null;
  }
}

export async function deleteAccount(uid: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(
    `/auth/users/${encodeURIComponent(uid)}`,
    {
      method: "DELETE",
    },
  );
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    return await apiClient<UserProfile[]>("/auth/users");
  } catch {
    return [];
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const result = await apiClient<{ success: boolean; token?: string }>("/auth/verify-admin", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (result.success && result.token) {
      sessionStorage.setItem("admin_token", result.token);
      sessionStorage.setItem("admin_role", "admin");
    }
    return result.success;
  } catch {
    return false;
  }
}

export async function verifyPartnerPassword(password: string): Promise<boolean> {
  try {
    const result = await apiClient<{ success: boolean; token?: string }>("/auth/verify-partner", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (result.success && result.token) {
      sessionStorage.setItem("admin_token", result.token);
      sessionStorage.setItem("admin_role", "partner");
    }
    return result.success;
  } catch {
    return false;
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>("/auth/change-admin-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function changePartnerPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>("/auth/change-partner-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateProfile(payload: {
  inGameName?: string;
  whatsapp?: string;
  bio?: string;
  avatar?: string;
}): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>("/auth/password", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadAvatar(dataUrl: string): Promise<{ avatarUrl: string }> {
  return apiClient<{ avatarUrl: string }>("/auth/avatar", {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
}
