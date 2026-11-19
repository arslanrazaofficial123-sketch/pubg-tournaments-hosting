"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { fetchShowcase, type ShowcaseItem } from "@/services/api/showcase";

function normUrl(u: string): string {
  const t = u.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function ytId(u: string): string | null {
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export function ShowcaseSection() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);

  useEffect(() => { fetchShowcase().then(setItems); }, []);
  if (items.length === 0) return null;

  const [latest, ...older] = items;

  const watchButton = (it: ShowcaseItem, tone: "dark" | "light") => {
    if (!it.youtubeUrl) return null;
    const url = normUrl(it.youtubeUrl);
    const id = ytId(url);
    const cls =
      tone === "dark"
        ? "epx-hd inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold text-[#1a1204] shadow-[inset_0_0_0_1.5px_#1a1204]"
        : "epx-hd inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full px-4 text-xs font-semibold text-[#e8eefc] shadow-[inset_0_0_0_1.5px_#2e4180] hover:text-[#f2b84b]";
    return id ? (
      <button type="button" className={cls} onClick={() => setVideo(id)}>▶ Watch Grand Final</button>
    ) : (
      <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>▶ Watch Grand Final</a>
    );
  };

  return (
    <section id="hall" className="mx-auto max-w-[1180px] scroll-mt-16 px-5 py-14 sm:px-10">
      <span className="inline-flex items-center rounded-full border border-[#2a3b6e] bg-[#4d7cff]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#a9c0ff]">Hall of fame</span>
      <h2 className="epx-hd mb-9 mt-4 text-[clamp(28px,3vw,40px)] font-bold leading-[1.05] text-[#e8eefc]">Past tournaments &amp; winners</h2>

      <div className="flex flex-wrap items-stretch gap-6">
        {/* Latest champion poster */}
        <div className="relative flex min-h-[460px] min-w-0 flex-[1_1_380px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffe29a] via-[#f2b84b] to-[#b9741a] p-8 text-[#1a1204]">
          <Trophy aria-hidden="true" strokeWidth={1} className="absolute -right-5 -top-2 h-44 w-44 text-[#1a1204]/15" />
          <span className="relative self-start rounded-full bg-[#1a1204] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f2b84b]">Latest champions</span>

          {latest.championUrl && (
            <button
              type="button"
              onClick={() => setOpen(latest.championUrl)}
              aria-label={`${latest.tournamentName} winner picture`}
              className="relative my-5 aspect-[16/10] w-full max-w-[340px] cursor-pointer self-start overflow-hidden rounded-2xl border-2 border-[#1a1204]/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={latest.championUrl} alt={`${latest.tournamentName} winner`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
            </button>
          )}

          <div className="relative">
            <div className="text-sm font-semibold uppercase tracking-[0.08em] opacity-75">{latest.tournamentName}</div>
            <div className="epx-hd mt-2 text-[clamp(30px,3.4vw,46px)] font-bold leading-none">{latest.winnerTeam || "Champions"}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold opacity-80">
              {latest.dateLabel && <span>{latest.dateLabel}</span>}
              {latest.organizer && <span>· {latest.organizer}</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {latest.rankingsUrl && (
                <button
                  type="button"
                  onClick={() => setOpen(latest.rankingsUrl)}
                  className="epx-hd inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#1a1204] px-5 text-sm font-semibold text-[#f2b84b]"
                >
                  Final rankings
                </button>
              )}
              {watchButton(latest, "dark")}
            </div>
          </div>
        </div>

        {/* Earlier tournaments */}
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          {older.map((it) => (
            <article key={it.id} className="flex items-center gap-5 rounded-[20px] border border-[#223158] bg-[#0d1426]/75 p-5 backdrop-blur-md transition-colors hover:border-[#f2b84b]/50">
              {it.championUrl ? (
                <button
                  type="button"
                  onClick={() => setOpen(it.championUrl)}
                  aria-label={`${it.tournamentName} winner picture`}
                  className="h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-black/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.championUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#f2b84b]/10 text-[#f2b84b]"><Trophy aria-hidden="true" /></span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8da0c4]">{it.dateLabel || "Champions"}</div>
                <div className="epx-hd mt-1 truncate text-xl font-bold text-[#e8eefc]">{it.winnerTeam || it.tournamentName}</div>
                <div className="truncate text-sm text-[#8da0c4]">{it.tournamentName}{it.organizer ? ` · ${it.organizer}` : ""}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.rankingsUrl && (
                    <button type="button" onClick={() => setOpen(it.rankingsUrl)} className="epx-hd inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full bg-[#2f5bff] px-4 text-xs font-semibold text-white">
                      Final rankings
                    </button>
                  )}
                  {watchButton(it, "light")}
                </div>
              </div>
            </article>
          ))}
          <div className="flex flex-1 flex-col justify-center gap-1.5 rounded-[20px] border border-[#223158] bg-[#0d1426]/75 px-6 py-5 backdrop-blur-md">
            <div className="epx-hd text-lg font-bold text-[#e8eefc]">Every event is archived</div>
            <div className="text-sm leading-relaxed text-[#8da0c4]">Champion poster, final rankings and the YouTube broadcast are added after each tournament.</div>
          </div>
        </div>
      </div>

      {video && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setVideo(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`} title="Grand final" className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <a className="underline opacity-80" href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noopener noreferrer">Open on YouTube</a>
              <button type="button" className="cursor-pointer opacity-80" onClick={() => setVideo(null)}>Close ✕</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </section>
  );
}
