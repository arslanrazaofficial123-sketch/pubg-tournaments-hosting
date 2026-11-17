"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button, Input, useAlert } from "@/components/ui";
import { getSessionUser, isLoggedIn as checkLoggedIn } from "@/lib/auth";
import {
  getWalletSummary,
  createDepositRequest,
  createWithdrawRequest,
  type WalletSummary,
  type WalletTransaction,
} from "@/services/api/wallet";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trophy,
  Receipt,
  RotateCcw,
  CreditCard,
  Loader2,
  Eye,
} from "lucide-react";

const PAYMENT_METHODS = ["Easypaisa", "JazzCash", "Bank Transfer", "Other"];

function formatAmount(amount: number): string {
  return `${amount >= 0 ? "+" : ""}${amount.toLocaleString()} PKR`;
}

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

function TxBadge({ tx }: { tx: WalletTransaction }) {
  const typeColors: Record<string, string> = {
    deposit: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    withdraw: "bg-red-500/15 text-red-400 border-red-500/30",
    entryFee: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    prize: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    refund: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${typeColors[tx.type] ?? "bg-white/5 text-text-primary/60 border-border"}`}>
        {tx.type}
      </span>
      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[tx.status] ?? "bg-white/5 text-text-primary/60 border-border"}`}>
        {tx.status}
      </span>
    </div>
  );
}

function BreakdownCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/45">
          {label}
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 ${accent}`}>
          {icon}
        </span>
      </div>
      <div className={`mt-2 text-lg font-black ${accent}`}>
        {value.toLocaleString()} <span className="text-[10px] font-bold text-text-primary/40">PKR</span>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<"deposit" | "withdraw">("deposit");

  // Deposit form
  const [depositAmount, setDepositAmount] = useState("");
  const [externalTxnId, setExternalTxnId] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositScreenshot, setDepositScreenshot] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("Easypaisa");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getWalletSummary();
      setSummary(data);
    } catch (err: any) {
      showAlert(err?.message || "Failed to load wallet.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!checkLoggedIn() || !sessionUser) {
      router.push("/login");
      return;
    }
    setIsAuthorized(true);
    loadSummary();
  }, [router, loadSummary]);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setDepositScreenshot(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert("Please enter a valid amount greater than 0.", "error");
      return;
    }
    if (!externalTxnId.trim()) {
      showAlert("Transaction ID is required.", "error");
      return;
    }
    setIsDepositing(true);
    try {
      await createDepositRequest({
        amount,
        externalTransactionId: externalTxnId.trim(),
        note: depositNote.trim() || undefined,
        screenshot: depositScreenshot || undefined,
      });
      showAlert("Deposit request submitted. Admin will verify and credit your wallet.", "success");
      setDepositAmount("");
      setExternalTxnId("");
      setDepositNote("");
      setDepositScreenshot("");
      loadSummary();
    } catch (err: any) {
      showAlert(err?.message || "Failed to submit deposit.", "error");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert("Please enter a valid amount greater than 0.", "error");
      return;
    }
    if (!accountName.trim() || !accountNumber.trim()) {
      showAlert("Account name and number are required.", "error");
      return;
    }
    setIsWithdrawing(true);
    try {
      await createWithdrawRequest({
        amount,
        paymentMethod: withdrawMethod,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        note: withdrawNote.trim() || undefined,
      });
      showAlert("Withdrawal request submitted. You'll be paid after admin approval.", "success");
      setWithdrawAmount("");
      setAccountName("");
      setAccountNumber("");
      setWithdrawNote("");
      loadSummary();
    } catch (err: any) {
      showAlert(err?.message || "Failed to submit withdrawal.", "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  const balance = summary?.balance ?? 0;
  const breakdown = summary?.breakdown ?? { prizeRewards: 0, entryFees: 0, refunds: 0, withdrawals: 0 };
  const requests = summary?.requests ?? [];
  const transactions = summary?.transactions ?? [];

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-text-primary sm:text-2xl">
              My Wallet
            </h1>
            <p className="text-xs text-text-primary/45">
              Entry fees are auto-deducted when your balance covers them.
            </p>
          </div>
        </div>

        {/* Balance + breakdown */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/15 via-bg-secondary to-bg-secondary p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">
              Available Balance
            </span>
            <div className="mt-2 text-3xl font-black text-text-primary sm:text-4xl">
              {balance.toLocaleString()}
              <span className="ml-1.5 text-xs font-bold text-text-primary/40">PKR</span>
            </div>
            <p className="mt-2 text-[11px] text-text-primary/40">
              Prize rewards, refunds and deposits are credited here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <BreakdownCard
              label="Prize Rewards"
              value={breakdown.prizeRewards}
              icon={<Trophy className="h-4 w-4" />}
              accent="text-sky-400"
            />
            <BreakdownCard
              label="Entry Fees"
              value={breakdown.entryFees}
              icon={<Receipt className="h-4 w-4" />}
              accent="text-amber-400"
            />
            <BreakdownCard
              label="Refunds"
              value={breakdown.refunds}
              icon={<RotateCcw className="h-4 w-4" />}
              accent="text-purple-400"
            />
            <BreakdownCard
              label="Withdrawals"
              value={breakdown.withdrawals}
              icon={<CreditCard className="h-4 w-4" />}
              accent="text-red-400"
            />
          </div>
        </div>

        {/* Deposit / Withdraw forms */}
        <div className="mt-6">
          <div className="flex gap-2 rounded-xl border border-border bg-bg-secondary/60 p-1.5 w-fit">
            <button
              type="button"
              onClick={() => setActiveForm("deposit")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeForm === "deposit"
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "text-text-primary/60 hover:text-text-primary"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setActiveForm("withdraw")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeForm === "withdraw"
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "text-text-primary/60 hover:text-text-primary"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeForm === "deposit" ? (
              <form
                onSubmit={handleDeposit}
                className="rounded-2xl border border-border bg-bg-secondary/40 p-5 space-y-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Add Money
                </h3>

                <div className="rounded-xl border border-accent/25 bg-accent/5 p-3.5 space-y-1.5 text-xs">
                  <p className="text-text-primary/60">
                    Send money to one of our official accounts, then submit your details:
                  </p>
                  <div className="space-y-1 pt-1 font-medium">
                    <div className="flex justify-between gap-2">
                      <span className="text-text-primary/50">JazzCash / EasyPaisa:</span>
                      <span className="font-mono font-bold text-text-primary">03070830168 (Arslan Raza)</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-text-primary/50">SadaPay:</span>
                      <span className="font-mono font-bold text-text-primary">03097955177 (Arslan Raza)</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-text-primary/50">Alfalah Bank:</span>
                      <span className="font-mono font-bold text-text-primary">09851009475285 (Arslan Raza)</span>
                    </div>
                  </div>
                </div>

                <Input
                  label="Amount (PKR) *"
                  type="number"
                  min="1"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 500"
                  required
                />
                <Input
                  label="Transaction ID / Reference Number *"
                  value={externalTxnId}
                  onChange={(e) => setExternalTxnId(e.target.value)}
                  placeholder="e.g. TXN10293847"
                  required
                />
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-medium text-text-primary/90">
                    Payment Screenshot
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="w-full rounded-md border border-border bg-bg-primary/60 px-3 py-2 text-xs sm:text-sm text-text-primary focus:border-accent focus:outline-none transition-colors file:mr-4 file:rounded file:border-0 file:bg-accent/15 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-accent hover:file:bg-accent/25 file:cursor-pointer"
                  />
                  {depositScreenshot && (
                    <a
                      href={depositScreenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent-hover"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View screenshot
                    </a>
                  )}
                </div>
                <Input
                  label="Note (optional)"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  placeholder="Anything we should know"
                />
                <Button type="submit" disabled={isDepositing} className="w-full">
                  {isDepositing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Deposit Request"
                  )}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={handleWithdraw}
                className="rounded-2xl border border-border bg-bg-secondary/40 p-5 space-y-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Withdraw Money
                </h3>
                <p className="text-xs text-text-primary/45">
                  Your available balance is <span className="font-bold text-accent">{balance.toLocaleString()} PKR</span>.
                  Withdrawals are processed manually after admin approval.
                </p>
                <Input
                  label="Amount (PKR) *"
                  type="number"
                  min="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 300"
                  required
                />
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-medium text-text-primary/90">
                    Payment Method *
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    className="w-full rounded-md border border-border bg-bg-primary/60 px-3 py-2.5 text-xs sm:text-sm text-text-primary focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Account Name *"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Arslan Raza"
                  required
                />
                <Input
                  label="Account Number / Wallet ID *"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 03001234567"
                  required
                />
                <Input
                  label="Note (optional)"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="Anything we should know"
                />
                <Button type="submit" disabled={isWithdrawing} className="w-full">
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Withdrawal Request"
                  )}
                </Button>
              </form>
            )}

            {/* Requests */}
            <div className="rounded-2xl border border-border bg-bg-secondary/40 p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-primary">
                My Requests
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : requests.length === 0 ? (
                <p className="py-8 text-center text-xs text-text-primary/40">
                  No deposit or withdrawal requests yet.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 modal-scrollbar">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-lg border border-border bg-bg-primary/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-text-primary">
                          {req.type === "deposit" ? "Deposit" : "Withdrawal"}
                        </span>
                        <span className={`text-xs font-black ${req.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatAmount(req.amount)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <TxBadge tx={req} />
                        <span className="text-[10px] text-text-primary/35">{formatDate(req.createdAt)}</span>
                      </div>
                      {req.note && (
                        <p className="mt-1.5 text-[11px] text-text-primary/50">Note: {req.note}</p>
                      )}
                      {req.externalTransactionId && (
                        <p className="mt-1 text-[11px] text-text-primary/45">
                          Txn ID: <span className="font-mono">{req.externalTransactionId}</span>
                        </p>
                      )}
                      {req.screenshotUrl && (
                        <a
                          href={req.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-hover"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View proof
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transaction history */}
        <div className="mt-6 rounded-2xl border border-border bg-bg-secondary/40 p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-text-primary">
            Transaction History
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-xs text-text-primary/40">
              No transactions yet. Deposit funds or win a prize to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-primary/40">
                    <th className="pb-2 pr-3 font-bold">Time</th>
                    <th className="pb-2 pr-3 font-bold">Type</th>
                    <th className="pb-2 pr-3 font-bold">Amount</th>
                    <th className="pb-2 pr-3 font-bold">Event</th>
                    <th className="pb-2 font-bold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-text-primary/50">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-2.5 pr-3">
                        <TxBadge tx={tx} />
                      </td>
                      <td className={`py-2.5 pr-3 font-black whitespace-nowrap ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="py-2.5 pr-3 text-text-primary/70">{tx.description}</td>
                      <td className="py-2.5 text-text-primary/45">
                        {tx.externalTransactionId && (
                          <span className="mr-2 font-mono">Txn: {tx.externalTransactionId}</span>
                        )}
                        {tx.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}