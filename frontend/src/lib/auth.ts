import type { UserProfile } from "@/types/auth";

const SESSION_USER_KEY = "epix_session_user";
const LEGACY_LOGIN_KEY = "simulated_logged_in";
const LAST_ACTIVITY_KEY = "epix_last_activity";
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function dispatchAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("local-auth-change"));
  }
}

/**
 * The session lives in localStorage so a reload, a new tab or a fresh visit keeps
 * the user signed in. Older builds stored it in sessionStorage, so reads fall back
 * to that and migrate the value forward.
 */
export function getStoredSessionRaw(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_USER_KEY);
  if (stored) return stored;

  const legacy = sessionStorage.getItem(SESSION_USER_KEY);
  if (legacy) {
    localStorage.setItem(SESSION_USER_KEY, legacy);
    if (sessionStorage.getItem(LEGACY_LOGIN_KEY) === "true") {
      localStorage.setItem(LEGACY_LOGIN_KEY, "true");
    }
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(LEGACY_LOGIN_KEY);
    return legacy;
  }
  return null;
}

export function updateActivity(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function checkInactivity(): void {
  if (typeof window === "undefined") return;
  if (!isLoggedIn()) return;

  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (lastActivityStr) {
    const lastActivity = parseInt(lastActivityStr, 10);
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
      logout();
    }
  } else {
    updateActivity();
  }
}

export function setSession(user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  localStorage.setItem(LEGACY_LOGIN_KEY, "true");
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(LEGACY_LOGIN_KEY);
  updateActivity();
  dispatchAuthChange();
}

export function getSessionUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  checkInactivity();
  const raw = getStoredSessionRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn =
    localStorage.getItem(LEGACY_LOGIN_KEY) === "true" ||
    sessionStorage.getItem(LEGACY_LOGIN_KEY) === "true";
  if (!loggedIn) return false;
  return !!getStoredSessionRaw();
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_USER_KEY);
  localStorage.removeItem(LEGACY_LOGIN_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(LEGACY_LOGIN_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  dispatchAuthChange();
}

let isTrackerInitialized = false;

export function initializeActivityTracker(): void {
  if (typeof window === "undefined" || isTrackerInitialized) return;
  isTrackerInitialized = true;

  const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
  
  let throttleTimer: any = null;
  const handleActivity = () => {
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      checkInactivity();
      updateActivity();
    }, 1000);
  };

  events.forEach((evt) => {
    window.addEventListener(evt, handleActivity, { passive: true });
  });

  const interval = setInterval(() => {
    checkInactivity();
  }, 10000);

  if ((window as any).__cleanupTracker) {
    (window as any).__cleanupTracker();
  }
  (window as any).__cleanupTracker = () => {
    events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    clearInterval(interval);
  };
}
