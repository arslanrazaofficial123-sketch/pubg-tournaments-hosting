import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { UserModel } from "../models/User.js";

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

    const update: Record<string, any> = {};
    if (teamName !== undefined) update["teamData.teamName"] = teamName;
    if (teamLogo !== undefined) update["teamData.teamLogo"] = teamLogo;
    if (format !== undefined) update["teamData.format"] = format;
    if (players !== undefined) update["teamData.players"] = players;

    await UserModel.updateOne({ uid }, { $set: update });
    const user = await UserModel.findOne({ uid }).lean();
    res.json(user?.teamData || null);
  }),
);

export default router;
