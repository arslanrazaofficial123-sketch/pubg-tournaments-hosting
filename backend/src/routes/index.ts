import { Router, Request, Response } from "express";
import authRoutes from "./authRoutes.js";
import tournamentRoutes from "./tournamentRoutes.js";
import matchRoutes from "./matchRoutes.js";
import reviewRoutes from "./reviewRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/matches", matchRoutes);
router.use("/reviews", reviewRoutes);

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});


export default router;
