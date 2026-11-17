"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Input, useAlert } from "@/components/ui";
import {
  fetchAdminWalletRequests,
  approveWalletRequest,
  rejectWalletRequest,
  creditPrize,
  type AdminWalletRequest,
  type WalletTransactionStatus,
} from "@/services/api/wallet";
import { ArrowDownToLine, ArrowUpFromLine, Eye, Loader2, Trophy } from "lucide-react";

type Filter = "pending" | "approved" | "rejected" | "all";

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

export function AdminWalletPanel() {
  const { showAlert, showConfirm } = useAlert();
  const [requests, setRequests] = useState<AdminWalletRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  // Credit prize form
  const [creditUid, setCreditUid] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [isCrediting, setIsCrediting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = filter === "all" ? undefined : (filter as WalletTransactionStatus);
      const data = await fetchAdminWalletRequests(status);
      setRequests(data);
    } catch (err: any) {
      showAlert(err?.message || "Failed to load wallet requests.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [filter, showAlert]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (req: AdminWalletRequest) => {
    setActingId(req.id);
    try {
      await approveWalletRequest(req.id);
      showAlert(
        req.type === "deposit"
          ? `Deposit of ${Math.abs(req.amount).toLocaleString()} PKR credited to ${req.requester.inGameName}.`
          : `Withdrawal of ${Math.abs(req.amount).toLocaleString()} PKR approved for ${req.requester.inGameName}.`,
        "success",
      );
      load();
    } catch (err: any) {
      showAlert(err?.message || "Failed to approve request.", "error");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = (req: AdminWalletRequest) => {
    showConfirm(
      `Reject this ${req.type} of ${Math.abs(req.amount).toLocaleString()} PKR from ${req.requester.inGameName}?`,
      async () => {
        setActingId(req.id);
        try {
          await rejectWalletRequest(req.id);
          showAlert("Request rejected.", "info");
          load();
        } catch (err: any) {
          showAlert(err?.message || "Failed to reject request.", "error");
        } finally {
          setActingId(null);
        }
      },
    );
  };

  const handleCreditPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert("Please enter a valid amount greater than 0.", "error");
      return;
    }
    if (!creditUid.trim()) {
      showAlert("Player UID is required.", "error");
      return;
    }
    setIsCrediting(true);
    try {
      await creditPrize({
        uid: creditUid.trim(),
        amount,
        description: creditDescription.trim() || undefined,
      });
      showAlert(`${amount.toLocaleString()} PKR credited to wallet of ${creditUid.trim()}.`, "success");
      setCreditUid("");
      setCreditAmount("");
      setCreditDescription("");
    } catch (err: any) {
      showAlert(err?.message || "Failed to credit prize.", "error");
    } finally {
      setIsCrediting(false);
    }
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      {/* Credit Prize */}
      <div className="admin-card p-5">
        <h3 className="font-bold admin-section-title flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          Credit Prize to Wallet
        </h3>
        <p className="text-xs text-text-primary/40 mt-1">
          Add prize money directly to a winner's wallet balance.
        </p>
        <form onSubmit={handleCreditPrize} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Player UID *"
            value={creditUid}
            onChange={(e) => setCreditUid(e.target.value)}
            placeholder="e.g. 58392019"
            required
          />
          <Input
            label="Amount (PKR) *"
            type="number"
            min="1"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="e.g. 2500"
            required
          />
          <Input
            label="Description"
            value={creditDescription}
            onChange={(e) => setCreditDescription(e.target.value)}
            placeholder="e.g. 1st place prize"
          />
          <div className="flex items-end">
            <Button type="submit" disabled={isCrediting} className="w-full">
              {isCrediting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Crediting...
                </>
              ) : (
                "Credit Prize"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Requests */}
      <div className="admin-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold admin-section-title">Wallet Requests</h3>
          <div className="flex gap-1.5 rounded-lg border border-border bg-bg-primary/60 p-1">
            {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === f
                    ? "bg-accent text-white shadow"
                    : "text-text-primary/60 hover:text-text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-text-primary/40">
            No {filter === "all" ? "" : filter + " "}wallet requests.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-border bg-bg-primary/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                        req.type === "deposit"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/30 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {req.type === "deposit" ? (
                        <ArrowDownToLine className="h-5 w-5" />
                      ) : (
                        <ArrowUpFromLine className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          {req.requester.inGameName || req.requester.uid}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            req.type === "deposit"
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                              : "border-red-500/30 bg-red-500/15 text-red-400"
                          }`}
                        >
                          {req.type}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            req.status === "pending"
                              ? "border-amber-500/30 bg-amber-500/15 text-amber-400"
                              : req.status === "approved"
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                              : "border-red-500/30 bg-red-500/15 text-red-400"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-text-primary/45">
                        UID {req.requester.uid} · {formatDate(req.createdAt)}
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-text-primary/60">
                        {req.externalTransactionId && (
                          <div>Txn ID: <span className="font-mono">{req.externalTransactionId}</span></div>
                        )}
                        {req.paymentMethod && (
                          <div>Method: {req.paymentMethod} · {req.accountName} · {req.accountNumber}</div>
                        )}
                        {req.note && <div>Note: {req.note}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-lg font-black ${
                        req.type === "deposit" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {req.type === "deposit" ? "+" : "-"}
                      {Math.abs(req.amount).toLocaleString()} PKR
                    </span>
                    <div className="flex items-center gap-2">
                      {req.screenshotUrl && (
                        <a
                          href={req.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-[10px] font-bold text-accent hover:border-accent/40 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Proof
                        </a>
                      )}
                      {req.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(req)}
                            disabled={actingId === req.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {actingId === req.id ? "..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req)}
                            disabled={actingId === req.id}
                            className="rounded-lg bg-red-600/90 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}