"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Shield, User, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentPage } from "@/components/layout/ContentPage";
import { Button, Input } from "@/components/ui";
import { useAlert } from "@/components/ui/AlertProvider";
import { getSessionUser, isLoggedIn } from "@/lib/auth";
import { getWalletSummary } from "@/services/api/wallet";
import { createShopOrder } from "@/services/api/shop";

const packages = [
  { id: 1, uc: 60, label: "60 UC", price: 240, originalPrice: 250 },
  { id: 2, uc: 325, label: "325 UC", price: 1230, originalPrice: 1250 },
  { id: 3, uc: 660, label: "660 UC", price: 2450, originalPrice: 2500 },
  { id: 4, uc: 1800, label: "1800 UC", price: 6100, originalPrice: 6250 },
  { id: 5, uc: 3850, label: "3850 UC", price: 12150, originalPrice: 12500 },
  { id: 6, uc: 8100, label: "8100 UC", price: 24300, originalPrice: 25000 },
  { id: 7, uc: 16200, label: "16200 UC", price: 48500, originalPrice: 50000 },
  { id: 8, uc: 24300, label: "24300 UC", price: 72900, originalPrice: 75000 },
  { id: 9, uc: 32400, label: "32400 UC", price: 97000, originalPrice: 100000 },
];

function findPackage(id: number) {
  return packages.find((p) => p.id === id);
}

interface CheckoutClientProps {
  packageId: number;
}

