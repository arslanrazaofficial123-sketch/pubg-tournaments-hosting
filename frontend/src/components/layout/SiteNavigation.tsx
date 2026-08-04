"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLoggedIn as checkLoggedIn, getSessionUser } from "@/lib/auth";
import { getTournaments, fetchAllRegistrations } from "@/services/api/tournaments";
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Tournaments", href: "/" },
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

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-bg-primary/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-3">
          {navItems.map((item) => {
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
                  className={cn(
                    "relative block rounded-lg px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap",
                    isActive
                      ? "bg-white/5 text-text-primary shadow-sm"
                      : "text-text-primary/60 hover:bg-white/5 hover:text-text-primary/95",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-accent transition-all duration-300 origin-center",
                      isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
