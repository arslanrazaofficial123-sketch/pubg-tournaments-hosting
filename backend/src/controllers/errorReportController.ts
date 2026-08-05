import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendErrorAlert } from "../services/emailService.js";
import { env } from "../config/env.js";

let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 30_000;

export const reportFrontendError = asyncHandler(async (req: Request, res: Response) => {
  const { message, stack, url, source } = req.body;

  if (!env.smtpUser || !env.alertEmail) {
    res.status(200).json({ success: false, reason: "email alerts not configured" });
    return;
  }

  const now = Date.now();
  if (now - lastAlertAt >= ALERT_COOLDOWN_MS) {
    lastAlertAt = now;
    sendErrorAlert({
      source: source || "Frontend / Website",
      message: message || "Unknown frontend error",
      stack: stack || undefined,
      url: url || "frontend",
      statusCode: 0,
    }).catch((emailErr) => {
      console.error("Failed to send frontend error alert email:", emailErr);
    });
  }

  res.status(200).json({ success: true });
});