import { apiClient } from "./client";

export interface WalletBreakdown {
  prizeRewards: number;
  entryFees: number;
  refunds: number;
  withdrawals: number;
}

export type WalletTransactionType =
  | "deposit"
  | "withdraw"
  | "entryFee"
  | "prize"
  | "refund";

export type WalletTransactionStatus = "pending" | "approved" | "rejected";

export interface WalletTransaction {
  id: string;
  uid: string;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  description: string;
  tournamentId?: string;
  registrationId?: string;
  externalTransactionId?: string;
  note?: string;
  screenshotUrl?: string;
  paymentMethod?: string;
  accountName?: string;
  accountNumber?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface WalletSummary {
  balance: number;
  breakdown: WalletBreakdown;
  requests: WalletTransaction[];
  transactions: WalletTransaction[];
}

export interface AdminWalletRequest extends WalletTransaction {
  requester: {
    uid: string;
    inGameName: string;
    whatsapp: string;
  };
}

export async function getWalletSummary(): Promise<WalletSummary> {
  return apiClient<WalletSummary>("/wallet");
}

export async function createDepositRequest(payload: {
  amount: number;
  externalTransactionId?: string;
  note?: string;
  screenshot?: string;
}): Promise<WalletTransaction> {
  return apiClient<WalletTransaction>("/wallet/deposit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createWithdrawRequest(payload: {
  amount: number;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  note?: string;
}): Promise<WalletTransaction> {
  return apiClient<WalletTransaction>("/wallet/withdraw", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminWalletRequests(
  status?: WalletTransactionStatus,
): Promise<AdminWalletRequest[]> {
  const query = status ? `?status=${status}` : "";
  return apiClient<AdminWalletRequest[]>(`/wallet/admin/requests${query}`);
}

export async function approveWalletRequest(
  id: string,
): Promise<WalletTransaction> {
  return apiClient<WalletTransaction>(`/wallet/admin/requests/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function rejectWalletRequest(
  id: string,
): Promise<WalletTransaction> {
  return apiClient<WalletTransaction>(`/wallet/admin/requests/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function creditPrize(payload: {
  uid: string;
  amount: number;
  description?: string;
  tournamentId?: string;
}): Promise<WalletTransaction> {
  return apiClient<WalletTransaction>("/wallet/admin/credit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}