import { Router } from "express";
import type { Response } from "express";
import {
  createShopOrder,
  getShopOrderById,
  getShopOrdersByUid,
  getAllShopOrders,
  updateShopOrderStatus,
  markShopOrderWalletDeducted,
} from "../services/shopService.js";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendOrderConfirmationEmail, sendAdminOrderNotificationEmail } from "../utils/email.js";

const router = Router();

function str(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}

router.post(
  "/orders",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { packageId, packageLabel, ucAmount, price, paymentMethod, pubgUid, inGameName, email, transactionId, receiptUrl } = req.body as any;

    if (!packageId || !packageLabel || !ucAmount || !price || !paymentMethod || !pubgUid || !inGameName) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    if (paymentMethod === "manual" && (!transactionId || !receiptUrl)) {
      res.status(400).json({ message: "Transaction ID and receipt required for manual payment" });
      return;
    }

    const order = await createShopOrder({
      packageId,
      packageLabel,
      ucAmount,
      price,
      paymentMethod,
      pubgUid,
      inGameName,
      email,
      transactionId,
      receiptUrl,
    });

    if (email) {
      sendOrderConfirmationEmail(email, {
        id: order.id,
        packageLabel: order.packageLabel,
        ucAmount: order.ucAmount,
        price: order.price,
        paymentMethod: order.paymentMethod,
        pubgUid: order.pubgUid,
        inGameName: order.inGameName,
        transactionId: order.transactionId ?? undefined,
        createdAt: order.createdAt,
      }).catch(() => {});
    }

    sendAdminOrderNotificationEmail({
      id: order.id,
      packageLabel: order.packageLabel,
      ucAmount: order.ucAmount,
      price: order.price,
      paymentMethod: order.paymentMethod,
      pubgUid: order.pubgUid,
      inGameName: order.inGameName,
      transactionId: order.transactionId ?? undefined,
      createdAt: order.createdAt,
    }).catch(() => {});

    res.status(201).json({ order });
  }),
);

router.get(
  "/my-orders",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const orders = await getShopOrdersByUid(uid);
    res.json({ orders });
  }),
);

router.get(
  "/orders/:id",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = str(req.params.id);
    const order = await getShopOrderById(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    if (req.user?.role !== "admin" && order.pubgUid !== req.user?.uid) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    res.json({ order });
  }),
);

router.get(
  "/admin/orders",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.query;
    const orders = await getAllShopOrders(status as string);
    res.json({ orders });
  }),
);

router.put(
  "/admin/orders/:id/status",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = str(req.params.id);
    const { status, adminNote } = req.body;

    const validStatuses = ["pending", "processing", "completed", "failed", "refunded"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const order = await updateShopOrderStatus(orderId, status, adminNote, req.user?.uid);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.json({ order });
  }),
);

router.put(
  "/admin/orders/:id/approve-wallet",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const orderId = str(req.params.id);
    const order = await markShopOrderWalletDeducted(orderId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.json({ order });
  }),
);

export default router;
