"use client";

import { useEffect, useState } from "react";
import { Logo3D } from "@/components/Logo3D";
import { getTournamentsByStatus } from "@/services/api/tournaments";
import type { Tournament } from "@/types/tournament";

const FACTS = [
  { v: "Live", l: "Every final streamed in Urdu" },
  { v: "Verified", l: "Results checked after each match" },
  { v: "WhatsApp", l: "Room ID sent at reveal time" },
  { v: "UC", l: "PUBG MOBILE top-ups in the shop" },
] as const;

/** Home-page hero. Inner pages open straight into their content, below the top bar. */
export function HeroSection() {
  const [next, setNext] = useState<Tournament | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const open = await getTournamentsByStatus("registration_open");
        const list = open.length ? open : await getTournamentsByStatus("upcoming");
        if (alive) setNext(list[0] ?? null);
      } catch {
        /* the hero still works without the card */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_78%_35%,rgba(77,124,255,0.32),transparent_70%),radial-gradient(ellipse_40%_50%_at_10%_90%,rgba(242,184,75,0.14),transparent_70%)]" />
      <div
        aria-hidden="true"
        className="epx-ghost absolute -bottom-6 -right-4 hidden text-[200px] sm:block lg:text-[260px]"
      >
        EPIX
      </div>

      <div className="relative mx-auto max-w-[1180px] px-5 pb-20 pt-12 sm:px-10 sm:pt-16">
        <div className="flex flex-wrap items-center justify-between gap-10">
          <div className="min-w-0 flex-[1_1_460px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2a3b6e] bg-[#4d7cff]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#a9c0ff]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#f2b84b]" />
              Registrations open
            </span>
            <h1 className="epx-hd mt-6 text-[clamp(36px,4.6vw,64px)] font-bold leading-[1.02] text-[#e8eefc]">
              Where Pakistan&apos;s best squads <span className="text-[#f2b84b]">prove it.</span>
            </h1>
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-[#a4b3d1]">
              Organised PUBG MOBILE leagues, verified results and every final live in Urdu. Register your team and take your slot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <a
                href="#tournaments"
                className="epx-hd inline-flex min-h-12 items-center justify-center rounded-full bg-[#f2b84b] px-7 text-base font-semibold text-[#1a1204] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Find a tournament
              </a>
              <a
                href="#hall"
                className="epx-hd inline-flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold text-[#e8eefc] shadow-[inset_0_0_0_1.5px_#2e4180] transition-transform duration-200 hover:-translate-y-0.5"
              >
                See past winners
              </a>
            </div>
          </div>

          <div className="relative flex flex-[0_1_380px] flex-col items-center">
            <Logo3D className="w-full max-w-[300px]" />
            <div className="relative -mt-6 w-full max-w-[340px] rounded-[20px] border border-[#223158] bg-[#0d1426]/75 p-5 backdrop-blur-md">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8da0c4]">
                {next ? "Next tournament" : "New events every week"}
              </div>
              {next ? (
                <>
                  <div className="epx-hd mt-2 truncate text-xl font-bold text-[#e8eefc]" title={next.title}>
                    {next.title}
                  </div>
                  <div className="mt-3 flex justify-between gap-3 text-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.1em] text-[#7f92b8]">Starts</div>
                      <div className="mt-0.5 font-semibold text-[#e8eefc]">{next.startDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.1em] text-[#7f92b8]">Prize pool</div>
                      <div className="mt-0.5 font-semibold text-[#f2b84b]">{next.prizePool}</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[#a4b3d1]">
                  Check back soon, or scroll down for past winners.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-y border-[#16213d] bg-[#0a1120]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-6 px-5 py-7 sm:px-10 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.v} className="min-w-0">
              <div className="epx-hd text-[28px] font-bold text-[#f2b84b]">{f.v}</div>
              <div className="mt-1 text-sm text-[#8da0c4]">{f.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
