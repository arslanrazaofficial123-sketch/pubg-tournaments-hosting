"use client";

import { useEffect, useState } from "react";
import { Footer } from "./Footer";
import { isLoggedIn as checkLoggedIn } from "@/lib/auth";

/** Signed-in players get the dashboard shell, so the marketing footer stays off. */
export function SiteFooter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const sync = () => setIsLoggedIn(checkLoggedIn());
    sync();

    window.addEventListener("local-auth-change", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("local-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!isMounted || isLoggedIn) return null;

  return <Footer />;
}
