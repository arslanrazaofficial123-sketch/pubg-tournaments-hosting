import { ShopOrderModel, type ShopOrder } from "../models/ShopOrder.js";

export async function createShopOrder(data: {
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
}): Promise<ShopOrder> {
  const id = "so-" + Math.random().toString(36).substring(2, 11);
  const doc = await ShopOrderModel.create({
    id,
    ...data,
  });
  return doc.toObject();
}

export async function getShopOrderById(id: string): Promise<ShopOrder | null> {
  const doc = await ShopOrderModel.findOne({ id }).lean();
  return doc ? (doc as unknown as ShopOrder) : null;
}

export async function getShopOrderByTransactionId(
  transactionId: string,
): Promise<ShopOrder | null> {
  const doc = await ShopOrderModel.findOne({ transactionId }).lean();
  return doc ? (doc as unknown as ShopOrder) : null;
}

export async function getShopOrdersByUid(uid: string): Promise<ShopOrder[]> {
  const docs = await ShopOrderModel.find({ pubgUid: uid })
    .sort({ createdAt: -1 })
    .lean();
  return docs as unknown as ShopOrder[];
}

export async function getAllShopOrders(
  status?: string,
): Promise<ShopOrder[]> {
  const query = status ? { status } : {};
  const docs = await ShopOrderModel.find(query).sort({ createdAt: -1 }).lean();
  return docs as unknown as ShopOrder[];
}

export async function updateShopOrderStatus(
  id: string,
  status: ShopOrder["status"],
  adminNote?: string,
  processedBy?: string,
): Promise<ShopOrder | null> {
  const update: Record<string, unknown> = { status };
  if (adminNote !== undefined) update.adminNote = adminNote;
  if (processedBy !== undefined) update.processedBy = processedBy;
  if (status === "completed" || status === "processing") {
    update.processedAt = new Date();
  }
  const doc = await ShopOrderModel.findOneAndUpdate({ id }, update, {
    new: true,
  }).lean();
  return doc ? (doc as unknown as ShopOrder) : null;
}

export async function markShopOrderWalletDeducted(
  id: string,
): Promise<ShopOrder | null> {
  const doc = await ShopOrderModel.findOneAndUpdate(
    { id },
    { walletDeducted: true, status: "completed", processedAt: new Date() },
    { new: true },
  ).lean();
  return doc ? (doc as unknown as ShopOrder) : null;
}