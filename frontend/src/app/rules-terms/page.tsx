"use client";

import { useState } from "react";
import { ContentPage } from "@/components/layout/ContentPage";
import {
  ClipboardList,
  Gamepad2,
  ShieldAlert,
  Wallet,
  RotateCcw,
  MessageSquareText,
  ShieldCheck,
  ChevronDown,
  Crown,
  MessageCircle,
  BookOpen,
} from "lucide-react";

const RULES = [
  {
    icon: ClipboardList,
    title: "1. Registration",
    items: [
      <>
        <b>Eligibility:</b> Players must be 14 years or older and register with a valid PUBG
        Mobile account.
      </>,
      <>
        <b>One entry per team:</b> The same player ID cannot join two teams in the same
        tournament.
      </>,
      <>
        <b>Entry fees</b> are non-refundable once registration closes, except where EPIX
        cancels the event.
      </>,
      <>Fake or borrowed IDs will result in disqualification without refund.</>,
    ],
  },
  {
    icon: Gamepad2,
    title: "2. Match Rules",
    items: [
      <>
        Matches are played in <b>TPP</b> unless the tournament page states FPP.
      </>,
      <>
        <b>Points system:</b> 10 pts per kill · 1st: 15 pts · 2nd: 12 pts · 3rd: 10 pts ·
        4th: 8 pts · 5th: 6 pts.
      </>,
      <>
        Players must join the lobby <b>10 minutes before</b> the scheduled time or the slot
        is forfeited.
      </>,
      <>
        Lobby ID and password are shared on your registered tournament dashboard 15 minutes
        before every match — sharing them publicly is a ban.
      </>,
      <>Disconnections are the player's responsibility; matches are not restarted.</>,
    ],
  },
  {
    icon: ShieldAlert,
    title: "3. Anti-Cheat & Fair Play",
    items: [
      <>
        <b>Zero tolerance</b> for hacks, emulators, or any third-party software. Instant ban
        + no refund.
      </>,
      <>
        <b>Teaming</b> with enemies is forbidden and results in permanent disqualification.
      </>,
      <>
        <b>Screen recording</b> is mandatory for all players; admins may request proof of
        any kill.
      </>,
      <>Reports are reviewed within 24 hours. False reports may lead to penalties.</>,
    ],
  },
  {
    icon: Wallet,
    title: "4. Prizes & Payouts",
    items: [
      <>
        Prizes are paid via <b>JazzCash / EasyPaisa</b> within 24 hours of results being
        verified.
      </>,
      <>Winner accounts must match the registered ID and name.</>,
      <>Tax deductions (if any) apply as per Pakistani law.</>,
      <>Unclaimed prizes after 30 days are forfeited.</>,
    ],
  },
  {
    icon: RotateCcw,
    title: "5. Cancellations & Refunds",
    items: [
      <>
        EPIX may cancel a tournament if fewer than <b>50% of slots</b> are filled.
      </>,
      <>
        On cancellation, all entry fees are refunded in full within <b>48 hours</b>.
      </>,
      <>Players who fail to appear are not entitled to any refund.</>,
    ],
  },
  {
    icon: MessageCircle,
    title: "6. Conduct",
    items: [
      <>
        Respect admins, opponents and community members — no abuse, hate speech or
        harassment.
      </>,
      <>
        Follow admin instructions during matches. Arguing with admins mid-match may lead to
        removal.
      </>,
      <>
        Repeated violations result in a <b>permanent ban</b> from EPIX events.
      </>,
    ],
  },
];

const FAQS = [
  {
    q: "Is emulator allowed in 4v4 tournaments?",
    a: "No. Emulators are considered unfair software and lead to an instant ban without refund, in every tournament.",
  },
  {
    q: "What if my game crashes mid-match?",
    a: "Matches are not restarted for individual disconnections or crashes. Your team continues playing without you.",
  },
  {
    q: "How are winners verified before payout?",
    a: "Admins cross-check final placements, kill screenshots and lobby results before releasing any payment.",
  },
];

export default function RulesTermsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <ContentPage
      heading="Rules & Terms"
      description="The complete rulebook — read carefully before registering. Every player accepts these rules on sign-up."
    >
      {/* Version stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { num: "v3.2", label: "Last updated" },
          { num: "Aug", label: "2026" },
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

      {/* The rules */}
      <div className="space-y-4">
        {RULES.map((rule, i) => {
          const Icon = rule.icon;
          return (
            <section
              key={i}
              className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-7"
            >
              <h3 className="flex items-center gap-3 text-base font-bold text-text-primary">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon size={17} />
                </span>
                {rule.title}
              </h3>
              <ul className="mt-4 list-disc space-y-2.5 pl-6 text-[13px] leading-relaxed text-text-primary/65 marker:text-accent/60">
                {rule.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Liability */}
      <section className="rounded-xl border border-accent/25 bg-bg-secondary p-6 sm:p-7">
        <h3 className="flex items-center gap-3 text-base font-bold text-text-primary">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <ShieldCheck size={17} />
          </span>
          7. Liability
        </h3>
        <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-text-primary/70">
          <p>
            EPIX Esports is a community esports platform and is not affiliated with PUBG
            Mobile, KRAFTON, or Tencent.
          </p>
          <p>
            We are not responsible for in-game issues, server outages of the game, or account
            bans by the game publisher.
          </p>
          <p>
            By registering, you agree to accept the outcome of all admin decisions as final.
          </p>
        </div>
      </section>

      {/* Rules FAQ */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <div className="mb-1 flex items-center gap-2">
          <BookOpen size={18} className="text-accent" />
          <h2 className="text-xl font-semibold text-text-primary">Rules FAQ</h2>
        </div>
        <p className="mb-6 text-sm text-text-primary/50">
          Quick clarifications on the most asked points
        </p>
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  isOpen ? "border-accent/40" : "border-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-text-primary transition-colors hover:text-accent"
                >
                  {faq.q}
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-accent transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-text-primary/60">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="overflow-hidden rounded-2xl border border-accent/25 bg-bg-secondary p-8 text-center sm:p-10">
        <div className="mx-auto max-w-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Crown size={22} />
          </div>
          <h2 className="text-2xl font-black text-text-primary">
            Rules understood?{" "}
            <span className="bg-linear-to-r from-emerald-400 to-accent bg-clip-text text-transparent">
              Time to play
            </span>
          </h2>
          <p className="mt-3 text-sm text-text-primary/50">
            Registration is open for the next tournaments — spots fill fast.
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
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-text-primary/70 transition-colors hover:border-accent/40 hover:text-text-primary"
            >
              <MessageCircle size={16} />
              Questions? Contact Us
            </a>
          </div>
        </div>
      </section>
    </ContentPage>
  );
}