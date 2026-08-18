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
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", step === "details" ? "bg-accent text-white" : step > "details" ? "bg-emerald-600 text-white" : "border border-border bg-bg-primary text-text-primary/50")}>
          {step === "details" ? "1" : <CheckCircle className="h-5 w-5" />}
        </div>
        <div className={cn("hidden flex-1 h-1 bg-border", step > "details" && "sm:flex bg-emerald-600")} />
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", step === "payment" ? "bg-accent text-white" : step > "payment" ? "bg-emerald-600 text-white" : "border border-border bg-bg-primary text-text-primary/50")}>
          {step === "payment" ? "2" : step > "payment" ? <CheckCircle className="h-5 w-5" /> : "2"}
        </div>
        <div className={cn("hidden flex-1 h-1 bg-border", step > "payment" && "sm:flex bg-emerald-600")} />
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", step === "success" ? "bg-emerald-600 text-white" : "border border-border bg-bg-primary text-text-primary/50")}>
          <CheckCircle className="h-5 w-5" />
        </div>
      </div>
      <div className="mb-8 flex justify-center gap-4 text-xs text-text-primary/50 sm:hidden">
        <span className={cn(step === "details" && "text-accent font-bold")}>Details</span>
        <span className={cn(step === "payment" && "text-accent font-bold")}>Payment</span>
        <span className={cn(step === "success" && "text-emerald-600 font-bold")}>Done</span>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-bg-primary/50 p-4 sm:flex sm:items-center sm:gap-6">
        <div className="relative h-24 w-24 shrink-0 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 overflow-hidden">
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-accent/50">
            {pkg.uc} UC
          </div>
          {discount > 0 && (
            <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              -{discount}%
            </span>
          )}
        </div>
        <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
          <h3 className="text-xl font-bold text-text-primary">{pkg.label}</h3>
          <p className="mt-1 text-sm text-text-primary/50">Manual top-up package</p>
          <div className="mt-3 flex items-baseline justify-center gap-2 sm:justify-start">
            <span className="text-2xl font-black text-accent">{pkg.price.toLocaleString()} PKR</span>
            <span className="text-sm line-through text-text-primary/40">{pkg.originalPrice.toLocaleString()} PKR</span>
          </div>
        </div>
      </div>

      {step === "details" && (
        <form onSubmit={(e) => { e.preventDefault(); setStep("payment"); }}>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-primary/50 p-4">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <User className="h-4 w-4 text-accent" />
                Account Details
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
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
                <p className="mt-3 text-xs text-emerald-400">
                  ✓ Logged in as {userInGameName || userUid}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full py-3 text-lg" variant="primary">
              Continue to Payment <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </Button>
          </div>
        </form>
      )}

      {step === "payment" && (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-bg-primary/50 p-4">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <CreditCard className="h-4 w-4 text-accent" />
                Payment Method
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("manual")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    paymentMethod === "manual"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-bg-primary/50 hover:border-accent/40"
                  )}
                >
                  <CreditCard className="h-5 w-5 text-accent shrink-0" />
                  <span className="font-medium text-text-primary">Manual Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  disabled={!showWalletOption}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    paymentMethod === "wallet"
                      ? "border-accent bg-accent/10"
                      : showWalletOption
                      ? "border-border bg-bg-primary/50 hover:border-accent/40"
                      : "border-border/50 bg-bg-primary/30 opacity-60 cursor-not-allowed"
                  )}
                >
                  <Shield className="h-5 w-5 text-accent shrink-0" />
                  <span className="font-medium text-text-primary">
                    Wallet Balance
                    {showWalletOption && walletBalance !== null && (
                      <span className="ml-1 text-sm text-accent">({walletBalance.toLocaleString()} PKR)</span>
                    )}
                    {!showWalletOption && <span className="ml-1 text-xs text-red-400">(Insufficient)</span>}
                  </span>
                </button>
              </div>
            </div>

            {paymentMethod === "manual" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-bg-primary/50 p-4">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <CreditCard className="h-4 w-4 text-accent" />
                    Payment Details
                  </h4>
                  <div className="space-y-3">
                    <p className="text-sm text-text-primary/70">
                      <strong>Official Accounts:</strong>
                    </p>
                    <ul className="ml-4 space-y-1 text-sm text-text-primary/60 list-disc">
                      <li>JazzCash: 03070830168 (Arslan Raza)</li>
                      <li>EasyPaisa: 03097955177 (Arslan Raza)</li>
                      <li>Bank: 09851009475285 (Arslan Raza)</li>
                    </ul>
                    <Input
                      label="Transaction ID / Reference *"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. TXN10293847"
                      required
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-text-primary/90">
                        Upload Payment Receipt *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className={cn(
                          "w-full rounded-md border p-2 text-sm",
                          receiptFile ? "border-emerald-600" : "border-border bg-bg-primary/60"
                        )}
                        required
                      />
                      {receiptPreview && (
                        <div className="h-32 w-48 overflow-hidden rounded border border-border bg-white/5">
                          <img src={receiptPreview} alt="Receipt preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "wallet" && showWalletOption && (
              <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4">
                <div className="flex items-center gap-3 text-emerald-400">
                  <Shield className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Wallet Payment</p>
                    <p className="text-sm">
                      {pkg.price.toLocaleString()} PKR will be deducted from your wallet balance ({walletBalance?.toLocaleString()} PKR)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "wallet" && !showWalletOption && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                <p>Insufficient wallet balance. Please add funds to your wallet or choose Manual Payment.</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg" variant="primary">
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
        <div className="text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600/10">
            <CheckCircle className="h-12 w-12 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-text-primary">Order Placed Successfully!</h3>
            <p className="mt-2 text-text-primary/70">
              Your {pkg.label} order has been received. Our team will process the UC top-up to UID <strong>{userUid}</strong> within 30 minutes.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg-primary/50 p-4 text-sm text-text-primary/70">
            <p><strong>Order ID:</strong> {orderId || `UC-${Date.now().toString(36).toUpperCase()}`}</p>
            <p><strong>Amount:</strong> {pkg.price.toLocaleString()} PKR</p>
            <p><strong>Payment:</strong> {paymentMethod === "wallet" ? "Wallet Balance" : "Manual (awaiting verification)"}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="secondary" onClick={() => router.push("/shop")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
            <Button onClick={() => router.push("/wallet")}>
              View Wallet
            </Button>
          </div>
        </div>
      )}
    </ContentPage>
  );
}