import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendContactAlert } from "../services/emailService.js";
import { env } from "../config/env.js";

export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const { name, contact, topic, message } = req.body;

  if (!name || !contact || !message) {
    res.status(400).json({ message: "name, contact, and message are required fields" });
    return;
  }

  if (!env.smtpUser || !env.alertEmail) {
    res.status(500).json({
      message: "Email alerts are not configured on the server yet",
    });
    return;
  }

  await sendContactAlert({ name, contact, topic: topic || "General enquiry", message });

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
  });
});