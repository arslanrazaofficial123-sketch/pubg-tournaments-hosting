"use client";

import { Logo3D } from "@/components/Logo3D";

const FACTS = [
  { v: "Live", l: "Every final streamed in Urdu" },
  { v: "Verified", l: "Results checked after each match" },
  { v: "WhatsApp", l: "Room ID sent at reveal time" },
  { v: "UC", l: "PUBG MOBILE top-ups in the shop" },
] as const;

/** Home-page hero. Inner pages open straight into their content, below the top bar. */
export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_78%_35%,rgba(77,124,255,0.32),transparent_70%),radial-gradient(ellipse_40%_50%_at_10%_90%,rgba(242,184,75,0.14),transparent_70%)]" />
      <div
        aria-hidden="true"
        className="epx-ghost absolute -bottom-6 -right-4 hidden text-[220px] sm:block lg:text-[260px]"
      >
        EPIX
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2a3b6e] bg-[#4d7cff]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a9c0ff]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f2b84b] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f2b84b]" />
            </span>
            Registrations open
          </span>
          <h1 className="epx-hd mt-6 text-4xl font-bold leading-[1.04] text-[#e8eefc] sm:text-5xl lg:text-6xl">
            Where Pakistan&apos;s best squads <span className="text-[#f2b84b]">prove it.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#a4b3d1]">
            Organised PUBG MOBILE leagues by EPIX Esports System. Register your squad, follow every match live and see the champions.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#tournaments"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f2b84b] px-7 text-base font-semibold text-[#1a1204] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Find a tournament
            </a>
            <a
              href="#hall"
              className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold text-[#e8eefc] shadow-[inset_0_0_0_1.5px_#2e4180] transition-transform duration-200 hover:-translate-y-0.5"
            >
              See past winners
            </a>
          </div>
        </div>
        <Logo3D className="mx-auto w-full max-w-[380px] lg:max-w-none" />
      </div>

      <div className="relative border-y border-[#16213d] bg-[#0a1120]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
          {FACTS.map((f) => (
            <div key={f.v} className="min-w-0">
              <div className="epx-hd text-2xl font-bold text-[#f2b84b]">{f.v}</div>
              <div className="mt-1 text-sm text-[#8da0c4]">{f.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
