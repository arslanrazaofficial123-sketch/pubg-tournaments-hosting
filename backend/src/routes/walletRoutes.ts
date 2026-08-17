import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getWalletSummary,
  createDepositRequest,
  createWithdrawRequest,
  approveWalletRequest,
  rejectWalletRequest,
  creditPrize,
  getAllWalletRequests,
  resolveRequesterNames,
} from "../services/walletService.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const uid = authReq.user!.uid;
    const summary = await getWalletSummary(uid);
    res.json(summary);
  }),
);

router.post(
  "/deposit",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const uid = authReq.user!.uid;
    const { amount, externalTransactionId, note, screenshot } = req.body || {};
    try {
      const tx = await createDepositRequest(uid, {
        amount: Number(amount),
        externalTransactionId,
        note,
        screenshot,
      });
      res.status(201).json(tx);
    } catch (err: any) {
      if (err.message === "INVALID_AMOUNT") {
        res.status(400).json({ message: "Please enter a valid amount greater than 0." });
        return;
      }
      if (err.message === "AMOUNT_TOO_LARGE") {
        res.status(400).json({ message: "Amount is too large." });
        return;
      }
      throw err;
    }
  }),
);

router.post(
  "/withdraw",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const uid = authReq.user!.uid;
    const { amount, paymentMethod, accountName, accountNumber, note } = req.body || {};
    try {
      const tx = await createWithdrawRequest(uid, {
        amount: Number(amount),
        paymentMethod,
        accountName,
        accountNumber,
        note,
      });
      res.status(201).json(tx);
    } catch (err: any) {
      if (err.message === "INVALID_AMOUNT") {
        res.status(400).json({ message: "Please enter a valid amount greater than 0." });
        return;
      }
      if (err.message === "WITHDRAW_DETAILS_REQUIRED") {
        res.status(400).json({ message: "Account method, name, and number are required." });
        return;
      }
      if (err.message === "INSUFFICIENT_WALLET_BALANCE") {
        res.status(400).json({ message: "Insufficient wallet balance." });
        return;
      }
      throw err;
    }
  }),
);

router.get(
  "/admin/requests",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const valid = status === "pending" || status === "approved" || status === "rejected";
    const requests = await getAllWalletRequests(valid ? status : undefined);
    const resolved = await resolveRequesterNames(requests);
    res.json(resolved);
  }),
);

router.put(
  "/admin/requests/:id/approve",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const id = String(req.params.id);
    try {
      const tx = await approveWalletRequest(id, authReq.user!.uid);
      res.json(tx);
    } catch (err: any) {
      if (err.message === "WALLET_REQUEST_NOT_FOUND") {
        res.status(404).json({ message: "Wallet request not found" });
        return;
      }
      if (err.message === "WALLET_REQUEST_ALREADY_PROCESSED") {
        res.status(400).json({ message: "Wallet request was already processed" });
        return;
      }
      if (err.message === "INSUFFICIENT_WALLET_BALANCE") {
        res.status(400).json({ message: "User's wallet balance is not sufficient for this withdrawal" });
        return;
      }
      throw err;
    }
  }),
);

router.put(
  "/admin/requests/:id/reject",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const id = String(req.params.id);
    try {
      const tx = await rejectWalletRequest(id, authReq.user!.uid);
      res.json(tx);
    } catch (err: any) {
      if (err.message === "WALLET_REQUEST_NOT_FOUND") {
        res.status(404).json({ message: "Wallet request not found" });
        return;
      }
      if (err.message === "WALLET_REQUEST_ALREADY_PROCESSED") {
        res.status(400).json({ message: "Wallet request was already processed" });
        return;
      }
      throw err;
    }
  }),
);

router.post(
  "/admin/credit",
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { uid, amount, description, tournamentId } = req.body || {};
    try {
      const tx = await creditPrize(String(uid), {
        amount: Number(amount),
        description,
        tournamentId,
      });
      res.status(201).json(tx);
    } catch (err: any) {
      if (err.message === "INVALID_AMOUNT") {
        res.status(400).json({ message: "Please enter a valid amount greater than 0." });
        return;
      }
      if (err.message === "USER_NOT_FOUND") {
        res.status(404).json({ message: "User not found" });
        return;
      }
      throw err;
    }
  }),
);

export default router;