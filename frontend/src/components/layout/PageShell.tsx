"use client";

import { useEffect } from "react";
import { HelpFab } from "@/components/ui";
import { HeroSection } from "./HeroSection";
import { HomeRail } from "./HomeRail";
import { SiteNavigation } from "./SiteNavigation";
import { getSessionUser, logout } from "@/lib/auth";
import { fetchUserByUid } from "@/services/api/auth";
import { warmUpApi } from "@/services/api";

interface PageShellProps {
  children: React.ReactNode;
  showHelpFab?: boolean;
  heroVariant?: "home" | "compact";
}

export function PageShell({ children, showHelpFab = true, heroVariant = "compact" }: PageShellProps) {
  useEffect(() => {
    // Start the serverless API + Mongo connection while the page is still painting.
    warmUpApi();

    const sessionUser = getSessionUser();
    if (!sessionUser) return;

    const checkUserExists = async () => {
      try {
        const userExists = await fetchUserByUid(sessionUser.uid);
        if (!userExists) {
          logout();
          window.location.reload();
        }
      } catch (err) {
        console.error("Failed to check user account status:", err);
      }
    };
    checkUserExists();
  }, []);

  const isHome = heroVariant === "home";

  return (
    <div className={isHome ? "epx-home relative bg-[#070b16]" : "relative"}>
      <SiteNavigation />
      {isHome ? (
        <div className="grid md:grid-cols-[96px_minmax(0,1fr)]">
          <HomeRail />
          <div className="min-w-0">
            <HeroSection />
            {children}
          </div>
        </div>
      ) : (
        children
      )}
      {showHelpFab && <HelpFab />}
    </div>
  );
}
