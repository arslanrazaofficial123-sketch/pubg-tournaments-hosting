"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Logo3D } from "@/components/Logo3D";
import { MatrixRain } from "@/components/MatrixRain";
import { isLoggedIn as checkLoggedIn, logout } from "@/lib/auth";

interface HeroSectionProps {
  onOpenAuth?: (view: "signin" | "signup") => void;
  variant?: "home" | "compact";
}

export function HeroSection({ onOpenAuth, variant = "compact" }: HeroSectionProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsLoggedIn(checkLoggedIn());

    const handleAuthChange = () => {
      setIsLoggedIn(checkLoggedIn());
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("local-auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("local-auth-change", handleAuthChange);
    };
  }, []);

  const handleSignOut = () => {
    logout();
    setIsLoggedIn(false);
    router.push("/");
  };

  const linkUid = isMounted && !isLoggedIn && (
    <Link
      href="/link-uid"
      onClick={(e) => {
        if (onOpenAuth) {
          e.preventDefault();
          onOpenAuth("signin");
        }
      }}
    >
      <Button variant="primary" className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider sm:px-6 sm:py-3 sm:text-sm">
        Link UID
      </Button>
    </Link>
  );

  const backdrop = (
    <>
      <Image src="/images/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center opacity-25" />
      <div className="absolute inset-0 bg-linear-to-b from-bg-primary/70 via-bg-primary/60 to-bg-primary" />
      <MatrixRain className="pointer-events-none absolute inset-0 h-full w-full opacity-50 [mask-image:radial-gradient(ellipse_at_50%_40%,#000_20%,transparent_75%)]" />
    </>
  );

  if (variant === "home") {
    return (
      <section className="relative w-full overflow-hidden border-b border-white/10">
        {backdrop}
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Pakistan&apos;s PUBG MOBILE Arena
            </span>
            <h1 className="mt-5 text-4xl font-black uppercase leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Drop in. <span className="text-transparent [-webkit-text-stroke:1.5px_var(--color-accent)]">Dominate.</span> Get paid.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-primary/60 sm:text-base">
              The official hub for PUBG Mobile tournaments by EPIX Esports System. Register your squad, follow live matches and see the champions.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#tournaments" className="neo-btn neo-btn-solid">Join a tournament</a>
              <a href="#hall" className="neo-btn">Past winners</a>
              {linkUid}
            </div>
          </div>
          <Logo3D className="mx-auto w-full max-w-[420px] lg:max-w-none" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden border-b border-white/10">
      {backdrop}
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="relative h-[56px] w-[56px] shrink-0 sm:h-[96px] sm:w-[96px]">
            <Image src="/images/logo.png" alt="EPIX Esports logo" fill sizes="(max-width: 640px) 56px, 96px" className="object-contain drop-shadow-[0_0_18px_rgba(255,122,26,0.45)]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black uppercase tracking-wider text-white sm:text-4xl">EPIX Esports</h1>
            <p className="hidden text-sm text-text-primary/60 sm:block">The official hub for PUBG Mobile tournaments</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">{linkUid}</div>
      </div>
    </section>
  );
}
