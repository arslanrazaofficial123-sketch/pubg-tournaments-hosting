import { Router } from "express";
import {
  getMatchesList,
  createNewMatch,
  deleteMatch,
  updateExistingMatch,
} from "../controllers/matchController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", getMatchesList);
router.post("/", requireAdmin, createNewMatch);
router.put("/:id", requireAdmin, updateExistingMatch);
router.delete("/:id", requireAdmin, deleteMatch);

export default router;
