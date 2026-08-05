"use client";

import { useEffect, useState } from "react";
import { ContentPage } from "@/components/layout/ContentPage";
import { apiClient } from "@/services/api/client";
import {
  MessageCircle,
  Mail,
  Headphones,
  MapPin,
  ChevronDown,
  Send,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";

const WHATSAPP_NUMBER = "923269546755";

const CHANNELS = [
  {
    icon: MessageCircle,
    label: "WhatsApp (fastest)",
    value: "+92 326 9546755",
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    note: "Instant replies during match hours",
  },
  {
    icon: Mail,
    label: "Email",
    value: "arslanrazaofficial123@gmail.com",
    href: "mailto:arslanrazaofficial123@gmail.com",
    note: "Replies within 24 hours",
  },
  {
    icon: Headphones,
    label: "Discord",
    value: "epixesportn",
    note: "Community voice & announcements",
  },
  {
    icon: MapPin,
    label: "Based in",
    value: "Pakistan · Online tournaments worldwide",
    note: "Open to players across the globe",
  },
];

const FAQS = [
  {
    q: "When do I receive my prize money?",
    a: "Prizes are paid via JazzCash / EasyPaisa within 24 hours after results are verified. If it's been longer, message us on WhatsApp with your tournament name.",
  },
  {
    q: "How do I get my lobby room ID?",
    a: "Lobby IDs and passwords are shared on WhatsApp 30 minutes before every match. Make sure the number on your account is correct.",
  },
  {
    q: "Can I get a refund?",
    a: "Refunds are only issued if we cancel a tournament. See Rules & Terms for full details.",
  },
  {
    q: "I want to sponsor or host my own tournament on EPIX — how?",
    a: "Great! Email us at arslanrazaofficial123@gmail.com with your proposal — we'll set up a custom event for you.",
  },
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Contact Us | EPIX Esports";
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string) || "";
    const contact = (formData.get("contact") as string) || "";
    const topic = (formData.get("topic") as string) || "";
    const message = (formData.get("message") as string) || "";

    setSubmitting(true);
    setError(null);
    try {
      await apiClient("/contact", {
        method: "POST",
        body: JSON.stringify({ name, contact, topic, message }),
      });
      form.reset();
      setSent(true);
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(messageText);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContentPage
      heading="Contact Us"
      description="Questions about tournaments, payouts or registrations? We reply fast — usually within a few hours."
    >
      {/* Response time chips */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Under 4 hours
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent">
          24/7 WhatsApp support
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-primary/60">
          Avg. reply time &lt; 4h
        </span>
      </div>

      {/* Contact channels */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-semibold text-text-primary">Reach us directly</h2>
        <p className="mb-6 text-sm text-text-primary/50">
          Pick whichever channel you prefer — all monitored daily.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHANNELS.map((channel, i) => {
            const Icon = channel.icon;
            const inner = (
              <>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-text-primary/40">
                    {channel.label}
                  </span>
                  <span className="mt-0.5 block break-all text-sm font-bold text-text-primary">
                    {channel.value}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-primary/45">
                    {channel.note}
                  </span>
                </div>
              </>
            );
            return channel.href ? (
              <a
                key={i}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-bg-primary/40 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
              >
                {inner}
              </a>
            ) : (
              <div
                key={i}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-bg-primary/40 p-5"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Message form */}
      <section className="rounded-xl border border-accent/25 bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-semibold text-text-primary">Send us a message</h2>
        <p className="mb-6 text-sm text-text-primary/50">
          We'll get back to you on WhatsApp or email.
        </p>
        {sent ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm font-semibold text-emerald-300">
            <CheckCircle2 size={20} />
            Message sent! Our team will reply by email or WhatsApp shortly.
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                  Your Name
                </label>
                <input
                  name="name"
                  required
                  type="text"
                  placeholder="e.g. Arslan"
                  className="w-full rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-primary/30 focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                  Email / PUBG ID
                </label>
                <input
                  name="contact"
                  required
                  type="text"
                  placeholder="your@email.com or 5-digit PUBG ID"
                  className="w-full rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-primary/30 focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                Topic
              </label>
              <select
                name="topic"
                className="w-full rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
              >
                <option>Tournament registration</option>
                <option>Prize / payout issue</option>
                <option>Report a player (cheating)</option>
                <option>Sponsorship / partnership</option>
                <option>Something else</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-primary/50">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Tell us what's on your mind..."
                className="w-full resize-y rounded-lg border border-border bg-bg-primary/60 px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-primary/30 focus:border-accent"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm font-semibold text-red-300">
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-bg-primary shadow-lg shadow-accent/20 transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? "Sending..." : "Send Message"}
              </button>
              <span className="text-xs text-text-primary/50">
                Prefer chat? Tap the WhatsApp bubble at the corner.
              </span>
            </div>
          </form>
        )}
      </section>

      {/* FAQ */}
      <section className="rounded-xl border border-border bg-bg-secondary p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-semibold text-text-primary">Quick Answers</h2>
        <p className="mb-6 text-sm text-text-primary/50">Most common questions we get</p>
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

      {/* Community CTA */}
      <section className="overflow-hidden rounded-2xl border border-accent/25 bg-bg-secondary p-8 text-center sm:p-10">
        <div className="mx-auto max-w-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles size={22} />
          </div>
          <h2 className="text-2xl font-black text-text-primary">
            Never miss a battle —{" "}
            <span className="bg-linear-to-r from-emerald-400 to-accent bg-clip-text text-transparent">
              join the community
            </span>
          </h2>
          <p className="mt-3 text-sm text-text-primary/50">
            Get tournament alerts, lobby codes and results straight to your phone.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/40"
            >
              <MessageCircle size={16} />
              Join WhatsApp Group
            </a>
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-text-primary/70">
              <Headphones size={16} />
              Discord Server
            </span>
          </div>
        </div>
      </section>
    </ContentPage>
  );
}
