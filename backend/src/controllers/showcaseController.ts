import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ShowcaseModel } from "../models/Showcase.js";
import { deleteImageByUrl, uploadImageWithMeta } from "../services/storageService.js";

const clean = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const isImg = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:image/");
const out = (d: { toObject: () => object; _id: unknown }) => ({ ...d.toObject(), id: String(d._id) });

async function up(data: string, tag: string) {
  return (await uploadImageWithMeta({ kind: "showcase", uid: `${tag}-${Date.now()}`, dataUrl: data })).url;
}

export const listShowcase = asyncHandler(async (req: Request, res: Response) => {
  const items = await ShowcaseModel.find(req.query.all === "1" ? {} : { active: true }).sort({ order: 1, createdAt: -1 }).lean();
  res.json(items.map((i) => ({ ...i, id: String(i._id) })));
});

export const createShowcase = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body ?? {};
  const tournamentName = clean(b.tournamentName);
  if (!tournamentName) { res.status(400).json({ message: "Tournament name required" }); return; }
  if (!isImg(b.champion) && !isImg(b.rankings)) { res.status(400).json({ message: "Upload at least one picture" }); return; }
  const doc = await ShowcaseModel.create({
    tournamentName, winnerTeam: clean(b.winnerTeam), dateLabel: clean(b.dateLabel), organizer: clean(b.organizer),
    youtubeUrl: clean(b.youtubeUrl, 400), order: Number(b.order) || 0, active: b.active !== false,
    championUrl: isImg(b.champion) ? await up(b.champion, "champion") : "",
    rankingsUrl: isImg(b.rankings) ? await up(b.rankings, "rankings") : "",
  });
  res.status(201).json(out(doc));
});

export const updateShowcase = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ShowcaseModel.findById(req.params.id);
  if (!doc) { res.status(404).json({ message: "Not found" }); return; }
  const b = req.body ?? {};
  if (isImg(b.champion)) { const old = doc.championUrl; doc.championUrl = await up(b.champion, "champion"); await deleteImageByUrl(old); }
  if (isImg(b.rankings)) { const old = doc.rankingsUrl; doc.rankingsUrl = await up(b.rankings, "rankings"); await deleteImageByUrl(old); }
  for (const k of ["tournamentName", "winnerTeam", "dateLabel", "organizer"] as const) if (b[k] !== undefined) doc[k] = clean(b[k]);
  if (b.youtubeUrl !== undefined) doc.youtubeUrl = clean(b.youtubeUrl, 400);
  if (b.order !== undefined) doc.order = Number(b.order) || 0;
  if (b.active !== undefined) doc.active = !!b.active;
  await doc.save();
  res.json(out(doc));
});

export const deleteShowcase = asyncHandler(async (req: Request, res: Response) => {
  const doc = await ShowcaseModel.findByIdAndDelete(req.params.id);
  if (doc) { await deleteImageByUrl(doc.championUrl); await deleteImageByUrl(doc.rankingsUrl); }
  res.json({ ok: true });
});
