"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["Registration Open", "Ongoing", "Upcoming", "Ended"] as const;
const TEAM_SIZES = ["1v1", "2v2", "4v4"] as const;

interface TournamentFiltersProps {
  activeSize: string | null;
  onSizeChange: (size: string | null) => void;
}

export function TournamentFilters({ activeSize, onSizeChange }: TournamentFiltersProps) {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Registration Open");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="border-b border-white/5 bg-bg-primary">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Dropdown (Left) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((open) => !open)}
            className="flex h-11 items-center gap-2 rounded-md border border-white/10 bg-bg-secondary/60 px-4 text-sm font-medium text-text-primary transition-colors hover:border-accent/30 active:bg-white/5 cursor-pointer"
          >
            {status}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                "transition-transform",
                isDropdownOpen && "rotate-180",
              )}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-md border border-white/10 bg-bg-secondary shadow-xl">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option);
                    setIsDropdownOpen(false);
                    // Standardize string replacing to match underscores (e.g. registration_open)
                    const elementId = option.toLowerCase().replace(/\s+/g, "_");
                    document
                      .getElementById(elementId)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-bg-primary active:bg-white/5 cursor-pointer",
                    status === option
                      ? "text-accent font-semibold"
                      : "text-text-primary/70",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1v1, 2v2, 4v4 Buttons (Right) */}
        <div className="flex items-center gap-1.5">
          {TEAM_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onSizeChange(activeSize === size ? null : size)}
              className={cn(
                "rounded-md border h-11 px-4 text-sm font-medium transition-colors cursor-pointer",
                activeSize === size
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-white/10 bg-bg-secondary/60 text-text-primary/70 hover:border-accent/30 hover:text-text-primary active:bg-white/5",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
