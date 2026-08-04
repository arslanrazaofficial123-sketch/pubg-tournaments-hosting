import { Router, Request, Response } from "express";
import authRoutes from "./authRoutes.js";
import tournamentRoutes from "./tournamentRoutes.js";
import matchRoutes from "./matchRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/matches", matchRoutes);

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});


export default router;
