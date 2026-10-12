import crypto from "crypto";
import type { Request, Response } from "express";
import archiver from "archiver";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ProductionTeamModel } from "../models/ProductionTeam.js";
import { ProductionTournamentModel } from "../models/ProductionTournament.js";
import { deleteImageByUrl, uploadImageWithMeta } from "../services/storageService.js";
import { signToken } from "../utils/jwt.js";
import { fetchImageBuffer, sanitizePathSegment } from "../utils/imageFetch.js";

const MAX_PLAYERS = 16;
// A base64 data URL of ~8M chars is ~6MB of image data.
const MAX_DATA_URL_CHARS = 8 * 1024 * 1024;

type TeamSource = "organizer" | "link";

interface PlayerDoc {
  uid: string;
  photo: string;
  bytes?: number;
}

interface TeamDoc {
  id: string;
  tournamentId: string;
  teamName: string;
  teamLogo: string;
  logoBytes?: number;
  players?: PlayerDoc[];
  source?: TeamSource;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TournamentDoc {
  id: string;
  name: string;
  slug?: string | null;
  acceptingUploads?: boolean;
  deadline?: Date | null;
  createdAt?: Date;
}

// ───────────────────────── helpers ─────────────────────────

function newSlug(): string {
  return crypto.randomBytes(8).toString("base64url").slice(0, 11);
}

function newEditToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDataImage(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:image/") && v.length <= MAX_DATA_URL_CHARS;
}

function isOpen(t: TournamentDoc): boolean {
  if (t.acceptingUploads === false) return false;
  if (t.deadline && new Date(t.deadline).getTime() <= Date.now()) return false;
  return true;
}

async function ensureSlug<T extends TournamentDoc>(t: T): Promise<T> {
  if (t.slug) return t;
  for (let i = 0; i < 5; i++) {
    const slug = newSlug();
    try {
      await ProductionTournamentModel.updateOne(
        { id: t.id, $or: [{ slug: { $exists: false } }, { slug: null }] },
        { $set: { slug } },
      );
      const fresh = await ProductionTournamentModel.findOne({ id: t.id }).lean();
      return { ...t, slug: fresh?.slug ?? slug };
    } catch {
      // duplicate slug — retry
    }
  }
  return t;
}

function teamBytes(team: TeamDoc): number {
  return (team.logoBytes || 0) + (team.players || []).reduce((s, p) => s + (p.bytes || 0), 0);
}

function serializeTeam(team: TeamDoc) {
  return {
    id: team.id,
    tournamentId: team.tournamentId,
    teamName: team.teamName,
    teamLogo: team.teamLogo,
    players: (team.players || []).map((p) => ({ uid: p.uid, photo: p.photo })),
    source: (team.source || "organizer") as TeamSource,
    bytes: teamBytes(team),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

function tournamentStats(teams: TeamDoc[]) {
  return {
    teamCount: teams.length,
    photoCount: teams.reduce((s, t) => s + (t.players?.length || 0), 0),
    bytes: teams.reduce((s, t) => s + teamBytes(t), 0),
  };
}

function serializeTournament(t: TournamentDoc, teams: TeamDoc[]) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug || null,
    acceptingUploads: t.acceptingUploads !== false,
    deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
    isOpen: isOpen(t),
    createdAt: t.createdAt,
    ...tournamentStats(teams),
  };
}

type ParsedPlayer = { uid: string; photo: string };

/**
 * Validates team input. `existing` lets an edit keep previously-uploaded images
 * (by sending back their URL) instead of re-uploading.
 */
function validateTeamInput(
  body: Record<string, unknown>,
  existing?: TeamDoc,
): { error: string } | { teamName: string; teamLogo: string; players: ParsedPlayer[] } {
  const { teamName, teamLogo, players } = body;

  if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
    return { error: "Team name is required" };
  }
  if (teamName.trim().length > 60) {
    return { error: "Team name is too long (max 60 characters)" };
  }
  const keepLogo = existing && teamLogo === existing.teamLogo;
  if (!keepLogo && !isDataImage(teamLogo)) {
    return { error: "Team logo is required (image up to 6 MB)" };
  }
  if (players != null && !Array.isArray(players)) {
    return { error: "Players must be a list" };
  }
  const list: Array<{ uid?: unknown; photo?: unknown }> = Array.isArray(players) ? players : [];
  if (list.length > MAX_PLAYERS) {
    return { error: `Maximum ${MAX_PLAYERS} players allowed` };
  }
  const existingPhotos = new Set((existing?.players || []).map((p) => p.photo));
  const seen = new Set<string>();
  const parsed: ParsedPlayer[] = [];
  for (const p of list) {
    const uid = typeof p?.uid === "string" ? p.uid.trim() : "";
    if (!/^\d{1,32}$/.test(uid)) {
      return { error: "Each player needs a numeric UID (up to 32 digits)" };
    }
    if (seen.has(uid)) {
      return { error: `UID ${uid} is listed twice` };
    }
    seen.add(uid);
    const photo = p?.photo;
    const keep = typeof photo === "string" && existingPhotos.has(photo);
    if (!keep && !isDataImage(photo)) {
      return { error: `Player ${uid} needs a photo (image up to 6 MB)` };
    }
    parsed.push({ uid, photo: photo as string });
  }
  return { teamName: teamName.trim(), teamLogo: teamLogo as string, players: parsed };
}

