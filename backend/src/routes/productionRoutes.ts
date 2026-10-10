import { Router } from "express";
import {
  createProductionTeam,
  listProductionTeams,
  productionLogin,
} from "../controllers/productionController.js";
import { requireProduction } from "../middleware/auth.js";

const router = Router();

router.post("/login", productionLogin);
router.use(requireProduction);
router.post("/teams", createProductionTeam);
router.get("/teams", listProductionTeams);

export default router;
