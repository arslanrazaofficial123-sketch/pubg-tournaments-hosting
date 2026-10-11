import crypto from "crypto";
import type { Request, Response } from "express";
import archiver from "archiver";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ProductionTeamModel } from "../models/ProductionTeam.js";
import { ProductionTournamentModel } from "../models/ProductionTournament.js";
import { uploadImage } from "../services/storageService.js";
import { signToken } from "../utils/jwt.js";
import { fetchImageBuffer, sanitizePathSegment } from "../utils/imageFetch.js";

const MAX_PLAYERS = 16;

export const productionLogin = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, message: "Username and password are required" });
    return;
  }
  if (username !== env.productionUsername || password !== env.productionPassword) {
    res.status(401).json({ success: false, message: "Invalid username or password" });
    return;
  }
  const token = signToken({ uid: "production", role: "production" });
  res.json({ success: true, token });
});

export const createProductionTeam = asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, teamName, teamLogo, players } = req.body;

  if (!tournamentId || typeof tournamentId !== "string") {
    res.status(400).json({ message: "Tournament is required" });
    return;
  }
  if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
    res.status(400).json({ message: "Team name is required" });
    return;
  }
  if (!teamLogo || typeof teamLogo !== "string" || !teamLogo.startsWith("data:image/")) {
    res.status(400).json({ message: "Team logo is required" });
    return;
  }
  if (players != null && !Array.isArray(players)) {
    res.status(400).json({ message: "Players must be a list" });
    return;
  }
  const playerList: Array<{ uid?: unknown; photo?: unknown }> = Array.isArray(players) ? players : [];
  if (playerList.length > MAX_PLAYERS) {
    res.status(400).json({ message: `Maximum ${MAX_PLAYERS} players allowed` });
    return;
  }
  for (const p of playerList) {
    const uid = typeof p?.uid === "string" ? p.uid.trim() : "";
    if (!/^\d{1,32}$/.test(uid)) {
      res.status(400).json({ message: "Each player needs a numeric UID (up to 32 digits)" });
      return;
    }
    if (typeof p?.photo !== "string" || !p.photo.startsWith("data:image/")) {
      res.status(400).json({ message: "Each player needs a photo" });
      return;
    }
  }

  const tournament = await ProductionTournamentModel.findOne({ id: tournamentId }).lean();
  if (!tournament) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  const uniqueSuffix = crypto.randomBytes(3).toString("hex");
  const teamLogoUrl = await uploadImage({
    kind: "production-logo",
    teamName: `${teamName.trim()}-${uniqueSuffix}`,
    dataUrl: teamLogo,
  });

  const uploadedPlayers: Array<{ uid: string; photo: string }> = [];
  for (const p of playerList) {
    const uid = (p.uid as string).trim();
    const photoUrl = await uploadImage({
      kind: "production-photo",
      uid: `${uid}-${crypto.randomBytes(3).toString("hex")}`,
      dataUrl: p.photo as string,
    });
    uploadedPlayers.push({ uid, photo: photoUrl });
  }

  const team = await ProductionTeamModel.create({
    id: `pt-${crypto.randomBytes(6).toString("hex")}`,
    tournamentId,
    teamName: teamName.trim(),
    teamLogo: teamLogoUrl,
    players: uploadedPlayers,
  });

  res.status(201).json({
    id: team.id,
    tournamentId: team.tournamentId,
    teamName: team.teamName,
    teamLogo: team.teamLogo,
    players: team.players,
  });
});

export const listProductionTeams = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.id ? String(req.query.id) : "";
  if (!tournamentId) {
    res.status(400).json({ message: "Tournament id is required" });
    return;
  }
  const teams = await ProductionTeamModel.find({ tournamentId })
    .sort({ createdAt: -1 })
    .lean();
  res.json(teams);
});

function csvField(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export const exportProductionRoster = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.id ? String(req.query.id) : "";
  if (!tournamentId) {
    res.status(400).json({ message: "Tournament id is required" });
    return;
  }

  const teams = await ProductionTeamModel.find({ tournamentId }).lean();
  if (teams.length === 0) {
    res.status(404).json({ message: "No teams to export" });
    return;
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="production-${tournamentId}.zip"`,
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

  const csvLines: string[] = ["Team,UID,Photo,Logo"];
  const usedLogoNames = new Set<string>();
  const fetchedPlayerExts = new Map<string, string>();

  for (const team of teams) {
    const logoBase = sanitizePathSegment(team.teamName || "team");
    let logoName = logoBase;
    let n = 2;
    while (usedLogoNames.has(logoName)) {
      logoName = `${logoBase}-${n++}`;
    }
    usedLogoNames.add(logoName);

    let logoExt = ".png";
    if (team.teamLogo) {
      const img = await fetchImageBuffer(team.teamLogo);
      if (img) {
        logoExt = img.ext;
        archive.append(img.buffer, { name: `Teams Logos/${logoName}${img.ext}` });
      }
    }
    const logoPath = `Teams Logos/${logoName}${logoExt}`;

    for (const player of team.players || []) {
      const uid = player.uid || "";
      let playerExt = fetchedPlayerExts.get(uid);
      if (playerExt === undefined) {
        playerExt = ".jpg";
        if (player.photo) {
          const img = await fetchImageBuffer(player.photo);
          if (img) {
            playerExt = img.ext;
            archive.append(img.buffer, { name: `Player Pics/${uid}${img.ext}` });
          }
        }
        fetchedPlayerExts.set(uid, playerExt);
      }
      const playerPath = `Player Pics/${uid}${playerExt}`;
      csvLines.push(
        [csvField(team.teamName || ""), uid, csvField(playerPath), csvField(logoPath)].join(","),
      );
    }
  }

  archive.append(csvLines.join("\n") + "\n", { name: "roster.csv" });
  await archive.finalize();
});

export const createProductionTournament = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ message: "Tournament name is required" });
    return;
  }
  const tournament = await ProductionTournamentModel.create({
    id: `ptn-${crypto.randomBytes(6).toString("hex")}`,
    name: name.trim(),
  });
  res.status(201).json({ id: tournament.id, name: tournament.name });
});

export const listProductionTournaments = asyncHandler(async (_req: Request, res: Response) => {
  const tournaments = await ProductionTournamentModel.find()
    .sort({ createdAt: -1 })
    .lean();
  res.json(
    tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
    })),
  );
});
