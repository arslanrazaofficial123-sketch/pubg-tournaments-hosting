import type { Request, Response } from "express";
import archiver from "archiver";
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
  updateRegistrationSlot,
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

  try {
    const updated = await updateRegistrationSlot(id, slotNumber);
    res.json(updated);
  } catch (err: any) {
    if (err.message === "REGISTRATION_NOT_FOUND") {
      res.status(404).json({ message: "Registration not found" });
    } else {
      res.status(500).json({ message: err.message || "Failed to update slot" });
    }
  }
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

function sanitizePathSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "team";
}

function extFromUrlOrType(url: string, contentType: string | null): string {
  const fromCt = (contentType || "").split(";")[0].trim();
  const ctMap: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };
  if (fromCt && ctMap[fromCt]) return ctMap[fromCt];
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.(png|jpe?g|webp|gif|svg)$/i);
    if (m) return m[1].toLowerCase() === "jpeg" ? ".jpg" : m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return ".png";
}

async function fetchImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, ext: extFromUrlOrType(url, res.headers.get("content-type")) };
  } catch {
    return null;
  }
}

export const exportRegistrations = asyncHandler(
  async (req: Request, res: Response) => {
    const tournamentId = req.query.tournamentId
      ? String(req.query.tournamentId)
      : undefined;
    const regs = await getAllRegistrations(tournamentId);

    const filename = tournamentId
      ? `registrations-${tournamentId}.zip`
      : "registrations-export.zip";

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({ message: err.message });
      } else {
        res.destroy(err);
      }
    });
    archive.pipe(res);

    const jsonEntries: any[] = [];
    const usedFolders = new Set<string>();

    for (const reg of regs) {
      const hasTeamName = Boolean(reg.teamName && sanitizePathSegment(reg.teamName) !== "team");
      const baseTeam = hasTeamName
        ? sanitizePathSegment(reg.teamName)
        : `team-${sanitizePathSegment(reg.id || "unknown")}`;
      let folder = baseTeam;
      let n = 2;
      while (usedFolders.has(folder)) {
        folder = `${baseTeam}-${n++}`;
      }
      usedFolders.add(folder);

      const entry: any = {
        teamName: reg.teamName || "",
        teamLogo: reg.teamLogo || "",
        group: reg.group || "",
        status: reg.status || "",
        whatsapp: reg.whatsapp || "",
        tournamentId: reg.tournamentId || "",
        members: [],
      };

      if (reg.teamLogo) {
        const img = await fetchImageBuffer(reg.teamLogo);
        if (img) {
          const zipPath = `registrations-export/${folder}/team-logo${img.ext}`;
          archive.append(img.buffer, { name: zipPath });
          entry.teamLogoFile = `${folder}/team-logo${img.ext}`;
        }
      }

      for (const m of reg.members || []) {
        const member: any = {
          uid: m.uid || "",
          inGameName: m.inGameName || "",
          picture: m.picture || "",
        };
        if (m.picture) {
          const img = await fetchImageBuffer(m.picture);
          if (img) {
            const safeName = sanitizePathSegment(m.inGameName || "player");
            const safeUid = sanitizePathSegment(m.uid || "uid");
            const zipPath = `registrations-export/${folder}/${safeUid}-${safeName}${img.ext}`;
            archive.append(img.buffer, { name: zipPath });
            member.pictureFile = `${folder}/${safeUid}-${safeName}${img.ext}`;
          }
        }
        entry.members.push(member);
      }

      jsonEntries.push(entry);
    }

    archive.append(JSON.stringify(jsonEntries, null, 2), {
      name: "registrations-export/registrations.json",
    });
    await archive.finalize();
  },
);