async function findDuplicateName(tournamentId: string, teamName: string, exceptId?: string) {
  return ProductionTeamModel.findOne({
    tournamentId,
    teamName: { $regex: `^${escapeRegex(teamName)}$`, $options: "i" },
    ...(exceptId ? { id: { $ne: exceptId } } : {}),
  }).lean();
}

/** Uploads any new data-URL images; keeps already-stored images as-is. */
async function storeTeamMedia(
  input: { teamName: string; teamLogo: string; players: ParsedPlayer[] },
  existing?: TeamDoc,
) {
  const suffix = () => crypto.randomBytes(3).toString("hex");
  const oldPlayers = new Map((existing?.players || []).map((p) => [p.photo, p]));

  const logoTask = existing && input.teamLogo === existing.teamLogo
    ? Promise.resolve({ url: existing.teamLogo, bytes: existing.logoBytes || 0 })
    : uploadImageWithMeta({
        kind: "production-logo",
        teamName: `${input.teamName}-${suffix()}`,
        dataUrl: input.teamLogo,
      });

  const playerTasks = input.players.map(async (p) => {
    const kept = oldPlayers.get(p.photo);
    if (kept) return { uid: p.uid, photo: kept.photo, bytes: kept.bytes || 0 };
    const up = await uploadImageWithMeta({
      kind: "production-photo",
      uid: `${p.uid}-${suffix()}`,
      dataUrl: p.photo,
    });
    return { uid: p.uid, photo: up.url, bytes: up.bytes };
  });

  const [logo, players] = await Promise.all([logoTask, Promise.all(playerTasks)]);
  return { teamLogo: logo.url, logoBytes: logo.bytes, players };
}

/** Deletes images that the old version of a team had but the new one no longer uses. */
async function cleanupReplacedMedia(oldTeam: TeamDoc, newTeam: { teamLogo: string; players: PlayerDoc[] }) {
  const still = new Set([newTeam.teamLogo, ...newTeam.players.map((p) => p.photo)]);
  const gone = [oldTeam.teamLogo, ...(oldTeam.players || []).map((p) => p.photo)].filter(
    (u) => u && !still.has(u),
  );
  await Promise.all(gone.map((u) => deleteImageByUrl(u)));
}

function csvField(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Streams a roster ZIP matching the reference layout (roster.csv, Teams Logos/, Player Pics/). */
async function streamRosterZip(res: Response, teams: TeamDoc[], filename: string) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

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
    const players = team.players || [];

    if (players.length === 0) {
      csvLines.push([csvField(team.teamName || ""), "", csvField("Logo only"), csvField(logoPath)].join(","));
      continue;
    }

    for (const player of players) {
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
}

async function loadTournament(id: string): Promise<TournamentDoc | null> {
  const t = (await ProductionTournamentModel.findOne({ id }).lean()) as TournamentDoc | null;
  return t ? ensureSlug(t) : null;
}

// ───────────────────────── organizer (auth) ─────────────────────────

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
  const { tournamentId } = req.body;
  if (!tournamentId || typeof tournamentId !== "string") {
    res.status(400).json({ message: "Tournament is required" });
    return;
  }
  const input = validateTeamInput(req.body);
  if ("error" in input) {
    res.status(400).json({ message: input.error });
    return;
  }
  const tournament = await ProductionTournamentModel.findOne({ id: tournamentId }).lean();
  if (!tournament) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }
  if (await findDuplicateName(tournamentId, input.teamName)) {
    res.status(409).json({ message: `A team named "${input.teamName}" already exists in this tournament` });
    return;
  }

  const media = await storeTeamMedia(input);
  const team = await ProductionTeamModel.create({
    id: `pt-${crypto.randomBytes(6).toString("hex")}`,
    tournamentId,
    teamName: input.teamName,
    source: "organizer",
    ...media,
  });

  res.status(201).json(serializeTeam(team.toObject() as TeamDoc));
});

