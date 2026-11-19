"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn as checkLoggedIn, getSessionUser, logout } from "@/lib/auth";
import { getTournaments, fetchAllRegistrations } from "@/services/api/tournaments";
import { warmUpApi } from "@/services/api";
import { cn } from "@/lib/utils";
import { LogOut, Menu, X } from "lucide-react";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Tournaments", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Services", href: "/services" },
  { label: "Reviews", href: "/reviews" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Rules & Terms", href: "/rules-terms" },
] as const;

let cachedIsLoggedIn: boolean | null = null;
let cachedApprovedRegistrations: any[] | null = null;

export function SiteNavigation() {
  const pathname = usePathname();
  const router = useRouter();
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

  // Close the side menu whenever the route changes.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Escape closes the side menu; page scrolling is locked while it is open.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const navItems = isMounted && isLoggedIn
    ? [
        { label: "Tournaments", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Wallet", href: "/wallet" },
        { label: "Shop", href: "/shop" },
        { label: "Order History", href: "/shop/history" },
        { label: "Team Data", href: "/player-photos" },
        { label: "Profile", href: "/profile" },
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
            "relative block rounded-lg px-3 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium transition-all duration-300 whitespace-nowrap",
            isActive
              ? "bg-white/5 text-text-primary shadow-sm"
              : "text-text-primary/60 hover:bg-white/5 hover:text-text-primary/95",
            mobile && "min-h-[44px] px-4 py-3 text-sm"
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
    <>
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" onClick={() => setIsMenuOpen(false)}>
            <div className="relative h-9 w-9 drop-shadow-[0_0_12px_rgba(242, 184, 75,0.5)] sm:h-11 sm:w-11">
              <Image
                src="/images/logo.png"
                alt="EPIX Esports logo"
                fill
                sizes="(max-width: 640px) 36px, 44px"
                className="object-contain"
              />
            </div>
            <span className="hidden text-sm font-black uppercase tracking-wider text-text-primary sm:block">
              EPIX Esports
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={isMounted && isLoggedIn ? "/dashboard" : "/login"}
              onPointerEnter={warmUpApi}
              onFocus={warmUpApi}
              className="bg-accent inline-flex h-10 items-center rounded-full px-4 text-xs font-bold uppercase tracking-wider sm:px-5 sm:text-sm"
            >
              {isMounted && isLoggedIn ? "Dashboard" : "Register"}
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen((v) => !v)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-text-primary transition-colors hover:border-accent/40 hover:text-accent"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop for the side menu */}
      <div
        aria-hidden="true"
        onClick={() => setIsMenuOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Side menu */}
      <aside
        aria-hidden={!isMenuOpen}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[min(86vw,360px)] flex-col border-l border-white/10 bg-[#080d1b]/95 shadow-2xl shadow-black/60 backdrop-blur-xl transition-transform duration-300 ease-out",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-[.2em] text-accent">Menu</span>
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-text-primary transition-colors hover:border-accent/40 hover:text-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => renderItem(item, true))}
          {isMounted && isLoggedIn && (
            <li>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsLoggedIn(false);
                  setIsMenuOpen(false);
                  router.push("/");
                }}
                className="mt-2 flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </li>
          )}
        </ul>

        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href={isMounted && isLoggedIn ? "/dashboard" : "/login"}
            onClick={() => setIsMenuOpen(false)}
            onPointerEnter={warmUpApi}
            className="bg-accent flex h-11 w-full items-center justify-center rounded-full text-sm font-bold uppercase tracking-wider"
          >
            {isMounted && isLoggedIn ? "Dashboard" : "Register"}
          </Link>
        </div>
      </aside>
    </>
  );
}
