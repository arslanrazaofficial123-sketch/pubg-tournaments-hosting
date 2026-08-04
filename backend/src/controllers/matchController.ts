import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createMatch,
  getMatches,
  deleteMatchById,
  updateMatchById,
} from "../services/matchService.js";

export const getMatchesList = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId as string;
  const dayStr = req.query.day as string;
  const day = dayStr ? parseInt(dayStr, 10) : undefined;

  const matches = await getMatches(tournamentId, day);
  res.json(matches);
});

export const createNewMatch = asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, day, title, map, time, date, groups, roomId, roomPassword } = req.body;

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
