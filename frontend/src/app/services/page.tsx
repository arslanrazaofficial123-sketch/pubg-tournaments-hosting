"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clapperboard,
  Headphones,
  MessageCircle,
  Palette,
  Play,
  Radio,
  Trophy,
  Tv,
  Users2,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { fetchShowcase, type ShowcaseItem } from "@/services/api/showcase";

const WHATSAPP = "https://wa.me/923269546755";

const CHIP =
  "inline-flex items-center gap-2 rounded-full border border-[#2a3b6e] bg-[#4d7cff]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#a9c0ff]";
const KICKER = "flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#f2b84b]";
const H2 = "epx-hd mt-4 text-[clamp(30px,4vw,52px)] font-bold uppercase leading-[0.98] text-[#e8eefc]";

const OVERLAYS = [
  { name: "Match Ranking", kind: "Full screen", text: "The match result with the winning team spotlighted, its roster on stage and the top teams with placement points, eliminations and total." },
  { name: "Overall Rankings", kind: "Full screen", text: "The tournament table after every match: points, kills and chicken dinners for every team, in your event's colours." },
  { name: "Match MVP", kind: "Full screen", text: "The best player of the match with photo, finishes, damage and survival time, straight from the game data." },
  { name: "Top 4 Players", kind: "Full screen", text: "The four standout fraggers of the match side by side with their team logos and key stats." },
  { name: "WWCD Team Stats", kind: "Full screen", text: "The chicken-dinner squad with each player's kills, damage and assists on one screen." },
  { name: "Live Standings", kind: "In-game", text: "A compact table that updates kill by kill, with alive, knocked and eliminated players shown for every team." },
] as const;

const TICKER = [
  "Live standings", "Match MVP", "Elimination alert", "Overall rankings", "WWCD team stats",
  "Top 4 players", "Match ranking", "Zone timer", "Live minimap", "Player pictures",
];

const SERVICES = [
  { icon: Tv, title: "Live broadcast production", text: "Full PUBG MOBILE broadcast with overlays, scoreboard, minimap and replays, streamed in HD.", points: ["Live standings and points", "Observer HUD and minimap", "Multi-platform streaming"] },
  { icon: Trophy, title: "Tournament hosting", text: "Registrations, slot lists, room IDs, schedules, points tables and prize distribution.", points: ["Slot management", "Room ID delivery", "Rules and disputes"] },
  { icon: Palette, title: "Graphics & branding", text: "Tournament identity that looks like a world-class event, from logo to overlay package.", points: ["Logo and identity", "Overlay package", "Posters and thumbnails"] },
  { icon: Clapperboard, title: "Highlights & editing", text: "Match highlights, hype trailers and social cuts, delivered ready to post.", points: ["Highlight reels", "Promo trailers", "Shorts and reels"] },
  { icon: Radio, title: "Casting & commentary", text: "Urdu and English casters who know competitive PUBG MOBILE, with a caster desk on screen.", points: ["Urdu / English", "Caster desk graphics", "Match analysis"] },
  { icon: Users2, title: "Production desk for teams", text: "One link where every team uploads its logo, player photos and UIDs, straight into the graphics.", points: ["One link per event", "Auto background removal", "Feeds live graphics"] },
] as const;

const STEPS = [
  { n: "01", title: "Brief", text: "Tell us the format, number of teams, dates and where you want to stream." },
  { n: "02", title: "Build", text: "We set up the graphics, overlays, schedule and the production for your tournament." },
  { n: "03", title: "Go live", text: "We run the broadcast and the match operations while you focus on the event." },
] as const;

const PACKAGES = [
  { name: "Single day", text: "One-day events, scrims and showmatches.", points: ["Full overlay set", "Live points table", "Support on match day"], featured: false },
  { name: "Full league", text: "Multi-day leagues with groups and a grand final.", points: ["Everything in Single day", "Tournament branding", "Highlights after each day", "Production desk for teams"], featured: true },
  { name: "Season partner", text: "Organisers running events all year.", points: ["Everything in Full league", "Custom overlay theme", "Priority scheduling"], featured: false },
] as const;

