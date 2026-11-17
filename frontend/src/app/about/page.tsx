"use client";

import { useState } from "react";
import { ContentPage } from "@/components/layout/ContentPage";
import {
  Check,
  Copy,
  CreditCard,
  Scale,
  Wallet,
  Users2,
  Trophy,
  Flame,
  Swords,
  Crown,
  ShieldCheck,
  MessageCircle,
  Sparkles,
} from "lucide-react";

export default function AboutPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const accounts = [
    { provider: "JazzCash / EasyPaisa", number: "03070830168", owner: "Arslan Raza" },
    { provider: "SadaPay", number: "03097955177", owner: "Arslan Raza" },
    { provider: "Alfalah Bank", number: "09851009475285", owner: "Arslan Raza" },
  ];

  const handleCopy = (num: string, idx: number) => {
    navigator.clipboard.writeText(num);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const pillars = [
    {
      icon: Scale,
      title: "Fair Play",
      text: "Zero tolerance for cheaters. Every kill is screenshot-verified, every bracket is public, and anti-cheat reviews happen on every match.",
    },
    {
      icon: Wallet,
      title: "On-Time Payouts",
      text: "Prizes hit JazzCash / EasyPaisa within 24 hours of results being confirmed. No excuses, no delays.",
    },
    {
      icon: Users2,
      title: "Community First",
      text: "We're players too. Support replies fast on WhatsApp, and feedback from the community shapes every new season.",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: ShieldCheck,
      title: "Create Account",
      text: "Sign up with your PUBG Mobile ID and join the EPIX community.",
    },
    {
      num: "02",
      icon: Swords,
      title: "Join a Tournament",
      text: "Pick your mode — 1v1, 2v2 or 4v4 — and register your team.",
    },
    {
      num: "03",
      icon: Flame,
      title: "Compete & Win",
      text: "Play in your lobby, check live brackets, and get paid after every event.",
    },
  ];

  const team = [
    {
      initial: "E",
      name: "EPIX Admin",
      role: "Founder & Head Organizer",
      text: "Runs every event end-to-end — lobbies, results, payouts.",
    },
    {
      initial: "M",
      name: "Moderators",
      role: "Anti-cheat & Support",
      text: "Verify screenshots, review reports, and answer the WhatsApp group.",
    },
  ];

  return (
    <ContentPage
      heading="About Us"
      description="EPIX Esports runs fair, organized PUBG Mobile tournaments with real prize pools — built by gamers, for gamers."
    >
      {/* Hero stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { num: "48", label: "Tournaments" },
          { num: "1,240", label: "Players" },
          { num: "250", label: "PKR Paid out (k)" },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-bg-secondary p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
          >
            <div className="bg-linear-to-br from-white to-accent bg-clip-text text-4xl font-black text-transparent">
              {stat.num}
            </div>
            <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-text-primary/45">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Our Story */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-4 text-xl font-semibold text-text-primary">Our Story</h2>
        <div className="space-y-4 text-sm leading-relaxed text-text-primary/70">
          <p>
            EPIX Esports started in Season 1 with a simple problem: PUBG Mobile players in
            Pakistan had nowhere to compete for real money without fear of rigged lobbies or
            unpaid prizes. So we built our own — a platform where every bracket is public,
            every result is verified, and every winner gets paid, on time, every time.
          </p>
          <p>
            Today we run weekly cups, solo showdowns, duo clashes and a Season Grand Finals
            with a growing community of verified players. Same promise as day one:{" "}
            <b className="text-text-primary">fair lobbies, verified results, instant payouts.</b>
          </p>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { num: "3", label: "Seasons" },
            { num: "100", label: "% Payout rate" },
            { num: "98", label: "% Recommend us" },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 bg-bg-primary/40 px-5 py-4 text-center"
            >
              <div className="text-2xl font-black text-accent">{stat.num}</div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-text-primary/45">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What We Stand For */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-semibold text-text-primary">What We Stand For</h2>
        <p className="mb-6 text-sm text-text-primary/50">Three promises we never break</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-border bg-bg-primary/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-bold text-text-primary">{pillar.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-text-primary/60">
                  {pillar.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-semibold text-text-primary">How It Works</h2>
        <p className="mb-6 text-sm text-text-primary/50">From sign-up to champion in 3 steps</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-border bg-bg-primary/40 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-accent to-cyan-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="bg-linear-to-br from-accent to-cyan-400 bg-clip-text text-4xl font-black text-transparent">
                  {step.num}
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <Icon size={17} className="text-accent" />
                  <h3 className="text-base font-bold text-text-primary">{step.title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-text-primary/60">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* The Team */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-semibold text-text-primary">The Team</h2>
        <p className="mb-6 text-sm text-text-primary/50">The people behind the brackets</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {team.map((member, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-bg-primary/40 p-6 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-accent to-purple-400 text-2xl font-black text-white">
                {member.initial}
              </div>
              <h3 className="text-base font-bold text-text-primary">{member.name}</h3>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-wider text-accent">
                {member.role}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-text-primary/60">
                {member.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Community CTA */}
      <section className="overflow-hidden rounded-2xl border border-accent/25 bg-bg-secondary p-8 text-center sm:p-10">
        <div className="mx-auto max-w-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Trophy size={22} />
          </div>
          <h2 className="text-2xl font-black text-text-primary">
            Ready to compete?{" "}
            <span className="bg-linear-to-r from-emerald-400 to-accent bg-clip-text text-transparent">
              Join the next tournament
            </span>
          </h2>
          <p className="mt-3 text-sm text-text-primary/50">
            New events open every week — 1v1, 2v2 and 4v4 with real cash prizes.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-bg-primary shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-accent/40"
            >
              <Crown size={16} />
              Browse Tournaments
            </a>
            <a
              href="https://chat.whatsapp.com/ER1ufgyVDWDARMacuKpuyg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/40"
            >
              <MessageCircle size={16} />
              Join WhatsApp Group
            </a>
          </div>
        </div>
      </section>

      {/* Official Payment Accounts */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-xl font-semibold text-text-primary">Official Payment Accounts</h2>
        </div>
        <p className="text-xs text-text-primary/50 mb-4">
          Please use the verified payment methods listed below for tournament registration fees.
          Click any account number to copy it instantly.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {accounts.map((acc, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-border bg-bg-secondary p-5 shadow-lg flex flex-col justify-between"
            >
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-accent/5 blur-xl" />
              <div className="space-y-1 relative">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/40">
                    {acc.provider}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-text-primary mt-1">{acc.owner}</h4>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 bg-bg-primary/60 border border-white/5 rounded-xl px-4 py-2.5">
                <span className="font-mono text-sm font-bold text-accent tracking-wide">
                  {acc.number}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(acc.number, i)}
                  className="rounded-md p-1.5 text-text-primary/45 hover:bg-white/5 hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  title="Copy Account Number"
                >
                  {copiedIndex === i ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ContentPage>
  );
}
