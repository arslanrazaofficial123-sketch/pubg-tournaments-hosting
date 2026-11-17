"use client";

import { useEffect } from "react";
import { HelpFab } from "@/components/ui";
import { HeroSection } from "./HeroSection";
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

  return (
    <div className="relative">
      <SiteNavigation />
      {heroVariant === "home" && <HeroSection />}
      {children}
      {showHelpFab && <HelpFab />}
    </div>
  );
}
