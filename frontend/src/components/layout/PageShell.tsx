"use client";

import { useEffect, useState } from "react";
import { HelpFab } from "@/components/ui";
import { AuthModal } from "@/features/auth";
import { HeroSection } from "./HeroSection";
import { SiteNavigation } from "./SiteNavigation";
import { getSessionUser, logout } from "@/lib/auth";
import { fetchUserByUid } from "@/services/api/auth";

interface PageShellProps {
  children: React.ReactNode;
  showHelpFab?: boolean;
}

export function PageShell({ children, showHelpFab = true }: PageShellProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<"signin" | "signup">("signin");

  useEffect(() => {
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

  const handleOpenAuth = (view: "signin" | "signup") => {
    setAuthView(view);
    setIsAuthOpen(true);
  };

  return (
    <div className="relative">
      <HeroSection onOpenAuth={handleOpenAuth} />
      <SiteNavigation />
      {children}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialView={authView}
      />
      {showHelpFab && <HelpFab />}
    </div>
  );
}
