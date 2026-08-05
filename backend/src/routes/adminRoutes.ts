import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDatabaseStats } from "../controllers/adminController.js";

const router = Router();

router.get("/db-stats", requireAdmin, getDatabaseStats);

export default router;