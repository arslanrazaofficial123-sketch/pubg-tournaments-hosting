import { Router, type Request, type Response } from "express";
import { DataDeletionRequestModel } from "../models/DataDeletionRequest.js";
import { requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// POST /api/data-deletion — public, no auth required
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { fullName, emailOrUsername, whatsappOrPhone, teamName, reason } =
      req.body;

    if (!fullName?.trim()) {
      res.status(400).json({ message: "Full name is required" });
      return;
    }
    if (!emailOrUsername?.trim()) {
      res.status(400).json({ message: "Email or username is required" });
      return;
    }
    if (!whatsappOrPhone?.trim()) {
      res.status(400).json({ message: "WhatsApp or phone is required" });
      return;
    }

    const id = "ddr-" + Math.random().toString(36).substring(2, 11);
    const doc = await DataDeletionRequestModel.create({
      id,
      fullName: fullName.trim(),
      emailOrUsername: emailOrUsername.trim(),
      whatsappOrPhone: whatsappOrPhone.trim(),
      teamName: teamName?.trim() || "",
      reason: reason?.trim() || "",
    });

    res.status(201).json({
      success: true,
      message:
        "Deletion request submitted. Our support team will contact you for account ownership verification.",
      request: { id: doc.id, status: doc.status, createdAt: doc.createdAt },
    });
  }),
);

// GET /api/data-deletion/admin — admin only, list all requests
router.get(
  "/admin",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const requests = await DataDeletionRequestModel.find({})
      .sort({ createdAt: -1 })
      .lean();
    res.json({ requests });
  }),
);

// PUT /api/data-deletion/admin/:id/status — admin only, update status
router.put(
  "/admin/:id/status",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const allowedStatuses = [
      "pending",
      "verified",
      "processing",
      "completed",
      "rejected",
    ];
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const update: Record<string, unknown> = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    if (status === "completed" || status === "processing") {
      update.processedAt = new Date();
    }

    const doc = await DataDeletionRequestModel.findOneAndUpdate(
      { id },
      update,
      { new: true },
    ).lean();

    if (!doc) {
      res.status(404).json({ message: "Request not found" });
      return;
    }

    res.json({ success: true, request: doc });
  }),
);

export default router;
