"use client";

import { useState } from "react";
import { ContentPage, ContentSection } from "@/components/layout/ContentPage";
import { Check, Copy, CreditCard, Flame, Award, Users2, ShieldAlert, Sparkles } from "lucide-react";

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

  return (
    <ContentPage
      heading="About Us"
      description="We are a leading platform dedicated to organizing and producing premier esports tournaments."
    >
      {/* Our Mission */}
      <ContentSection title="Our Mission">
        <p className="text-base sm:text-lg text-text-primary/90 font-medium italic border-l-4 border-accent pl-4 py-2 bg-white/[0.01]">
          "To elevate the esports ecosystem by providing fair competition, innovative tournament production, and a platform where talent can thrive and communities can grow."
        </p>
      </ContentSection>

      {/* Core Services */}
      <ContentSection title="What We Do">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {[
            { text: "Host professional esports tournaments and leagues", icon: Award },
            { text: "Deliver immersive live broadcasts and event coverage", icon: Flame },
            { text: "Provide real-time match data, standings, and statistics", icon: Sparkles },
            { text: "Support players, teams, and esports communities", icon: Users2 },
            { text: "Build lasting partnerships that drive the growth of competitive gaming", icon: ShieldAlert },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3.5 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon size={16} />
                </div>
                <span className="text-sm font-semibold text-text-primary/85">{item.text}</span>
              </div>
            );
          })}
        </div>
      </ContentSection>

      {/* Account details */}
      <ContentSection title="Official Payment Accounts">
        <p className="text-xs text-text-primary/50 mb-4">
          Please use the verified payment methods listed below for tournament registration fees. Click any account number to copy it instantly.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accounts.map((acc, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl border border-border bg-bg-secondary p-5 shadow-lg flex flex-col justify-between"
            >
              <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-accent/5 blur-xl" />
              <div className="space-y-1 relative">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-primary/40">{acc.provider}</span>
                </div>
                <h4 className="text-sm font-bold text-text-primary mt-1">{acc.owner}</h4>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 bg-bg-primary/60 border border-white/5 rounded-xl px-4 py-2.5">
                <span className="font-mono text-sm font-bold text-accent tracking-wide">{acc.number}</span>
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
      </ContentSection>
    </ContentPage>
  );
}
