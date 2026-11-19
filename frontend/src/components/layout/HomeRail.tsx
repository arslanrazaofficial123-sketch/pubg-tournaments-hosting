"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Coins, Swords, Trophy } from "lucide-react";

const ITEMS = [
  { label: "Play", href: "#tournaments", Icon: Swords },
  { label: "Winners", href: "#hall", Icon: Trophy },
  { label: "UC", href: "#uc", Icon: Coins },
  { label: "How", href: "#how", Icon: Clock },
] as const;

/** Left icon rail of the home page (top row on phones). */
export function HomeRail() {
  return (
    <aside className="border-b border-[#16213d] bg-[#080d1b] md:border-b-0 md:border-r">
      <div className="flex flex-row flex-wrap items-center justify-center gap-5 px-4 py-3 md:sticky md:top-16 md:flex-col md:gap-7 md:px-0 md:py-6">
        <Link href="/" aria-label="EPIX Esports home" className="relative h-10 w-10 shrink-0">
          <Image src="/images/logo.png" alt="" fill sizes="40px" className="object-contain" />
        </Link>
        {ITEMS.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            className="flex flex-col items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7f92b8] transition-colors hover:text-[#f2b84b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2b84b]"
          >
            <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
            <span className="hidden md:block">{label}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}
