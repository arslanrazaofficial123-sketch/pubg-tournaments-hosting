import { isRevealed } from "../services/matchCredentialsService.js";

type M = { roomId?: string; roomPassword?: string; revealAt?: string; [k: string]: unknown };

/**
 * Public/player view of a match: until its reveal time the room ID and password are removed
 * from the response itself (not just hidden on screen), so nobody can read them early.
 * Staff (admin/partner) always get the full match.
 */
export function maskMatch<T extends M>(m: T, staff: boolean, now: number = Date.now()): T & { locked: boolean; serverNow: number } {
  const locked = !staff && !!m.revealAt && !isRevealed(m.revealAt, now);
  if (!locked) return { ...m, locked: false, serverNow: now };
  return { ...m, roomId: "", roomPassword: "", locked: true, serverNow: now };
}
