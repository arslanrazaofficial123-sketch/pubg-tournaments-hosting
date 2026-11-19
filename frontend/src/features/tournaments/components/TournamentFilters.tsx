"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, LayoutGrid, Users } from "lucide-react";

const STATUS_OPTIONS = ["Registration Open", "Ongoing", "Upcoming", "Ended"] as const;
const STATUS_ANCHORS: Record<(typeof STATUS_OPTIONS)[number], string> = {
  "Registration Open": "registration-open",
  Ongoing: "ongoing",
  Upcoming: "upcoming",
  Ended: "ended",
};
const TEAM_SIZES = ["1v1", "2v2", "4v4"] as const;

interface TournamentFiltersProps {
  activeSize: string | null;
  onSizeChange: (size: string | null) => void;
}

export function TournamentFilters({ activeSize, onSizeChange }: TournamentFiltersProps) {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Registration Open");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="border-b border-[#16213d] bg-[#070b16]/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Dropdown (Left) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((open) => !open)}
            className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#223158] bg-[#0d1426] px-4 text-sm font-semibold text-[#e8eefc] transition-all hover:border-[#4d7cff] active:scale-[0.98]"
          >
            <LayoutGrid size={15} className="text-[#f2b84b]" />
            {status}
            <ChevronDown
              size={14}
              className={cn(
                "text-[#f2b84b] transition-transform duration-200",
                isDropdownOpen && "rotate-180",
              )}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-[#223158] bg-[#0d1426] p-1.5 shadow-2xl shadow-black/40 animate-fade-in-up">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option);
                    setIsDropdownOpen(false);
                    document
                      .getElementById(STATUS_ANCHORS[option])
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[#070b16] active:bg-white/5",
                    status === option
                      ? "bg-[#f2b84b]/10 font-semibold text-[#f2b84b]"
                      : "text-[#e8eefc]/70",
                  )}
                >
                  {option}
                  {status === option && <Check size={15} className="text-[#f2b84b]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1v1, 2v2, 4v4 Buttons (Right) */}
        <div className="flex items-center gap-1.5 rounded-lg border border-[#223158] bg-[#0d1426] p-1.5">
          <span className="hidden items-center gap-1.5 pl-2 pr-1 text-[11px] font-bold uppercase tracking-wider text-[#8da0c4] sm:flex">
            <Users size={13} className="text-[#f2b84b]/70" />
            Format
          </span>
          {TEAM_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onSizeChange(activeSize === size ? null : size)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 cursor-pointer",
                activeSize === size
                  ? "bg-[#f2b84b] text-[#1a1204] shadow-md shadow-[#f2b84b]/25"
                  : "text-[#e8eefc]/70 hover:bg-white/5 hover:text-[#e8eefc] active:scale-95",
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