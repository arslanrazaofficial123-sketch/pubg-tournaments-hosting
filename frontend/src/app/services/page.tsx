"use client";

import Link from "next/link";
import { ContentPage } from "@/components/layout/ContentPage";
import {
  Tv,
  Trophy,
  Radio,
  Clapperboard,
  Palette,
  Users2,
  MonitorPlay,
  Megaphone,
  MessageCircle,
  Check,
} from "lucide-react";

/**
 * Production & esports services offered by Epix Esports System.
 * The copy here is a first pass — swap the text, prices and samples when the real
 * articles and sample media are ready.
 */
const services = [
  {
    icon: Tv,
    title: "Live Broadcast Production",
    text: "Full PUBG MOBILE broadcast: custom overlays, live scoreboard, minimap, kill feed and replays, streamed to YouTube, Facebook or TikTok in HD.",
    points: ["Live standings and points", "Observer HUD and minimap", "Instant fight replays", "Multi-platform streaming"],
  },
  {
    icon: Trophy,
    title: "Tournament Hosting & Management",
    text: "End-to-end tournament operation — registrations, slot lists, room IDs, match schedules, points tables and prize distribution.",
    points: ["Registration and slot management", "Room ID and password delivery", "Live points table", "Rules and dispute handling"],
  },
  {
    icon: Palette,
    title: "Graphics & Branding",
    text: "Tournament identity built to look like a world-class event: logos, posters, thumbnails, lower thirds and full overlay packages.",
    points: ["Tournament logo and identity", "Stream overlay package", "Posters and thumbnails", "Team and sponsor branding"],
  },
  {
    icon: Clapperboard,
    title: "Highlights & Video Editing",
    text: "Match highlights, hype trailers and social cuts edited and delivered ready to post.",
    points: ["Match highlight reels", "Promo and hype trailers", "Shorts and reels", "Sponsor edits"],
  },
  {
    icon: Radio,
    title: "Casting & Commentary",
    text: "Urdu and English commentary by casters who know competitive PUBG MOBILE, with a full caster desk on screen.",
    points: ["Urdu / English casting", "Caster desk graphics", "Pre and post-match analysis", "Player interviews"],
  },
  {
    icon: Users2,
    title: "Production Desk for Teams",
    text: "A shareable link where every team uploads its logo, player photos and UIDs — straight into the broadcast graphics.",
    points: ["One link per tournament", "Logos, photos and UIDs", "Auto background removal", "Feeds the live graphics"],
  },
];

const steps = [
  { n: "01", title: "Tell us about the event", text: "Format, number of teams, dates and the platforms you want to stream on." },
  { n: "02", title: "We build the package", text: "Graphics, overlays, schedule and the production setup for your tournament." },
  { n: "03", title: "Go live", text: "We run the broadcast and the match operations while you focus on the event." },
];

export default function ServicesPage() {
  return (
    <ContentPage
      heading="Our Services"
      description="Epix Esports System produces PUBG MOBILE tournaments and broadcasts — from the overlay on screen to the room ID in a team's inbox."
    >
      {/* What we do */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.title}
            className="group rounded-xl border border-border bg-bg-secondary p-6 transition-colors hover:border-accent/40"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-primary/70">{s.text}</p>
            <ul className="mt-4 space-y-1.5">
              {s.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-xs text-text-primary/60">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-6 text-xl font-semibold text-text-primary">How it works</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border border-border bg-bg-primary/40 p-5">
              <span className="text-2xl font-extrabold text-accent/70">{s.n}</span>
              <h3 className="mt-2 text-sm font-semibold text-text-primary">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-primary/65">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our work — samples go here */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-2 text-xl font-semibold text-text-primary">Our work</h2>
        <p className="mb-6 text-sm text-text-primary/65">
          Broadcasts and tournaments produced by Epix Esports System.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-bg-primary/40 text-xs text-text-primary/40"
            >
              <MonitorPlay className="mr-2 h-4 w-4" /> Sample coming soon
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-accent/25 bg-accent/5 p-6 text-center sm:p-8">
        <Megaphone className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-3 text-xl font-semibold text-text-primary">Planning a tournament?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-text-primary/70">
          Tell us the format and the dates, and we will put together a production package for it.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            Contact us
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-text-primary/80 transition-colors hover:border-accent/40 hover:text-text-primary"
          >
            <Trophy className="h-4 w-4" />
            See our tournaments
          </Link>
        </div>
      </section>
    </ContentPage>
  );
}
