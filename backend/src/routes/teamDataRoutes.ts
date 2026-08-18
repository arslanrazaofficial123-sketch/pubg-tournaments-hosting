import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { uploadImage } from "../services/storageService.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).user!.uid;
    const user = await UserModel.findOne({ uid }).lean();
    res.json(user?.teamData || null);
  }),
);

router.put(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).user!.uid;
    const { teamName, teamLogo, format, players } = req.body;

    let logoUrl = teamLogo;
    if (teamLogo && teamLogo.startsWith("data:")) {
      try {
        logoUrl = await uploadImage({ kind: "team-logo", uid, dataUrl: teamLogo });
      } catch {
        logoUrl = teamLogo;
      }
    }

    let processedPlayers = players;
    if (Array.isArray(players)) {
      processedPlayers = await Promise.all(
        players.map(async (p: any) => {
          if (p.picture && p.picture.startsWith("data:")) {
            try {
              const url = await uploadImage({ kind: "player-picture", uid, teamName, dataUrl: p.picture });
              return { ...p, picture: url };
            } catch {
              return p;
            }
          }
          return p;
        }),
      );
    }

    const update: Record<string, any> = {};
    if (teamName !== undefined) update["teamData.teamName"] = teamName;
    if (logoUrl !== undefined) update["teamData.teamLogo"] = logoUrl;
    if (format !== undefined) update["teamData.format"] = format;
    if (processedPlayers !== undefined) update["teamData.players"] = processedPlayers;

    await UserModel.updateOne({ uid }, { $set: update });
    const user = await UserModel.findOne({ uid }).lean();
    res.json(user?.teamData || null);
  }),
);

export default router;
