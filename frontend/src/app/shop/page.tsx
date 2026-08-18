"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Tag, Truck, Shield, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentPage } from "@/components/layout/ContentPage";

interface Package {
  id: number;
  uc: number;
  label: string;
  description: string;
  price: number;
  originalPrice: number;
  image: string;
  inStock: boolean;
}

const packages: Package[] = [
  {
    id: 1,
    uc: 60,
    label: "60 UC",
    description: "Manual top-up package",
    price: 240,
    originalPrice: 250,
    image: "/images/shop/60-uc.webp",
    inStock: true,
  },
  {
    id: 2,
    uc: 325,
    label: "325 UC",
    description: "Manual top-up package",
    price: 1230,
    originalPrice: 1250,
    image: "/images/shop/325-uc.webp",
    inStock: true,
  },
  {
    id: 3,
    uc: 660,
    label: "660 UC",
    description: "Manual top-up package",
    price: 2450,
    originalPrice: 2500,
    image: "/images/shop/660-uc.webp",
    inStock: true,
  },
  {
    id: 4,
    uc: 1800,
    label: "1800 UC",
    description: "Manual top-up package",
    price: 6100,
    originalPrice: 6250,
    image: "/images/shop/1800-uc.webp",
    inStock: true,
  },
  {
    id: 5,
    uc: 3850,
    label: "3850 UC",
    description: "Manual top-up package",
    price: 12150,
    originalPrice: 12500,
    image: "/images/shop/3850-uc.webp",
    inStock: true,
  },
  {
    id: 6,
    uc: 8100,
    label: "8100 UC",
    description: "Manual top-up package",
    price: 24300,
    originalPrice: 25000,
    image: "/images/shop/8100-uc.webp",
    inStock: true,
  },
  {
    id: 7,
    uc: 16200,
    label: "16200 UC",
    description: "Manual top-up package",
    price: 48500,
    originalPrice: 50000,
    image: "/images/shop/16200-uc.webp",
    inStock: true,
  },
  {
    id: 8,
    uc: 24300,
    label: "24300 UC",
    description: "Manual top-up package",
    price: 72900,
    originalPrice: 75000,
    image: "/images/shop/24300-uc.webp",
    inStock: true,
  },
  {
    id: 9,
    uc: 32400,
    label: "32400 UC",
    description: "Manual top-up package",
    price: 97000,
    originalPrice: 100000,
    image: "/images/shop/32400-uc.webp",
    inStock: true,
  },
];

function PackageCard({ pkg }: { pkg: Package }) {
  const discount = Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100);
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-bg-primary/50 overflow-hidden transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
      {/* Package Image */}
      <div className="relative aspect-[4/3] sm:aspect-square bg-gradient-to-br from-accent/10 to-accent/5">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
            <span className="text-2xl sm:text-3xl font-bold text-accent/50">{pkg.uc} UC</span>
          </div>
        ) : (
          <img
            src={pkg.image}
            alt={`${pkg.label} package`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
        {!pkg.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">Out of Stock</span>
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white sm:top-3 sm:left-3 sm:px-2.5">
            -{discount}%
          </div>
        )}
        {pkg.inStock && (
          <div className="absolute top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white sm:top-3 sm:right-3 sm:px-2.5">
            In Stock
          </div>
        )}
      </div>

      {/* Package Info */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-bold text-sm text-text-primary sm:text-base">{pkg.label}</h3>
        <p className="mt-0.5 text-xs text-text-primary/50 sm:text-sm">{pkg.description}</p>

        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg font-black text-accent sm:text-xl">{pkg.price.toLocaleString()} PKR</span>
            <span className="text-xs line-through text-text-primary/40 sm:text-sm">{pkg.originalPrice.toLocaleString()} PKR</span>
          </div>

          <Link
            href={`/shop/checkout?package_id=${pkg.id}`}
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:gap-2 sm:px-4 sm:text-sm",
              pkg.inStock
                ? "bg-accent text-white hover:bg-accent-hover"
                : "cursor-not-allowed bg-border text-text-primary/40"
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {pkg.inStock ? "Buy Now" : "Out of Stock"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ShopPage() {
  return (
    <ContentPage
      heading="PUBG Mobile Shop"
      description="Choose your UC package and continue to checkout. All packages are manually topped up to your account."
    >
      {/* Trust Indicators */}
      <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl border border-border bg-bg-primary/50 p-3 sm:mb-8 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-6 sm:px-6">
        <div className="flex flex-col items-center gap-1 text-center text-xs text-text-primary/70 sm:flex-row sm:gap-2 sm:text-sm">
          <Shield className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
          <span>Manual Top-up</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center text-xs text-text-primary/70 sm:flex-row sm:gap-2 sm:text-sm">
          <Truck className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
          <span>Instant Delivery</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center text-xs text-text-primary/70 sm:flex-row sm:gap-2 sm:text-sm">
          <CreditCard className="h-4 w-4 text-accent sm:h-5 sm:w-5" />
          <span>Secure Payment</span>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      {/* How it Works */}
      <div className="mt-8 rounded-2xl border border-border bg-bg-primary/50 p-4 sm:mt-12 sm:p-8">
        <h2 className="mb-3 text-center text-lg font-bold text-text-primary sm:mb-4 sm:text-xl">How It Works</h2>
        <div className="grid grid-cols-3 gap-3 text-center sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent sm:h-12 sm:w-12">
              <Tag className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-xs font-semibold text-text-primary sm:text-base">Choose Package</h3>
            <p className="hidden text-xs text-text-primary/50 sm:block">Select the UC amount you want</p>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent sm:h-12 sm:w-12">
              <CreditCard className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-xs font-semibold text-text-primary sm:text-base">Pay Securely</h3>
            <p className="hidden text-xs text-text-primary/50 sm:block">JazzCash / EasyPaisa / Bank Transfer</p>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent sm:h-12 sm:w-12">
              <Truck className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-xs font-semibold text-text-primary sm:text-base">Get UC Instantly</h3>
            <p className="hidden text-xs text-text-primary/50 sm:block">Manual top-up to your PUBG account</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
        <strong>Note:</strong> All packages are manually processed. After payment, provide your PUBG UID and we will top up your account within 5-30 minutes during business hours.
      </div>
    </ContentPage>
  );
}