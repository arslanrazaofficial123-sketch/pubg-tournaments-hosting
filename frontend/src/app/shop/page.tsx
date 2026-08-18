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
      <div className="relative aspect-square bg-gradient-to-br from-accent/10 to-accent/5">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
            <span className="text-3xl font-bold text-accent/50">{pkg.uc} UC</span>
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
          <div className="absolute top-3 left-3 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </div>
        )}
      </div>

      {/* Package Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-text-primary">{pkg.label}</h3>
        <p className="mt-1 text-sm text-text-primary/50">{pkg.description}</p>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-accent">{pkg.price.toLocaleString()} PKR</span>
            <span className="text-sm line-through text-text-primary/40">{pkg.originalPrice.toLocaleString()} PKR</span>
          </div>

          <Link
            href={`/shop/checkout?package_id=${pkg.id}`}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
              pkg.inStock
                ? "bg-accent text-white hover:bg-accent-hover"
                : "cursor-not-allowed bg-border text-text-primary/40"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
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
      <div className="mb-8 flex flex-wrap items-center justify-center gap-6 rounded-xl border border-border bg-bg-primary/50 p-4 sm:gap-8 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-text-primary/70">
          <Shield className="h-5 w-5 text-accent" />
          <span>Manual Top-up</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-primary/70">
          <Truck className="h-5 w-5 text-accent" />
          <span>Instant Delivery</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-primary/70">
          <CreditCard className="h-5 w-5 text-accent" />
          <span>Secure Payment</span>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      {/* How it Works */}
      <div className="mt-12 rounded-2xl border border-border bg-bg-primary/50 p-6 sm:p-8">
        <h2 className="mb-4 text-center text-xl font-bold text-text-primary">How It Works</h2>
        <div className="grid gap-6 text-center sm:grid-cols-3">
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Tag className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-text-primary">Choose Package</h3>
            <p className="text-sm text-text-primary/50">Select the UC amount you want</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-text-primary">Pay Securely</h3>
            <p className="text-sm text-text-primary/50">JazzCash / EasyPaisa / Bank Transfer</p>
          </div>
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-text-primary">Get UC Instantly</h3>
            <p className="text-sm text-text-primary/50">Manual top-up to your PUBG account</p>
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