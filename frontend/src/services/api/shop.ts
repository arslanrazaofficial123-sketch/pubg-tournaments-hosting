import { apiClient } from "./client";

export interface ShopOrder {
  id: string;
  packageId: number;
  packageLabel: string;
  ucAmount: number;
  price: number;
  paymentMethod: "manual" | "wallet";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  pubgUid: string;
  inGameName: string;
  email?: string;
  transactionId?: string;
  receiptUrl?: string;
  walletDeducted: boolean;
  processedBy?: string;
  processedAt?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createShopOrder(payload: {
  packageId: number;
  packageLabel: string;
  ucAmount: number;
  price: number;
  paymentMethod: "manual" | "wallet";
  pubgUid: string;
  inGameName: string;
  email?: string;
  transactionId?: string;
  receiptUrl?: string;
}): Promise<{ order: ShopOrder }> {
  return apiClient("/shop/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyShopOrders(): Promise<{ orders: ShopOrder[] }> {
  return apiClient("/shop/my-orders");
}

export async function getShopOrderById(id: string): Promise<{ order: ShopOrder }> {
  return apiClient(`/shop/orders/${id}`);
}

export async function getAllShopOrders(status?: string): Promise<{ orders: ShopOrder[] }> {
  const query = status ? `?status=${status}` : "";
  return apiClient(`/shop/admin/orders${query}`);
}

export async function updateShopOrderStatus(
  id: string,
  status: string,
  adminNote?: string,
): Promise<{ order: ShopOrder }> {
  return apiClient(`/shop/admin/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status, adminNote }),
  });
}

export async function approveWalletOrder(id: string): Promise<{ order: ShopOrder }> {
  return apiClient(`/shop/admin/orders/${id}/approve-wallet`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}
