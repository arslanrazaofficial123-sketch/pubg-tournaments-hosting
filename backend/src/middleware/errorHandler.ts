import type { Request, Response, NextFunction } from "express";
import { sendErrorAlert } from "../services/emailService.js";
import { env } from "../config/env.js";

let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 60_000;

function canSendAlert(): boolean {
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return false;
  lastAlertAt = now;
  return true;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);

  if (env.smtpUser && env.alertEmail && canSendAlert()) {
    sendErrorAlert({
      source: "Backend / API",
      message: err.message || "Internal server error",
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      statusCode: 500,
    }).catch((emailErr) => {
      console.error("Failed to send error alert email:", emailErr);
    });
  }

  res.status(500).json({
    message: err.message || "Internal server error",
  });
}