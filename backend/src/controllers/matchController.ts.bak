import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createMatch,
  getMatches,
  deleteMatchById,
  updateMatchById,
} from "../services/matchService.js";
import { sendMatchCredentialsWhatsApp } from "../utils/whatsapp.js";
import { TournamentModel } from "../models/Tournament.js";
import { RegistrationModel } from "../models/Registration.js";

export const getMatchesList = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId as string;
  const dayStr = req.query.day as string;
  const day = dayStr ? parseInt(dayStr, 10) : undefined;

  const matches = await getMatches(tournamentId, day);
  res.json(matches);
});

export const createNewMatch = asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, day, title, map, time, date, groups, roomId, roomPassword, revealAt } = req.body;

  if (!tournamentId || day === undefined || !title || !map || !time || !date) {
    res.status(400).json({ message: "tournamentId, day, title, map, time, and date are required fields" });
    return;
  }

  const match = await createMatch({
    tournamentId,
    day: parseInt(day, 10),
    title,
    map,
    time,
    date,
    groups: Array.isArray(groups) ? groups : [],
    roomId,
    roomPassword,
    revealAt: revealAt || "",
  });

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
  res.json(match);
});

export const sendMatchCredentials = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { getMatches: getMatchesFn } = await import("../services/matchService.js");
  const matches = await getMatchesFn(undefined, undefined);
  const match = matches.find((m) => m.id === id);

  if (!match) {
    res.status(404).json({ message: "Match not found" });
    return;
  }

  if (!match.roomId || !match.roomPassword) {
    res.status(400).json({ message: "Room ID and Password must be set before sending credentials." });
    return;
  }

  const tournament = await TournamentModel.findOne({ id: match.tournamentId }).lean();
  if (!tournament) {
    res.status(404).json({ message: "Tournament not found." });
    return;
  }

  const query: Record<string, any> = {
    tournamentId: match.tournamentId,
    status: "approved",
  };

  if (match.groups && match.groups.length > 0) {
    query.group = { $in: match.groups };
  }

  const registrations = await RegistrationModel.find(query).lean();

  if (registrations.length === 0) {
    res.json({ success: true, message: "No approved registrations found for this match's groups.", sent: 0, failed: 0, total: 0 });
    return;
  }

  const payloads = registrations.map((reg) => ({
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
  }));

  const result = await sendMatchCredentialsWhatsApp(payloads);

  res.json({
    success: true,
    message: `WhatsApp credentials sent. ${result.sent} delivered, ${result.failed} failed.`,
    ...result,
  });
});