export function CheckoutClient({ packageId }: CheckoutClientProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const pkg = findPackage(packageId) || packages[0];

  const [step, setStep] = useState<"details" | "payment" | "success">("details");
  const [isLoggedInUser, setIsLoggedInUser] = useState(false);
  const [userUid, setUserUid] = useState("");
  const [userInGameName, setUserInGameName] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"manual" | "wallet">("manual");
  const [transactionId, setTransactionId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWalletOption, setShowWalletOption] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const loggedIn = isLoggedIn();
    setIsLoggedInUser(loggedIn);
    if (loggedIn) {
      const user = getSessionUser();
      if (user?.uid) setUserUid(user.uid);
      if (user?.inGameName) setUserInGameName(user.inGameName);
      getWalletSummary()
        .then((s) => {
          setWalletBalance(s.balance);
          if (s.balance >= pkg.price) setShowWalletOption(true);
        })
        .catch(() => {});
    }
  }, [pkg.price]);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setReceiptPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userUid.trim()) {
      showAlert("PUBG UID is required", "error");
      return;
    }
    if (!userInGameName.trim()) {
      showAlert("In-Game Name is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (paymentMethod === "wallet") {
        if (!showWalletOption) {
          showAlert("Insufficient wallet balance for this package", "error");
          setIsSubmitting(false);
          return;
        }
        const result = await createShopOrder({
          packageId: pkg.id,
          packageLabel: pkg.label,
          ucAmount: pkg.uc,
          price: pkg.price,
          paymentMethod: "wallet",
          pubgUid: userUid.trim(),
          inGameName: userInGameName.trim(),
        });
        setOrderId(result.order.id);
        showAlert("Wallet payment processed! UC will be topped up shortly.", "success");
        setStep("success");
        return;
      }

      if (!transactionId.trim()) {
        showAlert("Transaction ID is required", "error");
        setIsSubmitting(false);
        return;
      }
      if (!receiptFile) {
        showAlert("Please upload payment receipt", "error");
        setIsSubmitting(false);
        return;
      }

      const receiptBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(receiptFile);
      });

      const result = await createShopOrder({
        packageId: pkg.id,
        packageLabel: pkg.label,
        ucAmount: pkg.uc,
        price: pkg.price,
        paymentMethod: "manual",
        pubgUid: userUid.trim(),
        inGameName: userInGameName.trim(),
        transactionId: transactionId.trim(),
        receiptUrl: receiptBase64,
        email: isLoggedInUser ? undefined : undefined,
      });
      setOrderId(result.order.id);
      showAlert("Order placed! Our team will process your UC top-up within 30 minutes.", "success");
      setStep("success");
    } catch (err: any) {
      showAlert(err.message || "Order failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const discount = Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100);

  if (!pkg) {
    return (
      <ContentPage heading="Package Not Found" description="The requested package does not exist.">
        <Button variant="secondary" onClick={() => router.push("/shop")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Button>
      </ContentPage>
    );
  }

  return (
    <ContentPage
      heading={`Checkout: ${pkg.label}`}
      description={`Complete your purchase of ${pkg.uc} UC for ${pkg.price.toLocaleString()} PKR`}
    >
      {/* Step indicator - compact on mobile */}
      <div className="mb-6 flex items-center justify-center gap-1.5 sm:gap-2 sm:mb-8">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm", step === "details" ? "bg-accent text-white" : step > "details" ? "bg-emerald-600 text-white" : "border border-border bg-bg-primary text-text-primary/50")}>
          {step === "details" ? "1" : <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
        </div>
        <div className={cn("flex-1 h-1 bg-border hidden sm:block", step > "details" && "!bg-emerald-600")} />
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm", step === "payment" ? "bg-accent text-white" : step > "payment" ? "bg-emerald-600 text-white" : "border border-border bg-bg-primary text-text-primary/50")}>
          {step === "payment" ? "2" : step > "payment" ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : "2"}
        </div>
        <div className={cn("flex-1 h-1 bg-border hidden sm:block", step > "payment" && "!bg-emerald-600")} />
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-10 sm:w-10 sm:text-sm", step === "success" ? "bg-emerald-600 text-white" : "border border-border bg-bg-primary text-text-primary/50")}>
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      {/* Mobile step labels - always visible */}
      <div className="mb-6 flex justify-center gap-4 text-[11px] text-text-primary/50 sm:mb-8 sm:text-xs">
        <span className={cn(step === "details" && "text-accent font-bold")}>Details</span>
        <span className={cn(step === "payment" && "text-accent font-bold")}>Payment</span>
        <span className={cn(step === "success" && "text-emerald-600 font-bold")}>Done</span>
      </div>

      {/* Package summary card */}
      <div className="mb-6 rounded-xl border border-border bg-bg-primary/50 p-3 sm:mb-8 sm:flex sm:items-center sm:gap-6 sm:p-4">
        <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 sm:mx-0 sm:h-24 sm:w-24">
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-accent/50 sm:text-3xl">
            {pkg.uc} UC
          </div>
          {discount > 0 && (
            <span className="absolute top-1.5 left-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          )}
        </div>
        <div className="mt-3 flex-1 text-center sm:mt-0 sm:text-left">
          <h3 className="text-lg font-bold text-text-primary sm:text-xl">{pkg.label}</h3>
          <p className="mt-0.5 text-xs text-text-primary/50 sm:text-sm">Manual top-up package</p>
          <div className="mt-2 flex items-baseline justify-center gap-2 sm:justify-start">
            <span className="text-xl font-black text-accent sm:text-2xl">{pkg.price.toLocaleString()} PKR</span>
            <span className="text-xs line-through text-text-primary/40 sm:text-sm">{pkg.originalPrice.toLocaleString()} PKR</span>
          </div>
        </div>
      </div>

      {step === "details" && (
        <form onSubmit={(e) => { e.preventDefault(); setStep("payment"); }}>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-xl border border-border bg-bg-primary/50 p-3 sm:p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary sm:mb-4">
                <User className="h-4 w-4 text-accent" />
                Account Details
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <Input
                  label="PUBG UID *"
                  value={userUid}
                  onChange={(e) => setUserUid(e.target.value)}
                  placeholder="Enter your PUBG UID"
                  required
                  inputMode="numeric"
                />
                <Input
                  label="In-Game Name *"
                  value={userInGameName}
                  onChange={(e) => setUserInGameName(e.target.value)}
                  placeholder="Enter your in-game name"
                  required
                />
              </div>
              {isLoggedInUser && (
                <p className="mt-2 text-xs text-emerald-400 sm:mt-3">
                  ✓ Logged in as {userInGameName || userUid}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full py-3 text-base sm:text-lg" variant="primary">
              Continue to Payment <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </Button>
          </div>
        </form>
      )}

      {step === "payment" && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-xl border border-border bg-bg-primary/50 p-3 sm:p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary sm:mb-4">
                <CreditCard className="h-4 w-4 text-accent" />
                Payment Method
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("manual")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 sm:p-3 transition-all min-h-[48px]",
                    paymentMethod === "manual"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-bg-primary/50 hover:border-accent/40"
                  )}
                >
                  <CreditCard className="h-5 w-5 text-accent shrink-0" />
                  <span className="font-medium text-sm text-text-primary sm:text-base">Manual Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  disabled={!showWalletOption}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 sm:p-3 transition-all min-h-[48px]",
                    paymentMethod === "wallet"
                      ? "border-accent bg-accent/10"
                      : showWalletOption
                      ? "border-border bg-bg-primary/50 hover:border-accent/40"
                      : "border-border/50 bg-bg-primary/30 opacity-60 cursor-not-allowed"
                  )}
                >
                  <Shield className="h-5 w-5 text-accent shrink-0" />
                  <span className="font-medium text-sm text-text-primary sm:text-base">
                    Wallet
                    {showWalletOption && walletBalance !== null && (
                      <span className="ml-1 text-xs text-accent sm:text-sm">({walletBalance.toLocaleString()} PKR)</span>
                    )}
                    {!showWalletOption && <span className="ml-1 text-xs text-red-400">(Insufficient)</span>}
                  </span>
                </button>
              </div>
            </div>

            {paymentMethod === "manual" && (
              <div className="space-y-3 sm:space-y-4">
                <div className="rounded-xl border border-border bg-bg-primary/50 p-3 sm:p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary sm:mb-4">
                    <CreditCard className="h-4 w-4 text-accent" />
                    Payment Details
                  </h4>
                  <div className="space-y-2.5 sm:space-y-3">
                    <p className="text-xs text-text-primary/70 sm:text-sm">
                      <strong>Official Accounts:</strong>
                    </p>
                    <div className="grid grid-cols-1 gap-1 rounded-lg bg-bg-secondary/50 p-2.5 text-xs sm:ml-4 sm:grid-cols-3 sm:gap-3 sm:p-3 sm:text-sm">
                      <div className="rounded-md bg-bg-primary/60 p-2 text-center">
                        <span className="text-text-primary/50">JazzCash</span>
                        <p className="font-mono font-semibold text-accent">03070830168</p>
                      </div>
                      <div className="rounded-md bg-bg-primary/60 p-2 text-center">
                        <span className="text-text-primary/50">EasyPaisa</span>
                        <p className="font-mono font-semibold text-accent">03097955177</p>
                      </div>
                      <div className="rounded-md bg-bg-primary/60 p-2 text-center">
                        <span className="text-text-primary/50">Bank</span>
                        <p className="font-mono font-semibold text-accent">09851009475285</p>
                      </div>
                    </div>
                    <Input
                      label="Transaction ID / Reference *"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TXN10293847"
                      required
                    />
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-text-primary/90 sm:text-sm">
                        Upload Payment Receipt *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className={cn(
                          "w-full rounded-md border p-2.5 text-xs sm:p-2 sm:text-sm",
                          receiptFile ? "border-emerald-600" : "border-border bg-bg-primary/60"
                        )}
                        required
                      />
                      {receiptPreview && (
                        <div className="h-24 w-36 overflow-hidden rounded border border-border bg-white/5 sm:h-32 sm:w-48">
                          <img src={receiptPreview} alt="Receipt preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "wallet" && showWalletOption && (
              <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 sm:p-4">
                <div className="flex items-center gap-2.5 text-emerald-400 sm:gap-3">
                  <Shield className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm sm:text-base">Wallet Payment</p>
                    <p className="text-xs sm:text-sm">
                      {pkg.price.toLocaleString()} PKR will be deducted from your wallet balance ({walletBalance?.toLocaleString()} PKR)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "wallet" && !showWalletOption && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 sm:p-4 sm:text-sm">
                <p>Insufficient wallet balance. Please add funds to your wallet or choose Manual Payment.</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full py-3.5 text-base min-h-[48px] sm:text-lg" variant="primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Place Order"
              )}
            </Button>
          </div>
        </form>
      )}

      {step === "success" && (
        <div className="space-y-4 text-center sm:space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/10 sm:h-20 sm:w-20">
            <CheckCircle className="h-10 w-10 text-emerald-600 sm:h-12 sm:w-12" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-text-primary sm:text-2xl">Order Placed Successfully!</h3>
            <p className="mt-1.5 text-sm text-text-primary/70 sm:mt-2">
              Your {pkg.label} order has been received. Our team will process the UC top-up to UID <strong>{userUid}</strong> within 30 minutes.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-primary/50 p-3 text-xs text-text-primary/70 sm:p-4 sm:text-sm">
            <p><strong>Order ID:</strong> {orderId || `UC-${Date.now().toString(36).toUpperCase()}`}</p>
            <p><strong>Amount:</strong> {pkg.price.toLocaleString()} PKR</p>
            <p><strong>Payment:</strong> {paymentMethod === "wallet" ? "Wallet Balance" : "Manual (awaiting verification)"}</p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
            <Button variant="secondary" onClick={() => router.push("/shop")} className="min-h-[44px]">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
            <Button onClick={() => router.push("/wallet")} className="min-h-[44px]">
              View Wallet
            </Button>
          </div>
        </div>
      )}
    </ContentPage>
  );
}