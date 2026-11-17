import { MatchModel } from "../models/Match.js";
import { TournamentModel } from "../models/Tournament.js";
import { RegistrationModel } from "../models/Registration.js";
import { env } from "../config/env.js";
import { sendMatchCredentialsWhatsApp, type SendResult } from "../utils/whatsapp.js";

export interface DeliverOutcome {
  ok: boolean;
  code?: "not-found" | "no-credentials" | "too-early" | "already-sent" | "no-teams" | "no-tournament";
  message: string;
  revealAt?: string;
  sentAt?: string;
  result?: SendResult;
}

/** Reveal time has passed (or there is none set). */
export function isRevealed(revealAt?: string | null, at: number = Date.now()): boolean {
  if (!revealAt) return true;
  const t = new Date(revealAt).getTime();
  if (Number.isNaN(t)) return true;      // an unreadable value never blocks a send
  return t <= at;
}

/**
 * Sends one match's room ID and password to every approved team in its groups.
 * Used by the admin button and by the scheduler that fires at reveal time.
 */
export async function deliverMatchCredentials(
  matchId: string,
  opts: { force?: boolean; by?: string; resend?: boolean } = {},
): Promise<DeliverOutcome> {
  const match = await MatchModel.findOne({ id: matchId });
  if (!match) return { ok: false, code: "not-found", message: "Match not found" };

  if (!match.roomId || !match.roomPassword) {
    return { ok: false, code: "no-credentials", message: "Room ID and Password must be set before sending credentials." };
  }

  if (!opts.force && !isRevealed(match.revealAt)) {
    const when = new Date(match.revealAt).toLocaleString("en-PK", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi",
    });
    return {
      ok: false,
      code: "too-early",
      revealAt: match.revealAt,
      message: `The ID and password are locked until ${when} PKT. Send anyway to override.`,
    };
  }

  if (match.credentialsSentAt && !opts.resend && !opts.force) {
    return {
      ok: false,
      code: "already-sent",
      sentAt: match.credentialsSentAt,
      message: "These credentials have already been sent. Use Resend to send them again.",
    };
  }

  const tournament = await TournamentModel.findOne({ id: match.tournamentId }).lean();
  if (!tournament) return { ok: false, code: "no-tournament", message: "Tournament not found." };

  /* only teams that are in this match's stage (and in its groups) get the ID and password */
  const stage = Number(match.stage) || 1;
  const query: Record<string, any> = { tournamentId: match.tournamentId, status: "approved" };
  if (stage === 1) query.$or = [{ stage: 1 }, { stage: { $exists: false } }, { stage: null }];
  else query.stage = stage;
  if (match.groups && match.groups.length > 0) query.group = { $in: match.groups };

  const registrations = await RegistrationModel.find(query).lean();
  if (registrations.length === 0) {
    return { ok: false, code: "no-teams", message: "No approved registrations found for this match's groups." };
  }

  const result = await sendMatchCredentialsWhatsApp(
    registrations.map((reg) => ({
      teamName: reg.teamName || reg.members?.[0]?.inGameName || "Solo Player",
      whatsappNumber: reg.whatsapp,
      tournamentTitle: tournament.title,
      matchTitle: match.title,
      map: match.map,
      roomId: match.roomId,
      roomPassword: match.roomPassword,
      matchTime: match.time,
      matchDate: match.date,
      slotNumber: reg.slotNumber ?? null,
      group: reg.group,
      matchId: match.id,
    })),
  );

  const at = new Date().toISOString();
  match.credentialsSentAt = at;
  match.lastSendReport = {
    at,
    by: opts.by || "admin",
    total: result.total,
    sent: result.sent,
    failed: result.failed,
    noNumber: result.noNumber,
  };
  await match.save();

  return {
    ok: true,
    message: `WhatsApp credentials sent. ${result.sent} ${env.waGatewaySecret ? "queued for WhatsApp" : "delivered"}, ${result.failed} need a manual link, ${result.noNumber} have no number.`,
    sentAt: at,
    result,
  };
}

/**
 * Checks every 30 seconds for matches whose reveal time has just passed and sends their
 * credentials by itself, so a team gets the room exactly at the time the admin set.
 */
let timer: NodeJS.Timeout | null = null;
let running = false;
const armed = new Set<string>();
export function startMatchCredentialsScheduler() {
  if (timer) return;
  const tick = async () => {
    if (running) return;           // never overlap two checks
    running = true;
    try {
      const due = await MatchModel.find({
        autoSend: { $ne: false },
        revealAt: { $nin: ["", null] },
        $or: [{ credentialsSentAt: "" }, { credentialsSentAt: null }, { credentialsSentAt: { $exists: false } }],
      }).lean();

      await Promise.all(due.map(async (m) => {
        if (!m.roomId || !m.roomPassword) return;
        if (!isRevealed(m.revealAt)) {
          /* reveal is less than ~1.5s away: arm an exact timer so the send fires on the dot */
          const wait = new Date(m.revealAt).getTime() - Date.now();
          if (wait > 0 && wait <= 1_500 && !armed.has(m.id)) {
            armed.add(m.id);
            setTimeout(() => {
              deliverMatchCredentials(m.id, { by: "auto" })
                .then((out) => console.log(`[match-credentials] auto-send ${m.id}: ${out.message}`))
                .catch((e) => console.error("[match-credentials] timed send failed:", e))
                .finally(() => armed.delete(m.id));
            }, wait);
          }
          return;
        }
        if (armed.has(m.id)) return;
        const out = await deliverMatchCredentials(m.id, { by: "auto" });
        console.log(`[match-credentials] auto-send ${m.id}: ${out.message}`);
      }));
    } catch (err) {
      console.error("[match-credentials] scheduler error:", err);
    } finally {
      running = false;
    }
  };
  /* checks every second, so messages go out within about a second of the reveal time */
  timer = setInterval(tick, 1_000);
  setTimeout(tick, 2_000);
  console.log("[match-credentials] auto-send scheduler started (checks every 1s)");
}
