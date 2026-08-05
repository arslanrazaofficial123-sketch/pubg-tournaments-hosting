import { Router } from "express";
import {
  getMatchesList,
  createNewMatch,
  deleteMatch,
  updateExistingMatch,
} from "../controllers/matchController.js";
import { requireStaff } from "../middleware/auth.js";

const router = Router();

router.get("/", getMatchesList);
router.post("/", requireStaff, createNewMatch);
router.put("/:id", requireStaff, updateExistingMatch);
router.delete("/:id", requireStaff, deleteMatch);

export default router;
