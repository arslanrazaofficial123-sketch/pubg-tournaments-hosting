"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Package, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui";
import { getMyShopOrders, type ShopOrder } from "@/services/api/shop";
import { isLoggedIn } from "@/lib/auth";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-amber-600/20 text-amber-400", icon: <Clock className="h-3.5 w-3.5" /> },
  processing: { label: "Processing", color: "bg-blue-600/20 text-blue-400", icon: <Package className="h-3.5 w-3.5" /> },
  completed: { label: "Completed", color: "bg-emerald-600/20 text-emerald-400", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  failed: { label: "Failed", color: "bg-red-600/20 text-red-400", icon: <XCircle className="h-3.5 w-3.5" /> },
  refunded: { label: "Refunded", color: "bg-purple-600/20 text-purple-400", icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

function OrderCard({ order }: { order: ShopOrder }) {
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = new Date(order.createdAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border border-border bg-bg-primary/50 p-4 transition-colors hover:border-accent/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary">{order.packageLabel}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-sm text-text-primary/60">
            UID: {order.pubgUid} &middot; {order.inGameName}
          </p>
          {order.transactionId && (
            <p className="text-xs text-text-primary/40">
              Txn: {order.transactionId}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 sm:text-right">
          <div>
            <p className="font-bold text-accent">{order.price.toLocaleString()} PKR</p>
            <p className="text-xs text-text-primary/40">{order.ucAmount.toLocaleString()} UC</p>
          </div>
          <div className="text-xs text-text-primary/40">
            <p>{date}</p>
            <p>{time}</p>
          </div>
        </div>
      </div>
      {order.adminNote && (
        <div className="mt-3 rounded-lg bg-bg-secondary p-2 text-xs text-text-primary/50">
          <span className="font-semibold text-text-primary/70">Admin note:</span> {order.adminNote}
        </div>
      )}
    </div>
  );
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/shop");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    async function loadOrders() {
      try {
        const { orders } = await getMyShopOrders();
        setOrders(orders);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [authChecked]);

  if (!authChecked) return null;

  return (
    <PageShell showHelpFab={false}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Order History</h1>
          <p className="mt-3 text-base text-text-primary/60">
            View all your past UC purchases and their status.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-primary/50 p-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-text-primary/20" />
            <h3 className="mb-2 text-lg font-bold text-text-primary">No orders yet</h3>
            <p className="mb-6 text-sm text-text-primary/50">
              You haven&apos;t placed any orders. Browse our UC packages to get started.
            </p>
            <Link href="/shop">
              <Button variant="primary">Browse Shop</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
