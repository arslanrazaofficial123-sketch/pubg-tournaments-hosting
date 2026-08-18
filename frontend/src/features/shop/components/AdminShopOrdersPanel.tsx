"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, useAlert } from "@/components/ui";
import {
  getAllShopOrders,
  updateShopOrderStatus,
  type ShopOrder,
} from "@/services/api/shop";
import { Package, Loader2, Eye, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

type Filter = "all" | "pending" | "processing" | "completed" | "failed" | "refunded";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  refunded: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export function AdminShopOrdersPanel() {
  const { showAlert, showConfirm } = useAlert();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllShopOrders(filter === "all" ? undefined : filter);
      setOrders(data.orders);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: string, status: string, note?: string) => {
    setUpdatingId(orderId);
    try {
      await updateShopOrderStatus(orderId, status, note);
      showAlert(`Order marked as ${status}`, "success");
      loadOrders();
    } catch (err: any) {
      showAlert(err.message || "Failed to update order", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleComplete = (orderId: string) => {
    showConfirm("Mark this order as completed?", () =>
      handleStatusUpdate(orderId, "completed", "UC top-up completed")
    );
  };

  const handleFail = (orderId: string) => {
    showConfirm("Mark this order as failed?", () =>
      handleStatusUpdate(orderId, "failed", "Payment verification failed")
    );
  };

  const handleProcessing = (orderId: string) => {
    handleStatusUpdate(orderId, "processing");
  };

  const filterCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const allOrders = orders;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-bold text-text-primary">Shop Orders</h3>
        </div>
        <Button variant="secondary" onClick={loadOrders} disabled={loading} className="text-xs px-3 py-1.5">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "processing", "completed", "failed", "refunded"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              filter === f
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-bg-primary/40 text-text-primary/60 hover:border-accent/40"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : allOrders.length === 0 ? (
        <div className="text-center py-12 text-text-primary/50">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-border bg-bg-primary/50 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{order.packageLabel}</p>
                    <p className="text-xs text-text-primary/50 truncate">{order.inGameName} • UID: {order.pubgUid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-accent">{order.price.toLocaleString()} PKR</p>
                    <p className="text-[10px] text-text-primary/40">{order.paymentMethod}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[order.status] || "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
                    {order.status}
                  </span>
                  <Eye className="h-4 w-4 text-text-primary/30" />
                </div>
              </div>

              {expandedId === order.id && (
                <div className="border-t border-border p-4 space-y-3 bg-white/[0.01]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-text-primary/50">Order ID</span>
                      <p className="font-mono font-bold text-text-primary">{order.id}</p>
                    </div>
                    <div>
                      <span className="text-text-primary/50">Package</span>
                      <p className="font-bold text-text-primary">{order.ucAmount} UC</p>
                    </div>
                    <div>
                      <span className="text-text-primary/50">Amount</span>
                      <p className="font-bold text-accent">{order.price.toLocaleString()} PKR</p>
                    </div>
                    <div>
                      <span className="text-text-primary/50">Payment</span>
                      <p className="font-bold text-text-primary capitalize">{order.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-text-primary/50">PUBG UID</span>
                      <p className="font-bold text-text-primary">{order.pubgUid}</p>
                    </div>
                    <div>
                      <span className="text-text-primary/50">In-Game Name</span>
                      <p className="font-bold text-text-primary">{order.inGameName}</p>
                    </div>
                    {order.email && (
                      <div>
                        <span className="text-text-primary/50">Email</span>
                        <p className="font-bold text-text-primary">{order.email}</p>
                      </div>
                    )}
                    {order.transactionId && (
                      <div>
                        <span className="text-text-primary/50">Transaction ID</span>
                        <p className="font-mono font-bold text-text-primary">{order.transactionId}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-text-primary/50">Created</span>
                      <p className="font-bold text-text-primary">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  {order.receiptUrl && (
                    <div>
                      <span className="text-xs text-text-primary/50">Receipt:</span>
                      <div className="mt-1 h-32 w-48 overflow-hidden rounded border border-border">
                        <img src={order.receiptUrl} alt="Receipt" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  )}

                  {order.adminNote && (
                    <div className="text-xs text-text-primary/50">
                      <span>Admin Note: </span>
                      <span className="text-text-primary/70">{order.adminNote}</span>
                    </div>
                  )}

                  {order.status === "pending" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => handleProcessing(order.id)}
                        disabled={updatingId === order.id}
                        className="text-xs"
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        Processing
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleComplete(order.id)}
                        disabled={updatingId === order.id}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleFail(order.id)}
                        disabled={updatingId === order.id}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Fail
                      </Button>
                    </div>
                  )}

                  {order.status === "processing" && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleComplete(order.id)}
                        disabled={updatingId === order.id}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleFail(order.id)}
                        disabled={updatingId === order.id}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Fail
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
