import { Router } from "express";
import {
  getTournamentById,
  getTournaments,
  createTournament,
  deleteTournament,
  updateTournament,
  registerTournament,
  getRegistrations,
  updateRegStatus,
  deleteRegistration,
  updateRegStats,
  updateRegSlot,
  notifyTournament,
} from "../controllers/tournamentController.js";
import { requireAuth, requireAdmin, requireStaff } from "../middleware/auth.js";

const router = Router();

router.get("/", getTournaments);
router.get("/registrations", requireAuth, getRegistrations);
router.put("/registrations/:id/status", requireStaff, updateRegStatus);
router.put("/registrations/:id/stats", requireStaff, updateRegStats);
router.put("/registrations/:id/slot", requireStaff, updateRegSlot);
router.delete("/registrations/:id", requireStaff, deleteRegistration);
router.get("/:id", getTournamentById);
router.post("/", requireAdmin, createTournament);
router.delete("/:id", requireAdmin, deleteTournament);
router.put("/:id", requireAdmin, updateTournament);
router.post("/:id/register", requireAuth, registerTournament);
router.post("/:id/notify", requireAdmin, notifyTournament);

export default router;
