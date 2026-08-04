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

export function updateActivity(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function checkInactivity(): void {
  if (typeof window === "undefined") return;
  if (!isLoggedIn()) return;

  const lastActivityStr = sessionStorage.getItem(LAST_ACTIVITY_KEY);
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
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(LEGACY_LOGIN_KEY, "true");
  updateActivity();
  dispatchAuthChange();
}

export function getSessionUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  checkInactivity();
  const raw = sessionStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  const loggedIn = sessionStorage.getItem(LEGACY_LOGIN_KEY) === "true";
  if (!loggedIn) return false;
  const raw = sessionStorage.getItem(SESSION_USER_KEY);
  return !!raw;
}

export function logout(): void {
  if (typeof window === "undefined") return;
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
