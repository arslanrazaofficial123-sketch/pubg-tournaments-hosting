"use client";

import { useEffect } from "react";
import { initializeActivityTracker } from "@/lib/auth";

export default function ActivityTrackerInitializer() {
  useEffect(() => {
    initializeActivityTracker();
  }, []);

  return null;
}
