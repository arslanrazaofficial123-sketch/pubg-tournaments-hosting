import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { listShowcase, createShowcase, updateShowcase, deleteShowcase } from "../controllers/showcaseController.js";

const router = Router();
router.get("/", listShowcase);
router.post("/", requireAdmin, createShowcase);
router.put("/:id", requireAdmin, updateShowcase);
router.delete("/:id", requireAdmin, deleteShowcase);
export default router;