export const listProductionTeams = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.id ? String(req.query.id) : "";
  if (!tournamentId) {
    res.status(400).json({ message: "Tournament id is required" });
    return;
  }
  const teams = (await ProductionTeamModel.find({ tournamentId })
    .sort({ createdAt: -1 })
    .lean()) as TeamDoc[];
  res.json(teams.map(serializeTeam));
});

export const deleteProductionTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = (await ProductionTeamModel.findOne({ id: req.params.teamId }).lean()) as TeamDoc | null;
  if (!team) {
    res.status(404).json({ message: "Team not found" });
    return;
  }
  await ProductionTeamModel.deleteOne({ id: team.id });
  await cleanupReplacedMedia(team, { teamLogo: "", players: [] });
  res.json({ success: true });
});

export const exportProductionRoster = asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.query.id ? String(req.query.id) : "";
  if (!tournamentId) {
    res.status(400).json({ message: "Tournament id is required" });
    return;
  }
  const teams = (await ProductionTeamModel.find({ tournamentId })
    .sort({ createdAt: 1 })
    .lean()) as TeamDoc[];
  if (teams.length === 0) {
    res.status(404).json({ message: "No teams to export" });
    return;
  }
  const t = await ProductionTournamentModel.findOne({ id: tournamentId }).lean();
  const name = sanitizePathSegment(t?.name || `production-${tournamentId}`);
  await streamRosterZip(res, teams, `${name}.zip`);
});

export const exportProductionTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = (await ProductionTeamModel.findOne({ id: req.params.teamId }).lean()) as TeamDoc | null;
  if (!team) {
    res.status(404).json({ message: "Team not found" });
    return;
  }
  await streamRosterZip(res, [team], `${sanitizePathSegment(team.teamName)}.zip`);
});

export const createProductionTournament = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ message: "Tournament name is required" });
    return;
  }
  const tournament = await ProductionTournamentModel.create({
    id: `ptn-${crypto.randomBytes(6).toString("hex")}`,
    name: name.trim().slice(0, 80),
    slug: newSlug(),
  });
  res.status(201).json(serializeTournament(tournament.toObject() as TournamentDoc, []));
});

export const listProductionTournaments = asyncHandler(async (_req: Request, res: Response) => {
  const tournaments = (await ProductionTournamentModel.find()
    .sort({ createdAt: -1 })
    .lean()) as TournamentDoc[];
  const teams = (await ProductionTeamModel.find(
    {},
    { tournamentId: 1, players: 1, logoBytes: 1 },
  ).lean()) as TeamDoc[];
  const byTournament = new Map<string, TeamDoc[]>();
  for (const team of teams) {
    const list = byTournament.get(team.tournamentId) || [];
    list.push(team);
    byTournament.set(team.tournamentId, list);
  }
  const withSlugs = await Promise.all(tournaments.map((t) => ensureSlug(t)));
  res.json(withSlugs.map((t) => serializeTournament(t, byTournament.get(t.id) || [])));
});

export const getProductionTournament = asyncHandler(async (req: Request, res: Response) => {
  const t = await loadTournament(String(req.params.id));
  if (!t) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }
  const teams = (await ProductionTeamModel.find({ tournamentId: t.id }).lean()) as TeamDoc[];
  res.json(serializeTournament(t, teams));
});

export const updateProductionTournament = asyncHandler(async (req: Request, res: Response) => {
  const { name, acceptingUploads, deadline } = req.body as {
    name?: unknown;
    acceptingUploads?: unknown;
    deadline?: unknown;
  };
  const update: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ message: "Tournament name cannot be empty" });
      return;
    }
    update.name = name.trim().slice(0, 80);
  }
  if (acceptingUploads !== undefined) {
    if (typeof acceptingUploads !== "boolean") {
      res.status(400).json({ message: "acceptingUploads must be true or false" });
      return;
    }
    update.acceptingUploads = acceptingUploads;
  }
  if (deadline !== undefined) {
    if (deadline === null || deadline === "") {
      update.deadline = null;
    } else {
      const d = new Date(String(deadline));
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ message: "Invalid deadline" });
        return;
      }
      update.deadline = d;
    }
  }

  const t = await ProductionTournamentModel.findOneAndUpdate(
    { id: req.params.id },
    { $set: update },
    { new: true },
  ).lean();
  if (!t) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }
  const teams = (await ProductionTeamModel.find({ tournamentId: t.id }).lean()) as TeamDoc[];
  res.json(serializeTournament(await ensureSlug(t as TournamentDoc), teams));
});

