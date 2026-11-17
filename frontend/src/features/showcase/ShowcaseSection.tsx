"use client";

import { useEffect, useState } from "react";
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

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Hall of fame</p>
      <h2 className="mb-6 mt-1 text-2xl font-extrabold uppercase tracking-wide sm:text-3xl">Past Tournaments &amp; Winners</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {items.map((it) => (
          <article key={it.id} className="overflow-hidden rounded-2xl border border-border bg-black/30">
            <div className="grid grid-cols-2">
              {[{ u: it.championUrl, l: "Winner" }, { u: it.rankingsUrl, l: "Final rankings" }].map((p) => (
                <button key={p.l} type="button" disabled={!p.u} onClick={() => p.u && setOpen(p.u)}
                  className="group relative aspect-[4/5] cursor-pointer overflow-hidden bg-black/50 disabled:cursor-default">
                  {p.u && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.u} alt={`${it.tournamentName} ${p.l}`} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                  {p.u && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{p.l}</span>}
                </button>
              ))}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-extrabold uppercase leading-tight sm:text-xl">{it.tournamentName}</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {it.winnerTeam && <span className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 font-bold text-yellow-300">👑 {it.winnerTeam}</span>}
                {it.dateLabel && <span className="rounded-lg border border-border px-3 py-1 opacity-80">{it.dateLabel}</span>}
                {it.organizer && <span className="rounded-lg border border-border px-3 py-1 opacity-80">{it.organizer}</span>}
              </div>
              {it.youtubeUrl && (() => {
                const url = normUrl(it.youtubeUrl);
                const id = ytId(url);
                const cls = "mt-4 inline-block cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent";
                return id ? (
                  <button type="button" className={cls} onClick={() => setVideo(id)}>▶ Watch Grand Final</button>
                ) : (
                  <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>▶ Watch Grand Final</a>
                );
              })()}
            </div>
          </article>
        ))}
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