function ytId(u: string): string | null {
  const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** Mock live-standings panel for the hero (illustration only). */
function StandingsMock() {
  const rows = [
    { t: "A", p: 34, alive: 4 }, { t: "B", p: 29, alive: 3 }, { t: "C", p: 25, alive: 4 },
    { t: "D", p: 21, alive: 2 }, { t: "E", p: 18, alive: 1 }, { t: "F", p: 12, alive: 0 },
  ];
  return (
    <div className="relative w-full max-w-[460px] rounded-2xl border border-[#223158] bg-[#0b1224]/90 p-4 shadow-[0_30px_80px_-20px_rgba(47,91,255,0.45)] backdrop-blur" aria-hidden="true">
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
        <span className="flex items-center gap-2 text-[#e8eefc]"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />Live match</span>
        <span className="rounded border border-[#f2b84b]/50 bg-[#f2b84b]/10 px-2 py-1 text-[#f2b84b]">Zone closing 1:21</span>
        <span className="text-[#8da0c4]">63 alive</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#16213d]">
        <div className="grid grid-cols-[34px_1fr_70px_44px] bg-[#f2b84b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1a1204]">
          <span>#</span><span>Team</span><span>Alive</span><span className="text-right">Pts</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.t} className={`grid grid-cols-[34px_1fr_70px_44px] items-center px-3 py-2 text-sm ${i % 2 ? "bg-[#0d1426]" : "bg-[#0a1020]"} ${r.alive === 0 ? "opacity-40" : ""}`}>
            <span className="epx-hd font-bold text-[#a9c0ff]">{i + 1}</span>
            <span className="epx-hd font-semibold text-[#e8eefc]">TEAM {r.t}</span>
            <span className="flex gap-1">
              {[0, 1, 2, 3].map((k) => (
                <i key={k} className={`h-3 w-2 rounded-[2px] ${k < r.alive ? "bg-emerald-400" : "bg-white/10"}`} />
              ))}
            </span>
            <span className="epx-hd text-right font-bold text-[#f2b84b]">{r.p}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#a4b3d1]">
        <span className="rounded-full border border-[#223158] px-2.5 py-1">1080p broadcast ready</span>
        <span className="rounded-full border border-[#223158] px-2.5 py-1">Kill-by-kill points</span>
        <span className="rounded-full border border-[#223158] px-2.5 py-1">OBS ready</span>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [active, setActive] = useState(0);
  const [shows, setShows] = useState<ShowcaseItem[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchShowcase().then((items) => setShows(items.filter((it) => it.youtubeUrl)));
  }, []);

  const ov = OVERLAYS[active];

  return (
    <PageShell showHelpFab={false}>
      <div className="relative overflow-hidden bg-[#070b16] text-[#e8eefc]">
        {/* HERO */}
        <section className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_80%_40%,rgba(77,124,255,0.3),transparent_70%),radial-gradient(ellipse_40%_50%_at_8%_95%,rgba(242,184,75,0.12),transparent_70%)]" />
          <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-12 px-5 pb-20 pt-14 sm:px-10 sm:pt-20">
            <div className="min-w-0 flex-[1_1_460px]">
              <span className={CHIP}><span className="h-2 w-2 rounded-full bg-red-500" />PUBG MOBILE production</span>
              <h1 className="epx-hd mt-6 text-[clamp(38px,5.4vw,72px)] font-bold uppercase leading-[0.95]">
                Broadcast-grade<br />production for<br /><span className="text-[#f2b84b]">esports finals</span>
              </h1>
              <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-[#a4b3d1]">
                Live standings, MVPs, rankings and alerts that update kill by kill, straight from the match to your stream. We run the tournament and put it on screen in your colours.
              </p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="epx-hd inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f2b84b] px-7 text-base font-semibold text-[#1a1204] transition-transform hover:-translate-y-0.5">
                  <MessageCircle className="h-4 w-4" /> Talk to us on WhatsApp
                </a>
                <a href="#broadcasts" className="epx-hd inline-flex min-h-12 items-center gap-2 rounded-full px-7 text-base font-semibold text-[#e8eefc] shadow-[inset_0_0_0_1.5px_#2e4180] transition-transform hover:-translate-y-0.5">
                  <Play className="h-4 w-4" /> Watch our broadcasts
                </a>
              </div>
            </div>
            <div className="flex min-w-0 flex-[0_1_460px] justify-center"><StandingsMock /></div>
          </div>
        </section>

        {/* TICKER */}
        <div className="overflow-hidden border-y border-[#16213d] bg-[#2f5bff] py-3" aria-hidden="true">
          <div className="epx-marquee flex w-max gap-8 whitespace-nowrap">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="epx-hd flex items-center gap-8 text-sm font-bold uppercase tracking-[0.12em] text-white">
                {t}<span className="text-[#f2b84b]">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* OVERLAYS */}
        <section id="overlays" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-20 sm:px-10">
          <p className={KICKER}><span className="h-px w-8 bg-[#f2b84b]" />The overlays</p>
          <h2 className={H2}>Every screen your<br /><span className="text-[#f2b84b]">broadcast needs</span></h2>
          <p className="mt-5 max-w-[560px] text-base text-[#a4b3d1]">Shown here in Epix navy and gold. On your stream they take your tournament&apos;s own colours.</p>

          <div className="mt-10 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" role="tablist">
              {OVERLAYS.map((o, i) => (
                <button
                  key={o.name}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  className={`flex shrink-0 cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors ${i === active ? "border-[#f2b84b] bg-[#f2b84b]/10" : "border-[#223158] bg-[#0d1426] hover:border-[#4d7cff]"}`}
                >
                  <span className="epx-hd text-sm font-bold uppercase text-[#e8eefc]">{o.name}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7f92b8]">{o.kind}</span>
                </button>
              ))}
            </div>

            <div className="min-w-0 rounded-2xl border border-[#223158] bg-[#0b1224] p-4 sm:p-5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8da0c4]">
                <span><span className="text-red-500">●</span> Program · {ov.name}</span>
                <span>1920 × 1080</span>
              </div>
              <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-[linear-gradient(135deg,#12204f,#0a1020_55%,#2a1e55)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(242,184,75,0.18),transparent_55%)]" />
                <div className="absolute left-[6%] top-[9%]">
                  <div className="epx-hd text-[clamp(18px,3.4vw,40px)] font-bold uppercase leading-none text-[#e8eefc]">{ov.name}</div>
                  <div className="mt-1 text-[clamp(9px,1.1vw,13px)] font-semibold uppercase tracking-[0.16em] text-[#f2b84b]">Epix Invitational League · Grand final</div>
                </div>
                <div className="absolute inset-x-[6%] bottom-[8%] space-y-[1.4%]">
                  {[0, 1, 2, 3, 4].map((r) => (
                    <div key={r} className="flex items-center gap-[2%] rounded-md bg-white/[0.06] px-[2%] py-[1.2%]">
                      <span className={`epx-hd w-[6%] text-[clamp(9px,1.3vw,16px)] font-bold ${r === 0 ? "text-[#f2b84b]" : "text-[#a9c0ff]"}`}>#{r + 1}</span>
                      <span className="h-[clamp(6px,1vw,12px)] flex-1 rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-gradient-to-r from-[#2f5bff] to-[#f2b84b]" style={{ width: `${92 - r * 14}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-[#a4b3d1]">{ov.text}</p>
            </div>
          </div>
        </section>

        {/* BROADCASTS — our own events */}
        <section id="broadcasts" className="border-t border-[#16213d] bg-[#080d1b]">
          <div className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-20 sm:px-10">
            <p className={KICKER}><span className="h-px w-8 bg-[#f2b84b]" />On air</p>
            <h2 className={H2}>Broadcasts we <span className="text-[#f2b84b]">powered</span></h2>
            <p className="mt-5 max-w-[560px] text-base text-[#a4b3d1]">Epix grand finals produced live. Hit play and watch them back.</p>

            {shows.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-[#223158] bg-[#0d1426]/60 px-6 py-14 text-center text-[#8da0c4]">
                Our broadcasts appear here as soon as they are added in the admin panel.
              </div>
            ) : (
              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {shows.map((s, i) => {
                  const id = ytId(s.youtubeUrl);
                  const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : s.championUrl;
                  const open = () => (id ? setVideo(id) : window.open(s.youtubeUrl, "_blank", "noopener"));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={open}
                      className={`group cursor-pointer overflow-hidden rounded-2xl border border-[#223158] bg-[#0d1426] text-left transition-all hover:-translate-y-1 hover:border-[#f2b84b]/60 ${i === 0 ? "md:col-span-2 lg:row-span-2" : ""}`}
                    >
                      <div className="relative aspect-video overflow-hidden bg-black/40">
                        {thumb && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"><span className="text-red-500">●</span> Streamed live</span>
                        <span className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f2b84b] text-[#1a1204] shadow-lg transition-transform group-hover:scale-110">
                          <Play className="ml-0.5 h-6 w-6" fill="currentColor" />
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="epx-hd text-lg font-bold uppercase leading-tight text-[#e8eefc]">{s.tournamentName}</h3>
                        <p className="mt-1 text-sm text-[#8da0c4]">
                          {[s.winnerTeam && `Champions: ${s.winnerTeam}`, s.dateLabel, s.organizer].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-10">
          <p className={KICKER}><span className="h-px w-8 bg-[#f2b84b]" />How it works</p>
          <h2 className={H2}>From the circle<br />to the <span className="text-[#f2b84b]">stream</span></h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative overflow-hidden rounded-2xl border border-[#223158] bg-[#0d1426] p-7">
                <span aria-hidden="true" className="epx-ghost absolute -right-2 -top-3 text-[120px]">{s.n}</span>
                <div className="relative text-xs font-semibold uppercase tracking-[0.16em] text-[#f2b84b]">Step {s.n}</div>
                <h3 className="epx-hd relative mt-3 text-2xl font-bold uppercase">{s.title}</h3>
                <p className="relative mt-3 text-[15px] leading-relaxed text-[#a4b3d1]">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section className="border-t border-[#16213d] bg-[#080d1b]">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-10">
            <p className={KICKER}><span className="h-px w-8 bg-[#f2b84b]" />Built for match day</p>
            <h2 className={H2}>Everything a<br /><span className="text-[#f2b84b]">production crew</span> needs</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((s) => (
                <div key={s.title} className="rounded-2xl border border-[#223158] bg-[#0d1426] p-6 transition-colors hover:border-[#4d7cff]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f2b84b]/30 bg-[#f2b84b]/10 text-[#f2b84b]"><s.icon className="h-5 w-5" /></span>
                  <h3 className="epx-hd mt-4 text-lg font-bold uppercase">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#a4b3d1]">{s.text}</p>
                  <ul className="mt-4 space-y-1.5">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-[#8da0c4]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f2b84b]" />{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PACKAGES (no prices) */}
        <section className="mx-auto max-w-[1180px] px-5 py-20 sm:px-10">
          <p className={KICKER}><span className="h-px w-8 bg-[#f2b84b]" />Packages</p>
          <h2 className={H2}>A package for <span className="text-[#f2b84b]">every event</span></h2>
          <p className="mt-5 max-w-[560px] text-base text-[#a4b3d1]">Every event is different, so we quote each one. Message us with your format and dates.</p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PACKAGES.map((p) => (
              <div key={p.name} className={`relative flex flex-col rounded-2xl border p-7 ${p.featured ? "border-[#f2b84b] bg-[#f2b84b]/[0.06]" : "border-[#223158] bg-[#0d1426]"}`}>
                {p.featured && <span className="absolute -top-3 left-7 rounded-full bg-[#f2b84b] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1a1204]">Most chosen</span>}
                <h3 className="epx-hd text-2xl font-bold uppercase">{p.name}</h3>
                <p className="mt-2 text-sm text-[#a4b3d1]">{p.text}</p>
                <div className="epx-hd mt-6 text-3xl font-bold text-[#f2b84b]">Custom quote</div>
                <ul className="mt-6 flex-1 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-[#c8d3ea]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f2b84b]" />{pt}</li>
                  ))}
                </ul>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={`epx-hd mt-7 inline-flex min-h-12 items-center justify-center rounded-full text-base font-semibold transition-transform hover:-translate-y-0.5 ${p.featured ? "bg-[#f2b84b] text-[#1a1204]" : "bg-[#2f5bff] text-white"}`}>
                  Get a quote
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section className="border-t border-[#16213d] bg-[#080d1b]">
          <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-10">
            <p className={KICKER}><span className="h-px w-8 bg-[#f2b84b]" />Contact us</p>
            <h2 className={H2}>Get in <span className="text-[#f2b84b]">touch</span></h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-[#223158] bg-[#0d1426] p-7">
                <MessageCircle className="h-7 w-7 text-emerald-400" />
                <h3 className="epx-hd mt-4 text-xl font-bold uppercase">WhatsApp</h3>
                <p className="epx-hd mt-1 text-lg text-[#f2b84b]">+92 326 9546755</p>
                <p className="mt-3 text-sm leading-relaxed text-[#a4b3d1]">The quickest way to reach us: packages, setting up your event and match-day support.</p>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="epx-hd mt-6 inline-flex min-h-11 items-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white">Chat on WhatsApp</a>
              </div>
              <div className="rounded-2xl border border-[#223158] bg-[#0d1426] p-7">
                <Headphones className="h-7 w-7 text-[#a9c0ff]" />
                <h3 className="epx-hd mt-4 text-xl font-bold uppercase">Discord</h3>
                <p className="epx-hd mt-1 text-lg text-[#f2b84b]">epixesportn</p>
                <p className="mt-3 text-sm leading-relaxed text-[#a4b3d1]">Join the Epix community for announcements, help and match-day updates.</p>
                <Link href="/contact" className="epx-hd mt-6 inline-flex min-h-11 items-center rounded-full bg-[#2f5bff] px-6 text-sm font-semibold text-white">All contact options</Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-gradient-to-r from-[#2447e0] to-[#5b3df5] px-6 py-12 sm:px-11">
            <div>
              <h2 className="epx-hd text-[clamp(26px,3vw,40px)] font-bold uppercase leading-[1.02]">Ready for your next final?</h2>
              <p className="mt-2 text-white/80">Tell us the format and the dates, and we will put it on air.</p>
            </div>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="epx-hd inline-flex min-h-12 items-center rounded-full bg-white px-7 text-base font-semibold text-[#1c2d86]">Start on WhatsApp</a>
          </div>
        </section>
      </div>

      {video && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setVideo(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`} title="Broadcast" className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
            <div className="mt-3 flex justify-between text-sm text-white">
              <a className="underline opacity-80" href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noopener noreferrer">Open on YouTube</a>
              <button type="button" className="cursor-pointer opacity-80" onClick={() => setVideo(null)}>Close ✕</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