// ───────────────────────── public (share link, no account) ─────────────────────────

async function findBySlug(slug: string): Promise<TournamentDoc | null> {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(slug)) return null;
  return (await ProductionTournamentModel.findOne({ slug }).lean()) as TournamentDoc | null;
}

function publicTournament(t: TournamentDoc) {
  return {
    name: t.name,
    isOpen: isOpen(t),
    acceptingUploads: t.acceptingUploads !== false,
    deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
    maxPlayers: MAX_PLAYERS,
  };
}

function publicTeam(team: TeamDoc) {
  return {
    teamName: team.teamName,
    teamLogo: team.teamLogo,
    players: (team.players || []).map((p) => ({ uid: p.uid, photo: p.photo })),
    updatedAt: team.updatedAt,
  };
}

export const getPublicTournament = asyncHandler(async (req: Request, res: Response) => {
  const t = await findBySlug(String(req.params.slug));
  if (!t) {
    res.status(404).json({ message: "This upload link is not valid" });
    return;
  }
  res.json(publicTournament(t));
});

export const submitPublicTeam = asyncHandler(async (req: Request, res: Response) => {
  const t = await findBySlug(String(req.params.slug));
  if (!t) {
    res.status(404).json({ message: "This upload link is not valid" });
    return;
  }
  if (!isOpen(t)) {
    res.status(403).json({ message: "Uploads are closed for this tournament" });
    return;
  }
  const input = validateTeamInput(req.body);
  if ("error" in input) {
    res.status(400).json({ message: input.error });
    return;
  }
  if (await findDuplicateName(t.id, input.teamName)) {
    res.status(409).json({
      message: `"${input.teamName}" has already been submitted. Use your edit link to change it, or contact the organizer.`,
    });
    return;
  }

  const media = await storeTeamMedia(input);
  const editToken = newEditToken();
  await ProductionTeamModel.create({
    id: `pt-${crypto.randomBytes(6).toString("hex")}`,
    tournamentId: t.id,
    teamName: input.teamName,
    source: "link",
    editTokenHash: hashToken(editToken),
    ...media,
  });

  res.status(201).json({ success: true, editToken, teamName: input.teamName });
});

async function findTeamByToken(t: TournamentDoc, token: string): Promise<TeamDoc | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return (await ProductionTeamModel.findOne({
    tournamentId: t.id,
    editTokenHash: hashToken(token),
  }).lean()) as TeamDoc | null;
}

export const getPublicTeam = asyncHandler(async (req: Request, res: Response) => {
  const t = await findBySlug(String(req.params.slug));
  const team = t ? await findTeamByToken(t, String(req.params.token)) : null;
  if (!t || !team) {
    res.status(404).json({ message: "Submission not found" });
    return;
  }
  res.json({ tournament: publicTournament(t), team: publicTeam(team) });
});

export const updatePublicTeam = asyncHandler(async (req: Request, res: Response) => {
  const t = await findBySlug(String(req.params.slug));
  const team = t ? await findTeamByToken(t, String(req.params.token)) : null;
  if (!t || !team) {
    res.status(404).json({ message: "Submission not found" });
    return;
  }
  if (!isOpen(t)) {
    res.status(403).json({ message: "Editing is closed for this tournament" });
    return;
  }
  const input = validateTeamInput(req.body, team);
  if ("error" in input) {
    res.status(400).json({ message: input.error });
    return;
  }
  if (await findDuplicateName(t.id, input.teamName, team.id)) {
    res.status(409).json({ message: `Another team is already called "${input.teamName}"` });
    return;
  }

  const media = await storeTeamMedia(input, team);
  const updated = (await ProductionTeamModel.findOneAndUpdate(
    { id: team.id },
    { $set: { teamName: input.teamName, ...media } },
    { new: true },
  ).lean()) as TeamDoc | null;
  await cleanupReplacedMedia(team, media);

  res.json({ success: true, team: updated ? publicTeam(updated) : null });
});
