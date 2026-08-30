import type { Request, Response } from "express";
import { isValidStatus } from "../data/seedTournaments.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  findAllTournaments,
  findTournamentById,
  findTournamentsByStatus,
  createTournament as createTournamentInDb,
  deleteTournamentById,
  updateTournamentById,
  registerPlayerForTournament,
  getAllRegistrations,
  updateRegistrationStatus,
  deleteRegistrationById,
  updateRegistrationStats,
} from "../services/tournamentService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendRegistrationNotificationEmail, sendTournamentNotificationEmail, type TournamentNotificationData } from "../utils/email.js";
import { UserModel } from "../models/User.js";

// ... [existing functions remain unchanged]

export const getTournaments = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  if (typeof status === "string") {
    if (!isValidStatus(status)) {
      res.status(400).json({ message: "Invalid tournament status" });
      return;
    }

    const tournaments = await findTournamentsByStatus(status);
    res.json(tournaments);
    return;
  }

  const tournaments = await findAllTournaments();
  res.json(tournaments);
});

export const getTournamentById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const tournament = await findTournamentById(id);

  if (!tournament) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  res.json(tournament);
});

export const createTournament = asyncHandler(async (req: Request, res: Response) => {
  const tournament = await createTournamentInDb(req.body);
  res.status(201).json(tournament);
});

export const deleteTournament = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deleted = await deleteTournamentById(id);

  if (!deleted) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  res.json({ success: true, message: "Tournament deleted successfully" });
});

export const updateTournament = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const updated = await updateTournamentById(id, req.body);

  if (!updated) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  res.json(updated);
});

export const registerTournament = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const authReq = req as AuthenticatedRequest;
    const registration = await registerPlayerForTournament(id, {
      ...req.body,
      registrarUid: authReq.user?.uid,
    });

    const tournament = await findTournamentById(id);
    sendRegistrationNotificationEmail({
      tournamentTitle: tournament?.title || id,
      tournamentId: id,
      teamName: registration.teamName || registration.members?.[0]?.inGameName || "Solo",
      teamLogo: registration.teamLogo,
      whatsapp: registration.whatsapp,
      members: registration.members,
      paymentMethod: registration.paymentMethod || "manual",
      transactionId: registration.transactionId,
      registrationFee: tournament?.registrationFee || "Free",
    }).catch(() => {});

    res.status(201).json(registration);
  } catch (err: any) {
    if (err.message === "TOURNAMENT_NOT_FOUND") {
      res.status(404).json({ message: "Tournament not found" });
    } else if (err.message === "TOURNAMENT_FULL") {
      res.status(400).json({ message: "Tournament is full" });
    } else if (err.message === "GROUP_FULL") {
      res.status(400).json({ message: "Selected group is full" });
    } else if (err.message === "INVALID_GROUP") {
      res.status(400).json({ message: "Selected group is invalid" });
    } else if (err.message === "TEAM_NAME_ALREADY_EXISTS") {
      res.status(409).json({ message: "Team name is already registered in this tournament" });
    } else if (err.message === "MEMBER_NOT_FOUND" || err.message === "MEMBER_NAME_MISMATCH") {
      res.status(400).json({ message: err.details || err.message });
    } else if (err.message === "INSUFFICIENT_WALLET_BALANCE") {
      res.status(400).json({ message: "Insufficient wallet balance. Please top up your wallet or use manual payment." });
    } else {
      res.status(500).json({ message: err.message || "Registration failed" });
    }
  }
});

export const getRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId ? String(req.query.tournamentId) : undefined;
  const memberUid = req.query.memberUid ? String(req.query.memberUid) : undefined;
  const regs = await getAllRegistrations(tournamentId, memberUid);
  res.json(regs);
});

export const updateRegStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status } = req.body;

  if (status !== "approved" && status !== "rejected" && status !== "pending") {
    res.status(400).json({ message: "Invalid status value" });
    return;
  }

  try {
    const updated = await updateRegistrationStatus(id, status);
    res.json(updated);
  } catch (err: any) {
    if (err.message === "REGISTRATION_NOT_FOUND") {
      res.status(404).json({ message: "Registration not found" });
    } else {
      res.status(500).json({ message: err.message || "Failed to update registration status" });
    }
  }
});

export const deleteRegistration = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deleted = await deleteRegistrationById(id);
  if (!deleted) {
    res.status(404).json({ message: "Registration not found" });
    return;
  }
  res.json({ success: true, message: "Registration deleted successfully" });
});

export const updateRegStats = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { kills, chickenDinner, totalPoints, rank } = req.body;

  try {
    const updated = await updateRegistrationStats(id, {
      kills: Number(kills ?? 0),
      chickenDinner: Number(chickenDinner ?? 0),
      totalPoints: Number(totalPoints ?? 0),
      rank: Number(rank ?? 0),
    });
    res.json(updated);
  } catch (err: any) {
    if (err.message === "REGISTRATION_NOT_FOUND") {
      res.status(404).json({ message: "Registration not found" });
    } else {
      res.status(500).json({ message: err.message || "Failed to update registration stats" });
    }
  }
});

export const updateRegSlot = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { slotNumber } = req.body;

  const { RegistrationModel } = await import("../models/Registration.js");
  const doc = await RegistrationModel.findOneAndUpdate(
    { id },
    { $set: { slotNumber: slotNumber === null || slotNumber === undefined ? null : Number(slotNumber) } },
    { new: true },
  );
  if (!doc) {
    res.status(404).json({ message: "Registration not found" });
    return;
  }
  res.json(doc.toObject());
});

export const notifyTournament = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const tournament = await findTournamentById(id);

  if (!tournament) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  const users = await UserModel.find({ email: { $exists: true, $ne: "" } }).select("email inGameName").lean();

  if (users.length === 0) {
    res.json({ success: true, message: "No users with email addresses found.", sent: 0, failed: 0 });
    return;
  }

  const tournamentData: TournamentNotificationData = {
    title: tournament.title,
    tournamentId: tournament.tournamentId,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationFee: tournament.registrationFee,
    prizePool: tournament.prizePool,
    format: tournament.format,
    region: tournament.region,
    registrationDeadline: tournament.registrationDeadline,
    bannerUrl: tournament.images?.card,
  };

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.email) continue;
    try {
      const ok = await sendTournamentNotificationEmail(user.email, tournamentData);
      if (ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  res.json({
    success: true,
    message: `Notifications sent. ${sent} delivered, ${failed} failed.`,
    sent,
    failed,
    total: users.length,
  });
});

