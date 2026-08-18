import { Router, Request, Response } from "express";
import authRoutes from "./authRoutes.js";
import tournamentRoutes from "./tournamentRoutes.js";
import matchRoutes from "./matchRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import contactRoutes from "./contactRoutes.js";
import errorReportRoutes from "./errorReportRoutes.js";
import adminRoutes from "./adminRoutes.js";
import walletRoutes from "./walletRoutes.js";
import shopRoutes from "./shopRoutes.js";
import dataDeletionRoutes from "./dataDeletionRoutes.js";
import teamDataRoutes from "./teamDataRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tournaments", tournamentRoutes);
router.use("/matches", matchRoutes);
router.use("/reviews", reviewRoutes);
router.use("/contact", contactRoutes);
router.use("/error-report", errorReportRoutes);
router.use("/admin", adminRoutes);
router.use("/wallet", walletRoutes);
router.use("/shop", shopRoutes);
router.use("/data-deletion", dataDeletionRoutes);
router.use("/team-data", teamDataRoutes);

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});


export default router;
