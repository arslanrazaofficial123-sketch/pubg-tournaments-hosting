import { UserModel } from "../models/User.js";
import { WalletTransactionModel } from "../models/WalletTransaction.js";
import { uploadImage } from "./storageService.js";

function makeId(): string {
  return "wtx-" + Math.random().toString(36).substring(2, 11);
}

function toTransaction(doc: any) {
  return {
    id: doc.id,
    uid: doc.uid,
    type: doc.type,
    amount: doc.amount,
    status: doc.status,
    description: doc.description || "",
    tournamentId: doc.tournamentId || undefined,
    registrationId: doc.registrationId || undefined,
    externalTransactionId: doc.externalTransactionId || undefined,
    note: doc.note || undefined,
    screenshotUrl: doc.screenshotUrl || undefined,
    paymentMethod: doc.paymentMethod || undefined,
    accountName: doc.accountName || undefined,
    accountNumber: doc.accountNumber || undefined,
    reviewedBy: doc.reviewedBy || undefined,
    reviewedAt: doc.reviewedAt || undefined,
    createdAt: doc.createdAt,
  };
}

export interface WalletSummary {
  balance: number;
  breakdown: {
    prizeRewards: number;
    entryFees: number;
    refunds: number;
    withdrawals: number;
  };
  requests: any[];
  transactions: any[];
}

