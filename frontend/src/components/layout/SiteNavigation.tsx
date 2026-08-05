"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { isLoggedIn as checkLoggedIn, getSessionUser } from "@/lib/auth";
import { getTournaments, fetchAllRegistrations } from "@/services/api/tournaments";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Tournaments", href: "/" },
  { label: "Reviews", href: "/reviews" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Rules & Terms", href: "/rules-terms" },
] as const;

let cachedIsLoggedIn: boolean | null = null;
let cachedApprovedRegistrations: any[] | null = null;

export function SiteNavigation() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [approvedRegistrations, setApprovedRegistrations] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const loggedIn = checkLoggedIn();
    setIsLoggedIn(loggedIn);
    cachedIsLoggedIn = loggedIn;

    const loadRegs = async () => {
      try {
        const sessionUser = getSessionUser();
        if (!sessionUser) return;

        const [tournamentsList, regs] = await Promise.all([
          getTournaments(),
          fetchAllRegistrations(undefined, sessionUser.uid),
        ]);

        const approved = regs
          .filter(
            (reg) =>
              reg.status === "approved" &&
              reg.members.some((m: any) => m.uid === sessionUser.uid)
          )
          .map((reg) => {
            const tournament = tournamentsList.find((t) => t.id === reg.tournamentId);
            return {
              id: reg.id,
              tournamentId: reg.tournamentId,
              tournamentTitle: tournament?.title || "Tournament",
            };
          });

        setApprovedRegistrations(approved);
        cachedApprovedRegistrations = approved;
        if (typeof window !== "undefined") {
          localStorage.setItem("epix_approved_regs", JSON.stringify(approved));
        }
      } catch (err) {
        console.error("Failed to load approved registrations for navigation:", err);
      }
    };

    if (loggedIn) {
      const raw = localStorage.getItem("epix_approved_regs");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setApprovedRegistrations(parsed);
          cachedApprovedRegistrations = parsed;
        } catch {}
      }
      loadRegs();
    } else {
      setApprovedRegistrations([]);
      cachedApprovedRegistrations = [];
      if (typeof window !== "undefined") {
        localStorage.removeItem("epix_approved_regs");
      }
    }

    const handleAuthChange = () => {
      const loggedIn = checkLoggedIn();
      setIsLoggedIn(loggedIn);
      cachedIsLoggedIn = loggedIn;
      if (!loggedIn) {
        setApprovedRegistrations([]);
        cachedApprovedRegistrations = [];
        localStorage.removeItem("epix_approved_regs");
      } else {
        const raw = localStorage.getItem("epix_approved_regs");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setApprovedRegistrations(parsed);
            cachedApprovedRegistrations = parsed;
          } catch {}
        }
        loadRegs();
      }
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("local-auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("local-auth-change", handleAuthChange);
    };
  }, []);

  const navItems = isMounted && isLoggedIn
    ? [
        { label: "Tournaments", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        ...approvedRegistrations.map((reg) => ({
          label: reg.tournamentTitle,
          href: `/dashboard/tournaments/${reg.tournamentId}`,
        })),
      ]
    : NAV_ITEMS;

  const renderItem = (item: { label: string; href: string }, mobile: boolean) => {
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href);

    return (
      <li key={item.label}>
        <Link
          href={item.href}
          onClick={() => setIsMenuOpen(false)}
          className={cn(
            "relative block rounded-lg px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap",
            isActive
              ? "bg-white/5 text-text-primary shadow-sm"
              : "text-text-primary/60 hover:bg-white/5 hover:text-text-primary/95",
            mobile && "px-4 py-2.5"
          )}
        >
          {item.label}
          {!mobile && (
            <span
              className={cn(
                "absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
              )}
            />
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-bg-primary/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border bg-bg-secondary p-0.5 sm:h-9 sm:w-9">
              <Image
                src="/images/logo.png"
                alt="EPIX Esports logo"
                fill
                sizes="(max-width: 640px) 32px, 36px"
                className="object-contain"
              />
            </div>
            <span className="hidden text-sm font-black uppercase tracking-wider text-text-primary md:block">
              EPIX Esports
            </span>
          </Link>

          <ul className="flex flex-1 items-center justify-end gap-1 overflow-x-auto py-3 sm:gap-2">
            {navItems.map((item) => renderItem(item, false))}
          </ul>

          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-text-primary transition-colors hover:border-accent/40 hover:text-accent md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <ul className="animate-fade-in-up flex flex-col gap-1 border-t border-white/5 pb-4 pt-3 md:hidden">
            {navItems.map((item) => renderItem(item, true))}
          </ul>
        )}
      </div>
    </nav>
  );
}
