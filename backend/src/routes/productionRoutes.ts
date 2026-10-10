import { Router } from "express";
import {
  createProductionTeam,
  exportProductionRoster,
  listProductionTeams,
  productionLogin,
} from "../controllers/productionController.js";
import { requireProduction } from "../middleware/auth.js";

const router = Router();

router.post("/login", productionLogin);
router.use(requireProduction);
router.post("/teams", createProductionTeam);
router.get("/teams", listProductionTeams);
router.get("/teams/export", exportProductionRoster);

export default router;
