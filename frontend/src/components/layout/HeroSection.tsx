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
    <section className="relative h-[220px] w-full overflow-hidden sm:h-[380px]">
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
                className="object-contain object-left-bottom"
              />
            </div>

            <h1 className="hidden sm:block mb-1 truncate sm:text-5xl font-black uppercase tracking-wider text-text-primary drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:mb-4">
              EPIX Esports
            </h1>
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