export async function getWalletSummary(uid: string): Promise<WalletSummary> {
  const user = await UserModel.findOne({ uid }).lean();
  const balance = user?.walletBalance ?? 0;

  const rows = await WalletTransactionModel.find({ uid, status: "approved" }).lean();

  const breakdown = {
    prizeRewards: 0,
    entryFees: 0,
    refunds: 0,
    withdrawals: 0,
  };
  for (const row of rows) {
    if (row.type === "prize") breakdown.prizeRewards += row.amount;
    else if (row.type === "entryFee") breakdown.entryFees += Math.abs(row.amount);
    else if (row.type === "refund") breakdown.refunds += row.amount;
    else if (row.type === "withdraw") breakdown.withdrawals += Math.abs(row.amount);
  }

  const requests = await WalletTransactionModel.find({
    uid,
    type: { $in: ["deposit", "withdraw"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const transactions = await WalletTransactionModel.find({ uid })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return {
    balance,
    breakdown,
    requests: requests.map(toTransaction),
    transactions: transactions.map(toTransaction),
  };
}

export async function createDepositRequest(
  uid: string,
  payload: {
    amount: number;
    externalTransactionId?: string;
    note?: string;
    screenshot?: string;
  },
): Promise<any> {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  if (amount > 1000000) {
    throw new Error("AMOUNT_TOO_LARGE");
  }

  let screenshotUrl: string | undefined;
  if (payload.screenshot) {
    screenshotUrl = await uploadImage({
      kind: "wallet-proof",
      uid,
      dataUrl: payload.screenshot,
    });
  }

  const doc = await WalletTransactionModel.create({
    id: makeId(),
    uid,
    type: "deposit",
    amount,
    status: "pending",
    description: "Deposit request",
    externalTransactionId: payload.externalTransactionId?.trim() || undefined,
    note: payload.note?.trim() || undefined,
    screenshotUrl,
  });

  return toTransaction(doc.toObject());
}

export async function createWithdrawRequest(
  uid: string,
  payload: {
    amount: number;
    paymentMethod: string;
    accountName: string;
    accountNumber: string;
    note?: string;
  },
): Promise<any> {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  if (!payload.paymentMethod?.trim() || !payload.accountName?.trim() || !payload.accountNumber?.trim()) {
    throw new Error("WITHDRAW_DETAILS_REQUIRED");
  }

  const user = await UserModel.findOne({ uid }).lean();
  const balance = user?.walletBalance ?? 0;
  if (amount > balance) {
    throw new Error("INSUFFICIENT_WALLET_BALANCE");
  }

  const doc = await WalletTransactionModel.create({
    id: makeId(),
    uid,
    type: "withdraw",
    amount: -Math.abs(amount),
    status: "pending",
    description: "Withdraw request",
    paymentMethod: payload.paymentMethod.trim(),
    accountName: payload.accountName.trim(),
    accountNumber: payload.accountNumber.trim(),
    note: payload.note?.trim() || undefined,
  });

  return toTransaction(doc.toObject());
}

export async function approveWalletRequest(
  id: string,
  reviewerUid: string,
): Promise<any> {
  const doc = await WalletTransactionModel.findOne({ id });
  if (!doc) throw new Error("WALLET_REQUEST_NOT_FOUND");
  if (doc.get("status") !== "pending") {
    throw new Error("WALLET_REQUEST_ALREADY_PROCESSED");
  }

  const uid = doc.get("uid") as string;
  const type = doc.get("type") as string;
  const amount = doc.get("amount") as number;

  if (type === "deposit") {
    await UserModel.updateOne({ uid }, { $inc: { walletBalance: Math.abs(amount) } });
  } else if (type === "withdraw") {
    const updated = await UserModel.findOneAndUpdate(
      { uid, walletBalance: { $gte: Math.abs(amount) } },
      { $inc: { walletBalance: -Math.abs(amount) } },
      { new: true },
    );
    if (!updated) {
      throw new Error("INSUFFICIENT_WALLET_BALANCE");
    }
  } else {
    throw new Error("NOT_APPROVABLE");
  }

  doc.set("status", "approved");
  doc.set("reviewedBy", reviewerUid);
  doc.set("reviewedAt", new Date());
  await doc.save();
  return toTransaction(doc.toObject());
}

export async function rejectWalletRequest(
  id: string,
  reviewerUid: string,
): Promise<any> {
  const doc = await WalletTransactionModel.findOne({ id });
  if (!doc) throw new Error("WALLET_REQUEST_NOT_FOUND");
  if (doc.get("status") !== "pending") {
    throw new Error("WALLET_REQUEST_ALREADY_PROCESSED");
  }

  doc.set("status", "rejected");
  doc.set("reviewedBy", reviewerUid);
  doc.set("reviewedAt", new Date());
  await doc.save();
  return toTransaction(doc.toObject());
}

export async function creditPrize(
  uid: string,
  payload: { amount: number; description?: string; tournamentId?: string },
): Promise<any> {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  const user = await UserModel.findOne({ uid });
  if (!user) throw new Error("USER_NOT_FOUND");

  const doc = await WalletTransactionModel.create({
    id: makeId(),
    uid,
    type: "prize",
    amount,
    status: "approved",
    description: payload.description?.trim() || "Prize reward",
    tournamentId: payload.tournamentId || undefined,
  });

  await UserModel.updateOne({ uid }, { $inc: { walletBalance: amount } });

  return toTransaction(doc.toObject());
}

export async function deductEntryFee(
  uid: string,
  amount: number,
  tournamentId: string,
  registrationId: string,
  description: string,
): Promise<void> {
  const updated = await UserModel.findOneAndUpdate(
    { uid, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true },
  );
  if (!updated) {
    throw new Error("INSUFFICIENT_WALLET_BALANCE");
  }

  await WalletTransactionModel.create({
    id: makeId(),
    uid,
    type: "entryFee",
    amount: -Math.abs(amount),
    status: "approved",
    description,
    tournamentId,
    registrationId,
  });
}

export async function refundEntryFee(
  uid: string,
  amount: number,
  tournamentId: string,
  registrationId: string,
  description: string,
): Promise<void> {
  await UserModel.updateOne({ uid }, { $inc: { walletBalance: amount } });

  await WalletTransactionModel.create({
    id: makeId(),
    uid,
    type: "refund",
    amount,
    status: "approved",
    description,
    tournamentId,
    registrationId,
  });
}

export async function getAllWalletRequests(
  status?: "pending" | "approved" | "rejected",
): Promise<any[]> {
  const query: any = {
    type: { $in: ["deposit", "withdraw"] },
  };
  if (status) query.status = status;

  const docs = await WalletTransactionModel.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return docs.map(toTransaction);
}

export async function resolveRequesterNames(
  requests: any[],
): Promise<any[]> {
  const uids = Array.from(new Set(requests.map((r) => r.uid)));
  const users = await UserModel.find({ uid: { $in: uids } }).lean();
  const byUid = new Map(users.map((u) => [u.uid, u]));
  return requests.map((r) => ({
    ...r,
    requester: {
      uid: r.uid,
      inGameName: byUid.get(r.uid)?.inGameName || r.uid,
      whatsapp: byUid.get(r.uid)?.whatsapp || "",
    },
  }));
}