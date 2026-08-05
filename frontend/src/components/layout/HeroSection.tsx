"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { isLoggedIn as checkLoggedIn, logout } from "@/lib/auth";

interface HeroSectionProps {
  onOpenAuth?: (view: "signin" | "signup") => void;
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
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

  return (
    <section className="relative h-[280px] w-full overflow-hidden sm:h-[420px]">
      <Image
        src="/images/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-linear-to-b from-bg-primary/10 via-bg-primary/40 to-bg-primary" />
      <div className="absolute inset-x-0 bottom-0 h-28 sm:h-40 bg-linear-to-t from-bg-primary via-bg-primary/95 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(31,174,233,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(31,174,233,0.07)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(70%_80%_at_50%_30%,#000_30%,transparent_100%)]" />

      <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-6 sm:px-6 sm:pb-12 lg:px-8">
        <div className="flex flex-row w-full items-end justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-end gap-2.5 sm:gap-5">
            <div className="relative h-[64px] w-[64px] shrink-0 sm:h-[150px] sm:w-[150px]">
              <Image
                src="/images/logo.png"
                alt="PUBG Mobile Logo"
                fill
                priority
                sizes="(max-width: 640px) 64px, 150px"
                className="object-contain object-left-bottom drop-shadow-[0_0_18px_rgba(31,174,233,0.35)]"
              />
            </div>

            <div className="min-w-0">
              <h1 className="mb-1 truncate text-2xl font-black uppercase tracking-wider text-text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:mb-2 sm:text-5xl sm:bg-linear-to-b sm:from-white sm:via-white sm:to-accent sm:bg-clip-text sm:text-transparent">
                EPIX Esports
              </h1>
              <p className="mb-1 hidden text-sm font-medium text-text-primary/80 sm:block sm:mb-3">
                The official hub for PUBG Mobile tournaments
              </p>
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Registration Open
              </span>
            </div>
          </div>

          <div className="mb-1 flex shrink-0 items-center gap-2 sm:mb-4 sm:gap-4 h-[36px] sm:h-[48px]">
            {isMounted && !isLoggedIn && (
              <Link
                href="/link-uid"
                onClick={(e) => {
                  if (onOpenAuth) {
                    e.preventDefault();
                    onOpenAuth("signin");
                  }
                }}
              >
                <Button variant="primary" className="px-3.5 py-2 sm:px-6 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-wider shadow-lg shadow-accent/20 hover:shadow-accent/40">
                  Link UID
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
