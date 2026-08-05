import { Router } from "express";
import { reportFrontendError } from "../controllers/errorReportController.js";

const router = Router();

router.post("/", reportFrontendError);

export default router;