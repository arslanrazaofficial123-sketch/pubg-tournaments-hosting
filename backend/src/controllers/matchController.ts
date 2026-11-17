import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createMatch,
  getMatches,
  deleteMatchById,
  updateMatchById,
} from "../services/matchService.js";
import { verifyToken } from "../utils/jwt.js";
import { maskMatch } from "../utils/revealMask.js";
import { deliverMatchCredentials } from "../services/matchCredentialsService.js";

export const getMatchesList = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId as string;
  const dayStr = req.query.day as string;
  const day = dayStr ? parseInt(dayStr, 10) : undefined;

  const matches = await getMatches(tournamentId, day);

  /* staff see everything; players get the room ID/password only once the reveal time has passed */
  let staff = false;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const decoded = verifyToken(auth.split(" ")[1]);
    staff = decoded?.role === "admin" || decoded?.role === "partner";
  }
  const now = Date.now();
  res.json(matches.map((m) => maskMatch(m as never, staff, now)));
});


/** Room ID + password saved with no reveal time set: send to every team right away (in the background). */
function sendNowIfReady(m: { id?: string; roomId?: string; roomPassword?: string; revealAt?: string; autoSend?: boolean; credentialsSentAt?: string } | null) {
  if (!m?.id || !m.roomId || !m.roomPassword || m.revealAt || m.autoSend === false || m.credentialsSentAt) return;
  deliverMatchCredentials(m.id, { by: "auto-on-upload" })
    .then((o) => console.log(`[match-credentials] on-upload ${m.id}: ${o.message}`))
    .catch((e) => console.error("[match-credentials] on-upload failed:", e));
}

export const createNewMatch = asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, day, stage, title, map, time, date, groups, roomId, roomPassword, revealAt } = req.body;

  if (!tournamentId || day === undefined || !title || !map || !time || !date) {
    res.status(400).json({ message: "tournamentId, day, title, map, time, and date are required fields" });
    return;
  }

  const match = await createMatch({
    tournamentId,
    day: parseInt(day, 10),
    stage: Math.max(1, parseInt(stage, 10) || 1),
    title,
    map,
    time,
    date,
    groups: Array.isArray(groups) ? groups : [],
    roomId,
    roomPassword,
    revealAt: revealAt || "",
  });

  sendNowIfReady(match as never);
  res.status(201).json(match);
});

export const deleteMatch = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const deleted = await deleteMatchById(id);
  if (!deleted) {
    res.status(404).json({ message: "Match not found" });
    return;
  }
  res.json({ success: true, message: "Match deleted successfully" });
});

export const updateExistingMatch = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const match = await updateMatchById(id, req.body);
  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }
  sendNowIfReady(match as never);
  res.json(match);
});

export const sendMatchCredentials = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const force = req.body?.force === true || req.query.force === "1";
  const resend = req.body?.resend === true || req.query.resend === "1";

  const out = await deliverMatchCredentials(id, { force, resend, by: "admin" });

  if (!out.ok) {
    const status =
      out.code === "not-found" || out.code === "no-tournament" ? 404
      : out.code === "too-early" || out.code === "already-sent" ? 409
      : out.code === "no-teams" ? 200
      : 400;
    res.status(status).json({ success: false, ...out });
    return;
  }

  res.json({ success: true, ...out, ...out.result });
});
