import { Router } from "express";
import {
  createProductionTeam,
  createProductionTournament,
  deleteProductionTeam,
  deleteProductionTournament,
  exportProductionRoster,
  exportProductionTeam,
  getProductionTournament,
  getPublicTeam,
  getPublicTournament,
  listProductionTeams,
  listProductionTournaments,
  productionLogin,
  submitPublicTeam,
  updateProductionTournament,
  updatePublicTeam,
} from "../controllers/productionController.js";
import { requireProduction } from "../middleware/auth.js";

const router = Router();

router.post("/login", productionLogin);

// Public share-link upload (no account). Must be registered before requireProduction.
router.get("/public/:slug", getPublicTournament);
router.post("/public/:slug/teams", submitPublicTeam);
router.get("/public/:slug/teams/:token", getPublicTeam);
router.put("/public/:slug/teams/:token", updatePublicTeam);

router.use(requireProduction);
router.post("/teams", createProductionTeam);
router.get("/teams", listProductionTeams);
router.get("/teams/export", exportProductionRoster);
router.get("/teams/:teamId/export", exportProductionTeam);
router.delete("/teams/:teamId", deleteProductionTeam);
router.post("/tournaments", createProductionTournament);
router.get("/tournaments", listProductionTournaments);
router.get("/tournaments/:id", getProductionTournament);
router.patch("/tournaments/:id", updateProductionTournament);
router.delete("/tournaments/:id", deleteProductionTournament);

export default router;
