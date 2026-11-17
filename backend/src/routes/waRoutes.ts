import { Router, type Request, type Response, type NextFunction } from "express";
import { env } from "../config/env.js";
import { requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { WaMessageModel, WaHeartbeat } from "../models/WaMessage.js";

const router = Router();
let lastBeat = 0;
let lastConn = false;

function gatewayAuth(req: Request, res: Response, next: NextFunction) {
  if (!env.waGatewaySecret || req.header("x-wa-secret") !== env.waGatewaySecret) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

/** The gateway on the organiser's PC asks for work. Messages stuck in "sending" for 2+ minutes are handed out again. */
router.get("/pending", gatewayAuth, asyncHandler(async (req, res) => {
  const conn = req.query.connected === "1";
  if (Date.now() - lastBeat > 10_000 || conn !== lastConn) {        // heartbeat: not on every fast poll
    lastBeat = Date.now(); lastConn = conn;
    await WaHeartbeat.updateOne(
      { key: "gateway" },
      { $set: { at: new Date(), connected: conn, number: String(req.query.number || "") } },
      { upsert: true }
    );
  }
  if (req.query.connected !== "1") { res.json([]); return; }   // a gateway that is not linked to WhatsApp takes no work
  const stale = new Date(Date.now() - 2 * 60_000);
  await WaMessageModel.updateMany({ status: "sending", lockedAt: { $lt: stale } }, { $set: { status: "pending" } });
  const out = [];
  for (let i = 0; i < 10; i++) {
    const m = await WaMessageModel.findOneAndUpdate(
      { status: "pending", tries: { $lt: 4 } },
      { $set: { status: "sending", lockedAt: new Date() }, $inc: { tries: 1 } },
      { sort: { createdAt: 1 }, new: true }
    );
    if (!m) break;
    out.push({ id: String(m._id), to: m.to, text: m.text });
  }
  res.json(out);
}));

router.post("/report", gatewayAuth, asyncHandler(async (req, res) => {
  const { id, ok, error, permanent } = req.body ?? {};
  await WaMessageModel.updateOne(
    { _id: id },
    ok
      ? { $set: { status: "sent", sentAt: new Date(), error: "" } }
      : { $set: { status: permanent ? "failed" : "pending", error: String(error || "failed").slice(0, 300) } }
  );
  // after 4 tries it stays pending-but-skipped; mark failed so the admin sees it
  await WaMessageModel.updateMany({ status: "pending", tries: { $gte: 4 } }, { $set: { status: "failed" } });
  res.json({ ok: true });
}));

/** Admin: is the gateway online, and how are this match's messages doing? */
router.get("/status", requireAdmin, asyncHandler(async (req, res) => {
  const hb = await WaHeartbeat.findOne({ key: "gateway" }).lean();
  const online = !!hb?.at && Date.now() - new Date(hb.at).getTime() < 30_000;
  const filter = req.query.matchId ? { matchId: String(req.query.matchId) } : {};
  const rows = await WaMessageModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  res.json({
    gatewayOnline: online,
    connectedToWhatsApp: online && !!hb?.connected,
    number: hb?.number || "",
    pending: count("pending") + count("sending"),
    sent: count("sent"),
    failed: count("failed"),
    messages: rows.map((r) => ({ id: String(r._id), teamName: r.teamName, to: r.to, status: r.status, error: r.error, sentAt: r.sentAt })),
  });
}));

router.post("/retry-failed", requireAdmin, asyncHandler(async (req, res) => {
  const r = await WaMessageModel.updateMany({ status: "failed" }, { $set: { status: "pending", tries: 0 } });
  res.json({ ok: true, retried: r.modifiedCount });
}));

export default router;
